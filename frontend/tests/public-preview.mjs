import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import axe from "axe-core";
import { chromium } from "playwright-core";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:4176";
const evidenceDir = process.env.EVIDENCE_DIR || "/tmp/evalgpt-public-preview-evidence";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const preview = spawn(resolve(root, "node_modules/.bin/serve"), ["-s", "build", "-l", "4176", "-c", "../serve.json"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return response;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Timed out waiting for the public preview");
}

async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
  }));
  const serious = result.violations.filter((row) => ["critical", "serious"].includes(row.impact));
  assert.deepEqual(serious, [], `${label} has serious axe violations: ${serious.map((row) => row.id).join(", ")}`);
}

async function assertClosed(page) {
  assert.equal(await page.getByRole("group", { name: "PRD input method" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Evaluate this PRD" }).count(), 0);
  assert.equal(await page.locator("input, textarea").count(), 0);
}

await mkdir(evidenceDir, { recursive: true });
let browser;
try {
  const response = await waitForServer();
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("content-security-policy") || "", /default-src 'self'/);
  assert.match(
    response.headers.get("content-security-policy") || "",
    /connect-src 'self' https:\/\/evalgpt-api-gateway-m55fnl6poa-uc\.a\.run\.app/,
  );

  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const enforcedPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const enforcedErrors = [];
  enforcedPage.on("pageerror", (error) => enforcedErrors.push(error.message));
  await enforcedPage.goto(origin, { waitUntil: "networkidle" });
  await enforcedPage.getByRole("button", { name: "View a synthetic example" }).click();
  await enforcedPage.locator("#judge-result").waitFor();
  assert.equal(await enforcedPage.locator(".verdict-label").innerText(), "Revise");
  assert.deepEqual(enforcedErrors, [], `CSP-enforced page errors: ${enforcedErrors.join("; ")}`);
  await enforcedPage.close();

  const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "EvalGPT — Evidence-backed PRD judgment");
  assert.equal(await page.locator("h1").innerText(), "Know if your PRD is ready to build.");
  assert.equal(await page.locator(".trust-strip").count(), 0);
  assert.equal(await page.getByText(/public beta/i).count(), 0);
  assert.equal(await page.getByText("The interface is ready. Live judgment is not open yet.").count(), 1);
  assert.equal(await page.getByText("The public preview does not send, process, or store a PRD because there is no upload or paste control.").count(), 1);
  assert.equal(await page.getByText("Fable UX review", { exact: true }).count(), 1);
  await assertClosed(page);
  await audit(page, "desktop public preview");
  await page.screenshot({
    path: resolve(evidenceDir, "public-home-desktop.png"),
    fullPage: true,
    style: ".site-header{position:absolute!important}.skip-link{display:none!important}",
  });

  await page.getByRole("button", { name: "View a synthetic example" }).click();
  await page.locator("#judge-result").waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "judge-result");
  assert.equal(await page.locator(".verdict-label").innerText(), "Revise");
  assert.equal(await page.getByText("PRD Judge · Example result", { exact: true }).count(), 1);
  assert.equal(await page.locator("#path-title").innerText(), "Path to GO");
  await assertClosed(page);
  await audit(page, "desktop public example result");
  await page.screenshot({
    path: resolve(evidenceDir, "public-result-desktop.png"),
    fullPage: true,
    style: ".site-header{position:absolute!important}.skip-link{display:none!important}",
  });

  for (const viewport of [
    { width: 834, height: 1112, name: "tablet" },
    { width: 375, height: 812, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${viewport.name} homepage overflows horizontally`,
    );
    await assertClosed(page);
    await audit(page, `${viewport.name} public preview`);
    await page.screenshot({
      path: resolve(evidenceDir, `public-home-${viewport.name}.png`),
      fullPage: true,
      style: ".site-header{position:absolute!important}.skip-link{display:none!important}",
    });
    await page.getByRole("button", { name: "View a synthetic example" }).click();
    await page.locator("#judge-result").waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${viewport.name} result overflows horizontally`,
    );
    await audit(page, `${viewport.name} public example result`);
  }

  assert.deepEqual(errors, [], `browser page errors: ${errors.join("; ")}`);
  process.stdout.write(`Public-preview browser and accessibility checks passed. Evidence: ${evidenceDir}\n`);
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
