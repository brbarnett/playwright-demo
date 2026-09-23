import type { Locator, Page } from "@playwright/test";

/**
 * The site-wide navigation bar. Pages expose it as `nav`, so a test can
 * move between pages the way a user would: by clicking the links.
 */
export class MainNav {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("navigation", { name: "Main" });
  }

  link(name: "Tasks" | "Settings"): Locator {
    return this.root.getByRole("link", { name, exact: true });
  }
}
