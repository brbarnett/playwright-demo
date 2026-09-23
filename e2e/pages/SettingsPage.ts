import { expect, type Locator, type Page } from "@playwright/test";
import { MainNav } from "./MainNav.ts";

export type FilterLabel = "All" | "Todo" | "In progress" | "Done";

/** Page object for /settings. */
export class SettingsPage {
  readonly page: Page;
  readonly nav: MainNav;
  readonly heading: Locator;
  readonly form: Locator;
  readonly confirmDelete: Locator;
  readonly saveButton: Locator;
  readonly savedMessage: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new MainNav(page);
    this.heading = page.getByRole("heading", { level: 1, name: "Settings" });
    this.form = page.getByRole("form", { name: "Settings" });
    this.confirmDelete = this.form.getByRole("checkbox", { name: "Confirm before deleting" });
    this.saveButton = this.form.getByRole("button", { name: "Save settings" });
    this.savedMessage = this.form.getByRole("status");
    this.error = this.form.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/settings");
    await expect(this.form).toBeVisible();
  }

  defaultFilter(label: FilterLabel): Locator {
    return this.form
      .getByRole("group", { name: "Default filter" })
      .getByRole("radio", { name: label, exact: true });
  }

  /** Saves and waits for the server to confirm, so the next step sees the new settings. */
  async save() {
    await this.saveButton.click();
    await expect(this.savedMessage).toHaveText("Settings saved");
  }
}
