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
const preview = spawn(resolve(root, "node_modules/.bin/serve"), ["-s", "build", "-l", "4174", "-c", "../serve.json"], {
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
  const response = await waitForServer();
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
  assert.match(response.headers.get("content-security-policy") || "", /default-src 'self'/);
  browser = await chromium.launch({ headless: true, executablePath: chrome });

  const enforcedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await enforcedContext.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations.push(`${event.violatedDirective} blocked ${event.blockedURI}`);
    });
  });
  const enforcedPage = await enforcedContext.newPage();
  const enforcedErrors = [];
  enforcedPage.on("pageerror", (error) => enforcedErrors.push(error.message));
  await enforcedPage.goto(origin, { waitUntil: "networkidle" });
  assert.equal(await enforcedPage.locator("h1").innerText(), "Know if your PRD is ready to build.");
  await enforcedPage.getByRole("button", { name: "View an example result" }).click();
  await enforcedPage.locator("#judge-result").waitFor();
  assert.equal(await enforcedPage.locator(".verdict-label").innerText(), "Revise");
  assert.deepEqual(
    await enforcedPage.evaluate(() => window.__cspViolations),
    [],
    "the app must load its bundle, styles, and example flow under its own enforced CSP",
  );
  assert.deepEqual(enforcedErrors, [], `CSP-enforced page errors: ${enforcedErrors.join("; ")}`);
  await enforcedContext.close();

  const context = await browser.newContext({
    bypassCSP: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "EvalGPT — Evidence-backed PRD judgment");
  assert.equal(await page.locator("h1").innerText(), "Know if your PRD is ready to build.");
  assert.equal(await page.getByText("Readiness and draft strength answer different questions.").count(), 1);
  const inputMethod = page.getByRole("group", { name: "PRD input method" });
  assert.equal(await inputMethod.getByRole("button", { name: "Upload a file" }).getAttribute("aria-pressed"), "true");
  await inputMethod.getByRole("button", { name: "Paste text" }).click();
  assert.equal(await inputMethod.getByRole("button", { name: "Paste text" }).getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator("footer").getByRole("button", { name: "Example result" }).count(), 1);
  await audit(page, "desktop homepage");
  await page.screenshot({
    path: resolve(evidenceDir, "local-home-desktop.png"),
    fullPage: true,
    style: ".site-header{position:absolute!important}.skip-link{display:none!important}",
  });

  await page.getByRole("button", { name: "View an example result" }).click();
  await page.locator("#judge-result").waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "judge-result");
  assert.equal(await page.locator(".verdict-label").innerText(), "Revise");
  assert.equal(await page.locator("#path-title").innerText(), "Path to GO");
  assert.equal(await page.locator("#judge-result .score").getAttribute("aria-label"), "Readiness score 5 out of 10");
  assert.equal(await page.locator("#draft-strength-title").innerText(), "Draft strength");
  assert.equal(
    await page.locator(".draft-score-number").getAttribute("aria-label"),
    "Draft strength score 65 out of 100",
  );
  assert.equal(
    await page.getByText("This score does not change the Revise verdict.").count(),
    1,
  );
  assert.equal(
    await page.getByText("Core rubric calibrated on five PRDs · Writing layer unvalidated").count(),
    1,
  );
  assert.equal(
    await page.getByText(/Score C7 · Out of scope and roadmap/).count(),
    1,
  );
  assert.equal(
    await page.getByText(/dimension IDs are independent from the C1–C12 coverage checks/).count(),
    1,
  );
  await page.getByText("Inspect the draft score").click();
  assert.equal(
    await page.getByText("Applied +1, capped at 5, to M1, M2, M3, M5, and M7.").count(),
    1,
  );
  assert.equal(
    await page.getByText("3→4/5 · normalized").count(),
    2,
  );
  assert.equal(
    await page.getByText("Layer 1 36 + adjusted Layer 2 29 = 65/100.").count(),
    1,
  );
  assert.equal(
    await page.getByText("12/20 · reported separately and excluded from 65/100.").count(),
    1,
  );
  const resultOrder = await page.evaluate(() => {
    const top = (selector) => document.querySelector(selector)?.getBoundingClientRect().top;
    return {
      verdict: top(".verdict-panel"),
      path: top(".path-section"),
      draft: top(".draft-strength-section"),
      ledger: top(".evidence-ledger-section"),
      rubric: top(".rubric-diagnostic-section"),
    };
  });
  assert.ok(resultOrder.verdict < resultOrder.path);
  assert.ok(resultOrder.path < resultOrder.draft);
  assert.ok(resultOrder.draft < resultOrder.ledger);
  assert.ok(resultOrder.ledger < resultOrder.rubric);
  assert.equal(await page.getByText("Findings by severity").count(), 1);
  assert.equal(
    await page.locator(".rubric-diagnostic-section .evidence-status").filter({ hasText: "missing" }).count(),
    5,
    "rubric placeholders must be labeled missing rather than styled as source quotations",
  );
  await audit(page, "desktop result");
  await page.screenshot({ path: resolve(evidenceDir, "local-result-desktop-viewport.png") });
  await page.locator("#judge-result").screenshot({
    path: resolve(evidenceDir, "local-result-desktop.png"),
    style: ".site-header,.skip-link{display:none!important}",
  });
  await page.getByRole("link", { name: "See the complete decision sequence" }).click();
  const pathTop = await page.locator("#path-title").evaluate((element) => element.getBoundingClientRect().top);
  const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
  assert.ok(pathTop >= headerBottom, "Path to GO anchor must clear the sticky header");

  const htmlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const htmlFile = await htmlDownload;
  const htmlPath = resolve(evidenceDir, "exported-report.html");
  await htmlFile.saveAs(htmlPath);
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /--color-ink:/, "HTML export must inline the canonical 8090 tokens");
  assert.match(html, /Evidence ledger/);
  assert.match(html, /PRD Eval Rubric v2/);
  assert.match(html, /Draft strength/);
  assert.match(html, /does not change the readiness verdict/i);
  assert.match(html, /5\/10 · Revise/);
  assert.match(html, /PRD Judge · Public beta · Example result/);
  assert.doesNotMatch(html, /5\/10 · REVISE/);
  assert.match(html, /Score C7 · Out of scope and roadmap/);
  assert.match(html, /Applied \+1, capped at 5, to M1, M2, M3, M5, and M7/);
  assert.match(html, /Layer 1 36 \+ adjusted Layer 2 29 = 65\/100/);
  assert.match(html, /Writing.<\/strong> 12\/20; reported separately and excluded from 65\/100/);
  assert.match(html, /Writing quality · unvalidated/);
  assert.match(html, /customer value or ROI gap/);
  assert.doesNotMatch(html, /customer_value_or_roi_gap/);
  assert.doesNotMatch(html, /“No sufficient evidence was found for/);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const jsonFile = await jsonDownload;
  const jsonPath = resolve(evidenceDir, "exported-report.json");
  await jsonFile.saveAs(jsonPath);
  assert.equal(JSON.parse(await readFile(jsonPath, "utf8")).schema_version, "evalgpt-prd-judge/v2");

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

  await page.goto(origin, { waitUntil: "networkidle" });
  await page.route("http://127.0.0.1:8080/api/prd-judge/evaluate", async (route) => {
    await new Promise((resolveWait) => setTimeout(resolveWait, 2_000));
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "delayed test response" }) });
  });
  await page.getByRole("group", { name: "PRD input method" }).getByRole("button", { name: "Paste text" }).click();
  await page.locator("#prd-text").fill("A sufficiently long PRD fixture that keeps the evaluation request pending until the user cancels it.");
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
  await page.getByRole("button", { name: "Cancel evaluation" }).click();
  await page.getByRole("status").filter({ hasText: "Evaluation cancelled." }).waitFor();
  assert.equal(await page.locator(".form-error").count(), 0, "A user-initiated cancel must not render as an error");
  await page.unroute("http://127.0.0.1:8080/api/prd-judge/evaluate");

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
    await page.screenshot({
      path: resolve(evidenceDir, `local-result-${viewport.name}.png`),
      fullPage: true,
      style: ".site-header{position:absolute!important}.skip-link{display:none!important}",
    });
  }
  assert.deepEqual(errors, [], `browser page errors: ${errors.join("; ")}`);
  process.stdout.write(`Browser and accessibility checks passed. Evidence: ${evidenceDir}\n`);
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
