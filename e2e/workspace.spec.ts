import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { appendSample } from "../src/lib/operations";
import { emptyWorkspace } from "../src/lib/models";
import { exportBackup } from "../src/lib/backup";
import { maximumHousehold } from "../tests/fixtures";

async function sample(page: Page) {
  await page.goto("/app/#sample");
  await expect(
    page.getByRole("heading", { name: "Cedar House", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
}

async function stored(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{
        revision: number;
        data: {
          households: { name: string }[];
          people: { displayName: string; departedOn?: string }[];
          bills: { title: string }[];
        };
      }>((resolve, reject) => {
        const request = indexedDB.open("proratesplit", 1);
        request.onsuccess = () => {
          const db = request.result;
          const get = db
            .transaction("workspace", "readonly")
            .objectStore("workspace")
            .get("current");
          get.onsuccess = () => {
            db.close();
            resolve(get.result);
          };
          get.onerror = () => {
            db.close();
            reject(get.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
  );
}

test("landing, canonical sample, responsive layout and accessibility", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/ProrateSplit/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A fair split.",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("landing-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: /Try a sample household/ }).click();
  await expect(
    page.getByRole("heading", { name: "Cedar House", exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table").first();
  await expect(table.getByRole("row", { name: /Alice Morgan/ })).toContainText(
    "$225.00",
  );
  await expect(table.getByRole("row", { name: /Alice Morgan/ })).toContainText(
    "Receives $75.00",
  );
  await expect(table.getByRole("row", { name: /Ben Parker/ })).toContainText(
    "Owes $75.00",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("workspace-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("workspace-mobile.png"),
    fullPage: true,
  });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("landing-mobile.png"),
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("occupancy edits, independent scenarios, focus restoration, reports and backup", async ({
  page,
}, testInfo) => {
  await sample(page);
  await page
    .getByRole("button", { name: "Duplicate scenario", exact: true })
    .click();
  await page.getByLabel("Scenario name").fill("Move-out alternative");
  await page
    .getByRole("button", { name: "Create scenario", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Move-out alternative", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "People", exact: true }).click();
  const edit = page.getByRole("button", {
    name: "Edit Alice Morgan",
    exact: true,
  });
  await edit.click();
  await page.getByLabel("Departure date (optional)").fill("2026-10-26");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(edit).toBeFocused();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("row", { name: /Alice Morgan/ })).toContainText(
    "$200.00",
  );
  await expect(page.getByRole("row", { name: /Ben Parker/ })).toContainText(
    "$100.00",
  );
  await page.getByRole("button", { name: /Cedar House.*2 people/ }).click();
  await expect(page.getByRole("row", { name: /Alice Morgan/ })).toContainText(
    "$225.00",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cedar House", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Report", exact: true }).click();
  await expect(
    page.getByText(/Negative balances are receivable/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("report-desktop.png"),
    fullPage: true,
  });
  if (testInfo.project.name === "chromium") {
    await page.pdf({
      path: testInfo.outputPath("report-a4.pdf"),
      format: "A4",
      printBackground: true,
    });
    await page.pdf({
      path: testInfo.outputPath("report-letter.pdf"),
      format: "Letter",
      printBackground: true,
    });
  }
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Backup", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(
    /^proratesplit-backup-.*\.json$/,
  );
  await download.saveAs(testInfo.outputPath("workspace-backup.json"));
});

test("fresh BDT household, live bill preview, validation and deletion guards", async ({
  page,
}) => {
  await page.goto("/app/");
  await page
    .getByRole("button", { name: "Create your first household", exact: true })
    .click();
  await page.getByLabel("Household name").fill("Dhaka flat");
  await page.getByLabel("Currency", { exact: true }).selectOption("BDT");
  await page
    .getByRole("button", { name: "Create household", exact: true })
    .click();
  await page.getByRole("button", { name: "Add a person", exact: true }).click();
  await page.getByLabel("Person’s name").fill("Mina");
  await page.getByLabel("Arrival date").fill("2026-10-01");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page.getByRole("button", { name: "Add bill", exact: true }).click();
  await page.getByLabel("Bill name").fill("Rent");
  await page.getByLabel("Amount (BDT)").fill("125.50");
  await page.getByLabel("Period start (included)").fill("2026-10-01");
  await page.getByLabel("Period end (excluded)").fill("2026-11-01");
  await expect(page.locator(".live-preview")).toContainText("125.50");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add bill", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit household", exact: true })
    .click();
  await expect(page.getByLabel("Currency", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("tab", { name: "People", exact: true }).click();
  await page.getByRole("button", { name: "Delete Mina", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete person", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Rent",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit Mina", exact: true }).click();
  await page.getByLabel("Departure date (optional)").fill("2026-10-17");
  await page.getByRole("button", { name: "Save person", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "No eligible occupants",
  );
  expect((await stored(page)).data.people[0].departedOn).toBeUndefined();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete household", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete household", exact: true })
    .click();
  const remaining = await stored(page);
  expect([
    remaining.data.households.length,
    remaining.data.people.length,
    remaining.data.bills.length,
  ]).toEqual([0, 0, 0]);
});

test("stale tabs cannot overwrite each other", async ({ page, context }) => {
  await sample(page);
  const other = await context.newPage();
  await other.goto("/app/");
  await expect(
    other.getByRole("heading", { name: "Cedar House", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit household", exact: true })
    .click();
  await page.getByLabel("Household name").fill("Newer committed name");
  await page
    .getByRole("button", { name: "Save household", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Edit household", exact: true })
    .click();
  await other.getByLabel("Household name").fill("Stale unsaved name");
  await other
    .getByRole("button", { name: "Save household", exact: true })
    .click();
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "Another tab saved a newer workspace",
  );
  expect((await stored(page)).data.households[0].name).toBe(
    "Newer committed name",
  );
  await other
    .getByRole("button", { name: "Copy unsaved text", exact: true })
    .click();
  await expect(other.getByLabel("Workspace JSON")).toHaveValue(
    /Stale unsaved name/,
  );
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await other
    .getByRole("button", { name: "Reload saved workspace", exact: true })
    .click();
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Reload saved workspace", exact: true })
    .click();
  await expect(
    other.getByRole("heading", { name: "Newer committed name", exact: true }),
  ).toBeVisible();
});

test("backup replacement is explicit, cancellable, atomic and private", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) =>
    requests.push(`${request.url()} ${request.postData() ?? ""}`),
  );
  await sample(page);
  const before = await stored(page);
  const incoming = appendSample(emptyWorkspace(), "BDT");
  incoming.households[0].name = "PRIVATE-HOUSEHOLD-80731";
  const file = {
    name: "PRIVATE-FILENAME-80731.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(incoming)),
  };
  await page.getByLabel("Restore JSON backup").setInputFiles(file);
  await expect(page.getByRole("dialog")).toContainText("1 households");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await stored(page)).toEqual(before);
  await page
    .getByLabel("Restore JSON backup")
    .setInputFiles({ ...file, buffer: Buffer.from("{broken") });
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "not imported",
  );
  expect(await stored(page)).toEqual(before);
  await page.getByLabel("Restore JSON backup").setInputFiles(file);
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: incoming.households[0].name,
      exact: true,
    }),
  ).toBeVisible();
  const after = await stored(page);
  expect(after.revision).toBe(before.revision + 1);
  expect(after.data.households).toHaveLength(1);
  expect(requests.every((request) => !request.includes("80731"))).toBe(true);
  expect(
    requests.every((request) => request.startsWith("http://127.0.0.1:4173/")),
  ).toBe(true);
});

test("unavailable storage preserves pending records and allows backup", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    }),
  );
  await page.goto("/app/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Not saved",
  );
  await page
    .getByRole("button", { name: "Create your first household", exact: true })
    .click();
  await page.getByLabel("Household name").fill("Unsaved household");
  await page
    .getByRole("button", { name: "Create household", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unsaved household", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toHaveCount(0);
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export pending changes", exact: true })
    .click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /proratesplit-backup/,
  );
});

for (const failure of ["quota", "abort"] as const) {
  test(`${failure} failure leaves the last committed workspace intact`, async ({
    page,
  }) => {
    await sample(page);
    const before = await stored(page);
    await page.addInitScript((failureType) => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (failureType === "quota")
          throw new DOMException("Full", "QuotaExceededError");
        const request =
          key === undefined
            ? original.call(this, value)
            : original.call(this, value, key);
        this.transaction.abort();
        return request;
      };
    }, failure);
    await page.reload();
    await page
      .getByRole("button", { name: "Edit household", exact: true })
      .click();
    await page.getByLabel("Household name").fill("Pending change");
    await page
      .getByRole("button", { name: "Save household", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Not saved",
    );
    if (failure === "quota")
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "full",
      );
    expect(await stored(page)).toEqual(before);
  });
}

test("a full workspace survives a sample-link request", async ({ page }) => {
  let data = emptyWorkspace();
  for (let index = 0; index < 20; index++) data = appendSample(data);
  await page.goto("/app/");
  await expect(
    page.getByRole("button", {
      name: "Create your first household",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Restore JSON backup").setInputFiles({
    name: "full-workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(data)),
  });
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  const before = await stored(page);
  await page.goto("/");
  await page.getByRole("link", { name: /Try a sample household/ }).click();
  await expect(
    page.getByRole("heading", { name: "Cedar House", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Sample not loaded",
  );
  expect(await stored(page)).toEqual(before);
});

test("maximum household updates its live bill preview within the target", async ({
  page,
}, testInfo) => {
  const data = maximumHousehold();
  await page.goto("/app/");
  await expect(
    page.getByRole("button", {
      name: "Create your first household",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Restore JSON backup")
    .setInputFiles({
      name: "maximum-household.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(data)),
    });
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Bills", exact: true }).click();
  await page.getByRole("button", { name: "Edit Bill 1", exact: true }).click();
  await page.evaluate(() => {
    const input = document.getElementById("bill-amount")!;
    const preview = document.querySelector(".live-preview")!;
    let started = 0;
    input.addEventListener(
      "input",
      () => {
        started = performance.now();
      },
      { capture: true, once: true },
    );
    (window as unknown as { previewTiming: Promise<number> }).previewTiming =
      new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (preview.textContent?.includes("$9,999,999.99")) {
            observer.disconnect();
            resolve(performance.now() - started);
          }
        });
        observer.observe(preview, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      });
  });
  await page.getByLabel("Amount (USD)").fill("9999999.99");
  const duration = await page.evaluate(
    () =>
      (window as unknown as { previewTiming: Promise<number> }).previewTiming,
  );
  const measurement = {
    browser: testInfo.project.name,
    inputToPreviewDomMs: duration,
    people: 20,
    bills: 100,
  };
  console.log(JSON.stringify(measurement));
  await testInfo.attach("preview-performance", {
    body: Buffer.from(JSON.stringify(measurement)),
    contentType: "application/json",
  });
  expect(duration).toBeLessThan(200);
});
