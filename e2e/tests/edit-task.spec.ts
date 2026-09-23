import { test, expect } from "../fixtures.ts";

test.describe("editing a task", () => {
  test.beforeEach(async ({ tasksPage }) => {
    await tasksPage.goto();
  });

  test("shows the new title right away and after a reload", async ({ tasksPage, page }) => {
    await tasksPage.editTask("Write project README", "Write README and CONTRIBUTING");

    await expect(tasksPage.taskItem("Write README and CONTRIBUTING")).toBeVisible();
    await expect(tasksPage.taskItem("Write project README")).toHaveCount(0);

    await page.reload();
    await expect(tasksPage.taskItem("Write README and CONTRIBUTING")).toBeVisible();
  });

  test("cancel discards changes", async ({ tasksPage }) => {
    const form = await tasksPage.startEditing("Set up CI pipeline");
    await form.getByLabel("Title").fill("Something else");
    await form.getByRole("button", { name: "Cancel" }).click();

    await expect(tasksPage.taskItem("Set up CI pipeline")).toBeVisible();
    await expect(tasksPage.taskItem("Something else")).toHaveCount(0);
  });
});
