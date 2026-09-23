import { test, expect } from "../fixtures.ts";

// Seed for the Playwright test agents (planner / generator / healer).
// They run this first to get a page in a known state: data reset via the
// auto fixture, then the Tasks page loaded with its three seed tasks.
test.describe("Task Tracker", () => {
  test("seed", async ({ tasksPage }) => {
    await tasksPage.goto();
    await expect(tasksPage.tasks).toHaveCount(3);
  });
});
