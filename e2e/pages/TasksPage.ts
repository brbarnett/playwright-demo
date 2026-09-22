import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Page object for the Task Tracker. Locators use roles and labels only,
 * the same accessibility tree that screen readers (and Playwright MCP) see.
 */
export class TasksPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newTaskForm: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly addButton: Locator;
  readonly formError: Locator;
  readonly taskList: Locator;
  readonly tasks: Locator;
  readonly deleteDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Task Tracker" });
    this.newTaskForm = page.getByRole("form", { name: "New task" });
    this.titleInput = this.newTaskForm.getByLabel("Title");
    this.descriptionInput = this.newTaskForm.getByLabel("Description");
    this.addButton = this.newTaskForm.getByRole("button", { name: "Add task" });
    this.formError = this.newTaskForm.getByRole("alert");
    this.taskList = page.getByRole("list", { name: "Tasks" });
    this.tasks = this.taskList.getByRole("listitem");
    this.deleteDialog = page.getByRole("dialog", { name: "Delete task?" });
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.heading).toBeVisible();
  }

  taskItem(title: string): Locator {
    return this.taskList.getByRole("listitem", { name: title, exact: true });
  }

  async addTask(title: string, description?: string) {
    await this.titleInput.fill(title);
    if (description !== undefined) await this.descriptionInput.fill(description);
    await this.addButton.click();
  }

  async startEditing(title: string): Promise<Locator> {
    await this.taskItem(title).getByRole("button", { name: "Edit" }).click();
    return this.taskItem(title).getByRole("form", { name: `Edit ${title}` });
  }

  async editTask(oldTitle: string, newTitle: string) {
    const form = await this.startEditing(oldTitle);
    await form.getByLabel("Title").fill(newTitle);
    await form.getByRole("button", { name: "Save" }).click();
  }

  async deleteTask(title: string) {
    await this.taskItem(title).getByRole("button", { name: "Delete" }).click();
    await this.deleteDialog.getByRole("button", { name: "Delete" }).click();
  }
}
