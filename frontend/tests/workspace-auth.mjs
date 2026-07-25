import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import axe from "axe-core";
import { chromium } from "playwright-core";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:4177";
const evidenceDir = process.env.EVIDENCE_DIR || "/tmp/evalgpt-workspace-auth-evidence";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const preview = spawn(
  resolve(root, "node_modules/.bin/serve"),
  ["-s", "build", "-l", "4177", "-c", "../serve.json"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return response;
    } catch {
      // Static server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Timed out waiting for the authenticated preview");
}

async function audit(page, label) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
  }));
  const serious = result.violations.filter((row) => ["critical", "serious"].includes(row.impact));
  assert.deepEqual(
    serious,
    [],
    `${label} has serious axe violations: ${serious.map((row) => row.id).join(", ")}`,
  );
}

function accessBody(tier = "internal", remaining = 2) {
  const unlimited = tier === "internal";
  return {
    access: "allowed",
    identity: {
      email: unlimited ? "person@8090.inc" : "person@gmail.com",
      tier,
    },
    quota: {
      policy: unlimited ? "unlimited" : "limited",
      limit: unlimited ? null : 3,
      used: unlimited ? 0 : 3 - remaining,
      remaining: unlimited ? null : remaining,
      resetsAt: null,
    },
  };
}

await mkdir(evidenceDir, { recursive: true });
let browser;
try {
  const response = await waitForServer();
  const csp = response.headers.get("content-security-policy") || "";
  assert.match(csp, /script-src 'self' https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(csp, /frame-src https:\/\/accounts\.google\.com\/gsi\//);
  assert.match(csp, /connect-src[^;]+https:\/\/accounts\.google\.com\/gsi\//);
  assert.match(
    csp,
    /style-src 'self' 'unsafe-inline' https:\/\/accounts\.google\.com\/gsi\/style/,
  );
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin-allow-popups");

  browser = await chromium.launch({ headless: true, executablePath: chrome });
  const context = await browser.newContext({
    bypassCSP: true,
    viewport: { width: 1440, height: 1000 },
  });
  let accessMode = "normal";
  let evaluationMode = "capacity";
  let guestRemaining = 2;

  await context.route("https://accounts.google.com/gsi/client", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: `
      window.google = { accounts: { id: {
        initialize(options) {
          window.__evalgptGisOptions = options;
          window.__evalgptCredential = "valid-token";
        },
        renderButton(parent) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Sign in with Google";
          button.addEventListener("click", () => {
            window.__evalgptGisOptions.callback({ credential: window.__evalgptCredential });
          });
          parent.replaceChildren(button);
        },
        disableAutoSelect() {
          window.__evalgptAutoSelectDisabled = true;
        }
      } } };
    `,
  }));

  await context.route(`${origin}/api/access`, async (route) => {
    const authorization = route.request().headers().authorization || "";
    if (authorization === "Bearer expired-token") {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "token_expired",
          error: "Your Google sign-in expired. Sign in again to continue.",
        }),
      });
    }
    if (accessMode === "unavailable") {
      return route.fulfill({
        status: 503,
        headers: { "Retry-After": "60" },
        contentType: "application/json",
        body: JSON.stringify({
          code: "quota_store_unavailable",
          error: "Quota enforcement could not be verified.",
        }),
      });
    }
    const tier = authorization === "Bearer external-token" ? "external" : "internal";
    const quota = accessMode === "exhausted" && tier === "external"
      ? accessBody("external", 0)
      : accessBody(tier, guestRemaining);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(quota),
    });
  });

  await context.route(`${origin}/api/prd-judge/evaluate`, async (route) => {
    if (evaluationMode === "expired") {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          code: "token_expired",
          error: "Your Google sign-in expired. Sign in again to continue.",
        }),
      });
    }
    if (evaluationMode === "stream-error") {
      return route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: [
          "event: progress",
          'data: {"phase":"forming_judgment","message":"Forming judgment"}',
          "",
          "event: error",
          'data: {"code":"evaluation_failed","message":"The approved PRD Score did not produce a valid report.","retryable":true}',
          "",
          "",
        ].join("\n"),
      });
    }
    return route.fulfill({
      status: 429,
      headers: { "Retry-After": "30" },
      contentType: "application/json",
      body: JSON.stringify({
        code: "capacity_busy",
        error: "Both evaluation slots are in use. Try again shortly.",
        retryable: true,
      }),
    });
  });

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: "networkidle" });

  assert.equal(await page.locator("h1").innerText(), "Know if your PRD is ready to build.");
  assert.equal(await page.getByText("PRD Judge", { exact: true }).count(), 1);
  assert.equal(await page.getByText(/8090/i).count(), 0);
  assert.equal(await page.getByRole("navigation").count(), 0, "signed-out users must not see app navigation");
  assert.equal(await page.locator(".evaluation-form").count(), 0, "signed-out users must not see uploads");
  assert.deepEqual(
    await page.getByText(
      "Your sign-in stays in this browser tab's memory only. EvalGPT stores your pseudonymous guest evaluation count and nothing else about you or your documents.",
      { exact: true },
    ).count(),
    1,
  );
  await audit(page, "signed-out access gate");
  await page.screenshot({ path: resolve(evidenceDir, "workspace-gate-desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Sign in with Google" }).click();
  await page.getByText("person@8090.inc", { exact: true }).waitFor();
  assert.equal(await page.getByText(/Team member · no evaluation limits/).count(), 1);
  assert.deepEqual(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
    { local: [], session: [] },
    "identity tokens must never enter browser storage",
  );

  // Playwright can create the file payload without writing document content to app storage.
  await page.locator("#primary-prd").setInputFiles({
    name: "selected-prd.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Synthetic PRD\nA product requirement with enough content for the form."),
  });
  assert.equal(await page.getByText("selected-prd.md", { exact: true }).count(), 1);

  evaluationMode = "expired";
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
  await page.getByRole("heading", { name: "Your Google sign-in expired." }).waitFor();
  assert.equal(await page.getByText("selected-prd.md", { exact: true }).count(), 1);
  assert.match(await page.locator(".form-error").innerText(), /selected documents are still here/i);
  await page.evaluate(() => {
    window.__evalgptCredential = "valid-token";
  });
  await page.locator(".reauth-panel").getByRole("button", { name: "Sign in with Google" }).click();
  await page.getByText("person@8090.inc", { exact: true }).waitFor();
  assert.equal(await page.getByText("selected-prd.md", { exact: true }).count(), 1);

  evaluationMode = "capacity";
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
  await page.getByText(
    "All evaluation slots are currently in use. Try again in about 1 minute.",
    { exact: true },
  ).waitFor();

  evaluationMode = "stream-error";
  await page.getByRole("button", { name: "Evaluate this PRD" }).click();
  await page.getByText(
    "The approved PRD Score did not produce a valid report.",
    { exact: true },
  ).waitFor();
  await page.getByText(/Team member · no evaluation limits/).waitFor();

  await page.getByRole("button", { name: "Example result" }).first().click();
  await page.locator("#judge-result").waitFor();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByText("PRD Judge", { exact: true }).waitFor();
  assert.equal(await page.getByText(/8090/i).count(), 0);
  assert.equal(await page.locator(".evaluation-form").count(), 0);
  assert.equal(await page.locator("#judge-result").count(), 0, "sign-out must clear the prior report");
  assert.equal(await page.evaluate(() => window.__evalgptAutoSelectDisabled), true);

  await page.evaluate(() => {
    window.__evalgptCredential = "external-token";
  });
  await page.getByRole("button", { name: "Sign in with Google" }).click();
  await page.getByText("person@gmail.com", { exact: true }).waitFor();
  assert.equal(await page.getByText(/2 of 3 guest evaluations remaining/).count(), 1);
  assert.equal(await page.getByText(/one-time allowance · does not reset/).count(), 1);
  await page.getByRole("button", { name: "Sign out" }).click();

  await page.evaluate(() => {
    window.__evalgptCredential = "external-token";
  });
  accessMode = "exhausted";
  await page.getByRole("button", { name: "Sign in with Google" }).click();
  await page.getByText("person@gmail.com", { exact: true }).waitFor();
  assert.equal(
    await page.locator("#judge-result").count(),
    0,
    "a later signer-in must never inherit the previous report",
  );
  assert.equal(await page.getByRole("button", { name: "Evaluation limit reached" }).isDisabled(), true);
  assert.equal(await page.getByText("Guest evaluation allowance used.", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Sign out" }).click();

  for (const viewport of [
    { width: 834, height: 1112, label: "tablet" },
    { width: 390, height: 844, label: "narrow" },
  ]) {
    await page.setViewportSize(viewport);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `${viewport.label} access gate must not overflow horizontally`,
    );
  }

  assert.deepEqual(pageErrors, [], `workspace-auth browser errors: ${pageErrors.join("; ")}`);
  process.stdout.write(`Workspace-auth browser checks passed. Evidence: ${evidenceDir}\n`);
} finally {
  if (browser) await browser.close();
  preview.kill("SIGTERM");
}
