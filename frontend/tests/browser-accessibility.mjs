import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import axe from "axe-core";
import { chromium } from "playwright-core";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:4174";
const evidenceDir = process.env.EVIDENCE_DIR || "/tmp/evalgpt-evidence";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const preview = spawn(resolve(root, "node_modules/.bin/vite"), ["preview", "--host", "127.0.0.1", "--port", "4174"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Timed out waiting for the Vite preview");
}

async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
  }));
  const serious = result.violations.filter((row) => ["critical", "serious"].includes(row.impact));
  assert.deepEqual(serious, [], `${label} has serious axe violations: ${serious.map((row) => row.id).join(", ")}`);
  return result.violations;
}

await mkdir(evidenceDir, { recursive: true });
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "EvalGPT — Evidence-backed PRD judgment");
  assert.equal(await page.locator("h1").innerText(), "Know if your PRD is ready to build.");
  await audit(page, "desktop homepage");
  await page.screenshot({ path: resolve(evidenceDir, "local-home-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "View an example result" }).click();
  await page.locator("#judge-result").waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "judge-result");
  assert.equal(await page.locator(".verdict-label").innerText(), "Revise");
  assert.equal(await page.locator("#path-title").innerText(), "Path to GO");
  assert.equal(await page.locator("#judge-result .score").getAttribute("aria-label"), "Readiness score 5 out of 10");
  await audit(page, "desktop result");
  await page.screenshot({ path: resolve(evidenceDir, "local-result-desktop-viewport.png") });
  await page.locator("#judge-result").screenshot({ path: resolve(evidenceDir, "local-result-desktop.png") });

  const htmlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const htmlFile = await htmlDownload;
  const htmlPath = resolve(evidenceDir, "exported-report.html");
  await htmlFile.saveAs(htmlPath);
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /--color-ink:/, "HTML export must inline the canonical 8090 tokens");
  assert.match(html, /Evidence ledger/);
  assert.match(html, /PRD Eval Rubric v2/);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const jsonFile = await jsonDownload;
  const jsonPath = resolve(evidenceDir, "exported-report.json");
  await jsonFile.saveAs(jsonPath);
  assert.equal(JSON.parse(await readFile(jsonPath, "utf8")).schema_version, "evalgpt-prd-judge/v1");

  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printOpenDetails = String(document.querySelectorAll("#judge-result details[open]").length);
      document.body.dataset.printTotalDetails = String(document.querySelectorAll("#judge-result details").length);
    };
  });
  await page.getByRole("button", { name: "Print or save PDF" }).click();
  const printState = await page.locator("body").evaluate((body) => ({
    open: body.dataset.printOpenDetails,
    total: body.dataset.printTotalDetails,
  }));
  assert.equal(printState.open, printState.total, "print must expand every disclosure before rendering");

  for (const viewport of [{ width: 834, height: 1112, name: "tablet" }, { width: 375, height: 812, name: "mobile" }]) {
    await page.setViewportSize(viewport);
    await page.goto(origin, { waitUntil: "networkidle" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${viewport.name} homepage overflows horizontally`);
    await page.screenshot({ path: resolve(evidenceDir, `local-home-${viewport.name}-viewport.png`) });
    await page.getByRole("button", { name: "View an example result" }).click();
    await page.locator("#judge-result").waitFor();
    await page.waitForFunction(() => document.activeElement?.id === "judge-result");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${viewport.name} result overflows horizontally`);
    await audit(page, `${viewport.name} result`);
    await page.screenshot({ path: resolve(evidenceDir, `local-result-${viewport.name}-viewport.png`) });
    await page.screenshot({ path: resolve(evidenceDir, `local-result-${viewport.name}.png`), fullPage: true });
  }
  assert.deepEqual(errors, [], `browser page errors: ${errors.join("; ")}`);
  process.stdout.write(`Browser and accessibility checks passed. Evidence: ${evidenceDir}\n`);
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
