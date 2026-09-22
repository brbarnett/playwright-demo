import { test, expect } from "../fixtures.ts";

test.describe("creating a task", () => {
  test("adds the task to the list", async ({ tasksPage }) => {
    await tasksPage.addTask("Book client demo", "Playwright + Claude walkthrough");

    const item = tasksPage.taskItem("Book client demo");
    await expect(item).toBeVisible();
    await expect(item).toContainText("Playwright + Claude walkthrough");
  });

  test("puts new tasks at the top", async ({ tasksPage }) => {
    await tasksPage.addTask("Newest task");

    await expect(tasksPage.tasks.first()).toHaveAccessibleName("Newest task");
    await expect(tasksPage.tasks).toHaveCount(4);
  });

  test("clears the form after adding", async ({ tasksPage }) => {
    await tasksPage.addTask("Clear me", "and me");

    await expect(tasksPage.taskItem("Clear me")).toBeVisible();
    await expect(tasksPage.titleInput).toHaveValue("");
    await expect(tasksPage.descriptionInput).toHaveValue("");
  });
});
