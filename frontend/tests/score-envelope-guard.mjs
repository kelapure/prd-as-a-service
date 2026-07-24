import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { chromium } from "playwright-core";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:4176";
const evaluateUrl = "http://127.0.0.1:8080/api/prd-judge/evaluate";
const evidenceDir = process.env.EVIDENCE_DIR || "/tmp/evalgpt-evidence";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const preview = spawn(resolve(root, "node_modules/.bin/serve"), ["-s", "build", "-l", "4176", "-c", "../serve.json"], {
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
  throw new Error("Timed out waiting for the preview server");
}

function sseComplete(payload) {
  return `event: complete\ndata: ${JSON.stringify(payload)}\n\n`;
}

async function evaluateWithMockedResponse(page, body) {
  await page.route(evaluateUrl, (route) => route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    headers: { "access-control-allow-origin": origin },
    body,
  }));
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.getByRole("group", { name: "PRD input method" }).getByRole("button", { name: "Paste text" }).click();
  await page.locator("#prd-text").fill(
    "# Claims workflow PRD\n" + "Claims representatives need measurable handling-time targets, clear escalation ownership, and a validated decision path. ".repeat(8),
  );
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
}

await mkdir(evidenceDir, { recursive: true });
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => process.stderr.write(`pageerror: ${error.message}\n`));
  page.on("console", (message) => {
    if (message.type() === "error") process.stderr.write(`console: ${message.text()}\n`);
  });

  // Grab the app's own example envelope through its JSON export.
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "View an example result" }).click();
  await page.locator("#judge-result").waitFor();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const envelopePath = await (await download).path();
  const envelope = JSON.parse(await readFile(envelopePath, "utf8"));

  // An in-scope Layer 3 with a zero total must still appear in the
  // deterministic-total breakdown on the page and in the HTML export.
  const inScopeZero = structuredClone(envelope);
  const scoreReport = inScopeZero.prd_score.report;
  assert.equal(scoreReport.totals.layer3, 0);
  scoreReport.layer3 = { in_scope: true, scores: [] };
  scoreReport.totals.denominator = 115;
  scoreReport.totals.historical_threshold = 80.5;
  scoreReport.totals.historical_threshold_met = false;
  await evaluateWithMockedResponse(page, sseComplete(inScopeZero));
  await page.locator("#judge-result").waitFor();
  await page.getByText("Inspect the draft score").click();
  assert.equal(
    await page.getByText("Layer 1 36 + adjusted Layer 2 29 + Layer 3 0 = 65/115.").count(),
    1,
    "an in-scope Layer 3 zero must stay visible in the deterministic total",
  );
  await page.locator(".score-method-facts").scrollIntoViewIfNeeded();
  await page.locator(".draft-strength-section").screenshot({
    path: resolve(evidenceDir, "layer3-in-scope-zero-desktop.png"),
  });
  const htmlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const htmlPath = resolve(evidenceDir, "layer3-in-scope-zero-report.html");
  await (await htmlDownload).saveAs(htmlPath);
  const exportedHtml = await readFile(htmlPath, "utf8");
  assert.match(exportedHtml, /Layer 1 36 \+ adjusted Layer 2 29 \+ Layer 3 0 = 65\/115/);
  await page.unroute(evaluateUrl);

  // A complete event with an unsupported schema version must fail closed
  // with the reload guidance instead of rendering a partial result.
  const staleEnvelope = structuredClone(envelope);
  staleEnvelope.schema_version = "evalgpt-prd-judge/v1";
  delete staleEnvelope.prd_score;
  await evaluateWithMockedResponse(page, sseComplete(staleEnvelope));
  const guardError = page.locator(".form-error");
  await guardError.waitFor();
  assert.match(
    await guardError.innerText(),
    /report version this page does not support.*Reload the page/s,
  );
  assert.equal(await page.locator("#judge-result").count(), 0, "no result may render from an unsupported envelope");
  await page.screenshot({ path: resolve(evidenceDir, "v2-envelope-guard-error-desktop.png") });
  await page.unroute(evaluateUrl);

  process.stdout.write(`Layer 3 in-scope zero and v2 envelope guard checks passed. Evidence: ${evidenceDir}\n`);
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
