import { Component, inject } from "@angular/core";
import { FilterTabs } from "../components/filter-tabs";
import { TaskForm } from "../components/task-form";
import { TaskList } from "../components/task-list";
import { TaskStore } from "../task-store";

@Component({
  selector: "app-tasks-page",
  imports: [FilterTabs, TaskForm, TaskList],
  providers: [TaskStore],
  host: { class: "page" },
  template: `
    <h1>Tasks</h1>
    <app-task-form />
    <section class="tasks-section">
      @if (store.filter(); as filter) {
        <app-filter-tabs [value]="filter" (valueChange)="store.setFilter($event)" />
      }
      @if (store.error(); as error) {
        <p role="alert" class="error">{{ error }}</p>
      }
      @if (store.tasks() === null && !store.error()) {
        <p class="empty">Loading…</p>
      } @else if (store.tasks(); as tasks) {
        @if (store.filter(); as filter) {
          <app-task-list [tasks]="tasks" [filter]="filter" />
        }
      }
    </section>
  `,
})
export class TasksPage {
  protected readonly store = inject(TaskStore);
}
