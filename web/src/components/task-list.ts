import { Component, input } from "@angular/core";
import type { Filter, Task } from "../types";
import { TaskItem } from "./task-item";

@Component({
  selector: "app-task-list",
  imports: [TaskItem],
  template: `
    @if (tasks().length === 0) {
      <p class="empty">{{ filter() === "all" ? "No tasks yet" : "No tasks match this filter" }}</p>
    } @else {
      <ul aria-label="Tasks" class="task-list">
        @for (task of tasks(); track task.id) {
          <li appTaskItem [task]="task"></li>
        }
      </ul>
    }
  `,
})
export class TaskList {
  readonly tasks = input.required<Task[]>();
  readonly filter = input.required<Filter>();
}
