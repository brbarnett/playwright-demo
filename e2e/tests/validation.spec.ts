import { test, expect } from "../fixtures.ts";

test.describe("validation", () => {
  test.beforeEach(async ({ tasksPage }) => {
    await tasksPage.goto();
  });

  for (const [name, title] of [
    ["an empty title", ""],
    ["a whitespace-only title", "   "],
  ]) {
    test(`shows the server's error for ${name}`, async ({ tasksPage }) => {
      await tasksPage.addTask(title);

      await expect(tasksPage.formError).toHaveText("Title is required");
      await expect(tasksPage.tasks).toHaveCount(3);
    });
  }

  test("clears the error once a valid task is added", async ({ tasksPage }) => {
    await tasksPage.addTask("");
    await expect(tasksPage.formError).toBeVisible();

    await tasksPage.addTask("Now with a title");

    await expect(tasksPage.taskItem("Now with a title")).toBeVisible();
    await expect(tasksPage.formError).toBeHidden();
  });
});
