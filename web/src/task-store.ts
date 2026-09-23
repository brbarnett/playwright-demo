import { Injectable, signal } from "@angular/core";
import { api } from "./api";
import type { Filter, NewTask, Task, TaskPatch } from "./types";

/**
 * State for the Tasks page. Provided by TasksPage, so it starts fresh each
 * time the page is shown. Mutations rethrow API errors for the caller to show.
 */
@Injectable()
export class TaskStore {
  // null until settings arrive, so the list opens on the saved default filter.
  readonly filter = signal<Filter | null>(null);
  readonly confirmDelete = signal(true);
  readonly tasks = signal<Task[] | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    api
      .getSettings()
      .then((settings) => {
        this.filter.set(settings.defaultFilter);
        this.confirmDelete.set(settings.confirmDelete);
      })
      .catch(() => {
        this.filter.set("all");
        this.error.set("Could not load settings. Is the API running?");
      })
      .then(() => this.load());
  }

  setFilter(filter: Filter) {
    this.filter.set(filter);
    void this.load();
  }

  async load() {
    const filter = this.filter();
    if (filter === null) return;
    try {
      this.tasks.set(await api.listTasks(filter === "all" ? undefined : filter));
      this.error.set(null);
    } catch {
      this.error.set("Could not load tasks. Is the API running?");
    }
  }

  async create(input: NewTask) {
    await api.createTask(input);
    await this.load();
  }

  async update(id: string, patch: TaskPatch) {
    const updated = await api.updateTask(id, patch);
    const filter = this.filter();
    this.tasks.update((ts) =>
      (ts ?? [])
        .map((t) => (t.id === updated.id ? updated : t))
        .filter((t) => filter === "all" || t.status === filter),
    );
  }

  async remove(id: string) {
    await api.deleteTask(id);
    this.tasks.update((ts) => (ts ?? []).filter((t) => t.id !== id));
  }
}
