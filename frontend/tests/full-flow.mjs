import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright-core";


const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(frontendRoot, "..");
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const children = [
  spawn(resolve(appRoot, "judge-runtime/.venv/bin/uvicorn"), ["app.main:app", "--host", "127.0.0.1", "--port", "8093"], {
    cwd: resolve(appRoot, "judge-runtime"),
    env: { ...process.env, JUDGE_RUNTIME_MODE: "fixture", LOG_LEVEL: "WARNING" },
    stdio: ["ignore", "pipe", "pipe"],
  }),
  spawn("node", ["dist/server.js"], {
    cwd: resolve(appRoot, "api-gateway"),
    env: { ...process.env, PORT: "8081", PRD_JUDGE_RUNTIME_URL: "http://127.0.0.1:8093", ALLOWED_ORIGIN: "http://127.0.0.1:4175", LOG_LEVEL: "error" },
    stdio: ["ignore", "pipe", "pipe"],
  }),
  spawn(resolve(frontendRoot, "node_modules/.bin/vite"), ["preview", "--host", "127.0.0.1", "--port", "4175"], {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
  }),
];

async function waitFor(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Service is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

let browser;
try {
  await waitFor("http://127.0.0.1:8093/health");
  await waitFor("http://127.0.0.1:8081/api/health");
  await waitFor("http://127.0.0.1:4175");
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://127.0.0.1:4175", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.locator("#prd-text").fill(
    "# Claims workflow PRD\n" + "Claims representatives need measurable handling-time targets, clear escalation ownership, and a validated decision path. ".repeat(8),
  );
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
  await page.locator("#judge-result").waitFor({ timeout: 15_000 });
  assert.equal(await page.locator(".verdict-label").innerText(), "Revise");
  assert.match(await page.locator(".score").innerText(), /^\d+\/10$/);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "judge-result");
  assert.equal(await page.locator(".form-error").count(), 0);
  process.stdout.write("Full browser paste-to-validated-result flow passed.\n");
} finally {
  if (browser) await browser.close();
  children.forEach((child) => child.kill("SIGTERM"));
}
