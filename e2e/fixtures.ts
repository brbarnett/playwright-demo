import { test as base, expect } from "@playwright/test";
import { SettingsPage } from "./pages/SettingsPage.ts";
import { TasksPage } from "./pages/TasksPage.ts";

type Fixtures = {
  resetData: void;
  tasksPage: TasksPage;
  settingsPage: SettingsPage;
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

  // Page objects are constructed here but tests navigate themselves
  // (`await tasksPage.goto()`), so a test can use several pages in any order.
  tasksPage: async ({ page }, use) => {
    await use(new TasksPage(page));
  },

  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
});

export { expect };
