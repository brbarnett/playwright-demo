import { Component, inject, signal } from "@angular/core";
import { errorMessage } from "../api";
import { TaskStore } from "../task-store";

@Component({
  selector: "app-task-form",
  // novalidate: let the server's validation message show instead of the browser's.
  template: `
    <form class="card task-form" aria-label="New task" novalidate (submit)="submit($event)">
      <h2>New task</h2>
      <label>
        Title
        <input [value]="title()" (input)="title.set($any($event.target).value)" />
      </label>
      <label>
        Description
        <textarea rows="2" [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
      </label>
      @if (error(); as error) {
        <p role="alert" class="error">{{ error }}</p>
      }
      <div class="actions">
        <button type="submit" class="primary" [disabled]="submitting()">Add task</button>
      </div>
    </form>
  `,
})
export class TaskForm {
  private readonly store = inject(TaskStore);
  protected readonly title = signal("");
  protected readonly description = signal("");
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected async submit(e: SubmitEvent) {
    e.preventDefault();
    this.submitting.set(true);
    try {
      await this.store.create({ title: this.title(), description: this.description() });
      this.title.set("");
      this.description.set("");
      this.error.set(null);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.submitting.set(false);
    }
  }
}
