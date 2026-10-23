import assert from "node:assert/strict";
import { mkdir, mkdtemp, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshots = path.join(root, "docs", "screenshots");
const temporaryVideo = await mkdtemp(
  path.join(tmpdir(), "proratesplit-capture-"),
);
const baseURL = process.env.PRORATE_BASE_URL ?? "http://127.0.0.1:4173";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: temporaryVideo, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const started = Date.now();

try {
  await page.goto(baseURL);
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "landing-desktop.png"),
    fullPage: true,
  });
  // These pauses give a viewer time to read the recorded product walkthrough.
  await page.waitForTimeout(3500);
  await page.getByRole("link", { name: /Try a sample household/ }).click();
  await page
    .getByRole("heading", { name: "Cedar House", exact: true })
    .waitFor();
  await page.getByText("Saved on this device", { exact: true }).waitFor();
  assert(
    (
      await page.getByRole("row", { name: /Alice Morgan/ }).innerText()
    ).includes("$225.00"),
  );
  await page.screenshot({
    path: path.join(screenshots, "workspace-desktop.png"),
    fullPage: true,
  });
  await page.waitForTimeout(4000);
  await page.locator(".bill-breakdown summary").click();
  await page.waitForTimeout(3500);
  await page
    .getByRole("button", { name: "Duplicate scenario", exact: true })
    .click();
  await page.getByLabel("Scenario name").fill("Move-out alternative");
  await page.waitForTimeout(2000);
  await page
    .getByRole("button", { name: "Create scenario", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Move-out alternative", exact: true })
    .waitFor();
  await page.getByRole("tab", { name: "People", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Alice Morgan", exact: true })
    .click();
  await page.getByLabel("Departure date (optional)").fill("2026-10-26");
  await page.screenshot({
    path: path.join(screenshots, "person-editor.png"),
    fullPage: true,
  });
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  assert(
    (
      await page.getByRole("row", { name: /Alice Morgan/ }).innerText()
    ).includes("$200.00"),
  );
  await page.waitForTimeout(4500);
  await page.getByRole("tab", { name: "Report", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your household report", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(screenshots, "report-desktop.png"),
    fullPage: true,
  });
  await page.waitForTimeout(4500);
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: /Cedar House.*2 people/ }).click();
  await page.waitForTimeout(2500);
  assert.deepEqual(errors, []);
  const video = page.video();
  await context.close();
  const sourceVideo = await video.path();
  let walkthrough = "docs/walkthrough.mp4";
  try {
    await promisify(execFile)("ffmpeg", [
      "-y",
      "-i",
      sourceVideo,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      path.join(root, walkthrough),
    ]);
  } catch {
    walkthrough = "docs/walkthrough.webm";
    await copyFile(sourceVideo, path.join(root, walkthrough));
  }
  const mobile = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(baseURL);
  await mobilePage.screenshot({
    path: path.join(screenshots, "landing-mobile.png"),
    fullPage: true,
  });
  await mobilePage.goto(`${baseURL}/app/#sample`);
  await mobilePage.getByText("Saved on this device", { exact: true }).waitFor();
  assert(
    await mobilePage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await mobilePage.screenshot({
    path: path.join(screenshots, "workspace-mobile.png"),
    fullPage: true,
  });
  await mobile.close();
  console.log(
    JSON.stringify({
      walkthrough,
      screenshots,
      browser: browser.version(),
      elapsedSeconds: (Date.now() - started) / 1000,
    }),
  );
} finally {
  await browser.close();
}
