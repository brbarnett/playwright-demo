import { test, expect } from "../fixtures.ts";

test.describe("deleting a task", () => {
  test("removes the task after confirming", async ({ tasksPage }) => {
    await tasksPage.deleteTask("Create repository");

    await expect(tasksPage.deleteDialog).toBeHidden();
    await expect(tasksPage.taskItem("Create repository")).toHaveCount(0);
    await expect(tasksPage.tasks).toHaveCount(2);
  });

  test("keeps the task when cancelled", async ({ tasksPage }) => {
    await tasksPage.taskItem("Create repository").getByRole("button", { name: "Delete" }).click();
    await expect(tasksPage.deleteDialog).toBeVisible();

    await tasksPage.deleteDialog.getByRole("button", { name: "Cancel" }).click();

    await expect(tasksPage.deleteDialog).toBeHidden();
    await expect(tasksPage.taskItem("Create repository")).toBeVisible();
    await expect(tasksPage.tasks).toHaveCount(3);
  });
});
