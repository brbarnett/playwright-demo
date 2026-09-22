import { test as base, expect } from "@playwright/test";
import { TasksPage } from "./pages/TasksPage.ts";

type Fixtures = {
  resetData: void;
  tasksPage: TasksPage;
};

export const test = base.extend<Fixtures>({
  // Runs before every test, even ones that don't ask for it.
  resetData: [
    async ({ request }, use) => {
      const res = await request.post("/api/reset");
      expect(res.ok(), "POST /api/reset should succeed").toBeTruthy();
      await use();
    },
    { auto: true },
  ],

  tasksPage: async ({ page }, use) => {
    const tasksPage = new TasksPage(page);
    await tasksPage.goto();
    await use(tasksPage);
  },
});

export { expect };
