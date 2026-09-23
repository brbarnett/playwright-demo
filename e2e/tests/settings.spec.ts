import { test, expect } from "../fixtures.ts";

// Settings live on the server, so they would leak between tests without
// the `/api/reset` that fixtures.ts runs before every test.
test.describe("settings", () => {
  test.beforeEach(async ({ settingsPage }) => {
    await settingsPage.goto();
  });

  test("keeps saved settings after a reload", async ({ settingsPage, page }) => {
    await settingsPage.confirmDelete.uncheck();
    await settingsPage.defaultFilter("Done").check();
    await settingsPage.save();

    await page.reload();

    await expect(settingsPage.confirmDelete).not.toBeChecked();
    await expect(settingsPage.defaultFilter("Done")).toBeChecked();
  });

  test("deletes without asking when confirmation is off", async ({ settingsPage, tasksPage }) => {
    await settingsPage.confirmDelete.uncheck();
    await settingsPage.save();

    await settingsPage.nav.link("Tasks").click();
    await tasksPage.clickDelete("Create repository");

    await expect(tasksPage.deleteDialog).toBeHidden();
    await expect(tasksPage.taskItem("Create repository")).toHaveCount(0);
  });

  test("opens the task list on the default filter", async ({ settingsPage, tasksPage }) => {
    await settingsPage.defaultFilter("In progress").check();
    await settingsPage.save();

    await tasksPage.goto();

    await expect(tasksPage.filterTab("In progress")).toHaveAttribute("aria-selected", "true");
  });

  test("the main nav moves between pages and marks the current one", async ({
    settingsPage,
    tasksPage,
    page,
  }) => {
    await settingsPage.nav.link("Tasks").click();
    await expect(tasksPage.heading).toBeVisible();
    await expect(page).toHaveURL("/");
    await expect(tasksPage.nav.link("Tasks")).toHaveAttribute("aria-current", "page");

    await tasksPage.nav.link("Settings").click();
    await expect(settingsPage.heading).toBeVisible();
    await expect(page).toHaveURL("/settings");
    await expect(settingsPage.nav.link("Settings")).toHaveAttribute("aria-current", "page");
  });
});
