import { Component, ElementRef, effect, inject, input, signal, viewChild } from "@angular/core";
import { errorMessage } from "../api";
import { TaskStore } from "../task-store";
import { STATUS_LABELS, type Task, type TaskStatus } from "../types";
import { ConfirmDialog } from "./confirm-dialog";

@Component({
  selector: "li[appTaskItem]",
  imports: [ConfirmDialog],
  host: {
    "[class]": "editing() ? 'card task editing' : 'card task status-' + task().status",
    "[attr.aria-label]": "task().title",
  },
  template: `
    @if (editing()) {
      <form [attr.aria-label]="'Edit ' + task().title" novalidate (submit)="save($event)">
        <label>
          Title
          <input #titleInput [value]="title()" (input)="title.set($any($event.target).value)" />
        </label>
        <label>
          Description
          <textarea rows="2" [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
        </label>
        @if (error(); as error) {
          <p role="alert" class="error">{{ error }}</p>
        }
        <div class="actions">
          <button type="button" (click)="editing.set(false)">Cancel</button>
          <button type="submit" class="primary">Save</button>
        </div>
      </form>
    } @else {
      <div class="task-body">
        <h3>{{ task().title }}</h3>
        @if (task().description) {
          <p>{{ task().description }}</p>
        }
        @if (error(); as error) {
          <p role="alert" class="error">{{ error }}</p>
        }
      </div>
      <div class="task-controls">
        <label [for]="statusId()" class="visually-hidden">Status</label>
        <select [id]="statusId()" (change)="changeStatus($any($event.target))">
          @for (s of statuses; track s.value) {
            <option [value]="s.value" [selected]="s.value === task().status">{{ s.label }}</option>
          }
        </select>
        <button type="button" (click)="startEditing()">Edit</button>
        <button type="button" class="danger-outline" (click)="clickDelete()">Delete</button>
      </div>
      @if (confirming()) {
        <dialog
          appConfirmDialog
          heading="Delete task?"
          [message]="deleteMessage()"
          confirmLabel="Delete"
          (confirmed)="delete()"
          (cancelled)="confirming.set(false)"
        ></dialog>
      }
    }
  `,
})
export class TaskItem {
  readonly task = input.required<Task>();

  private readonly store = inject(TaskStore);
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>("titleInput");

  protected readonly statuses = (Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  );
  protected readonly editing = signal(false);
  protected readonly confirming = signal(false);
  protected readonly title = signal("");
  protected readonly description = signal("");
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Focus the title field whenever the edit form appears.
    effect(() => this.titleInput()?.nativeElement.focus());
  }

  protected deleteMessage() {
    return `"${this.task().title}" will be permanently removed.`;
  }

  protected statusId() {
    return `status-${this.task().id}`;
  }

  private async run(action: () => Promise<void>): Promise<boolean> {
    try {
      await action();
      this.error.set(null);
      return true;
    } catch (err) {
      this.error.set(errorMessage(err));
      return false;
    }
  }

  protected startEditing() {
    this.title.set(this.task().title);
    this.description.set(this.task().description);
    this.error.set(null);
    this.editing.set(true);
  }

  protected async save(e: SubmitEvent) {
    e.preventDefault();
    const patch = { title: this.title(), description: this.description() };
    if (await this.run(() => this.store.update(this.task().id, patch))) this.editing.set(false);
  }

  protected async changeStatus(select: HTMLSelectElement) {
    const status = select.value as TaskStatus;
    // On failure, show the saved status again rather than the rejected choice.
    if (!(await this.run(() => this.store.update(this.task().id, { status })))) select.value = this.task().status;
  }

  protected clickDelete() {
    if (this.store.confirmDelete()) this.confirming.set(true);
    else void this.delete();
  }

  protected async delete() {
    this.confirming.set(false);
    await this.run(() => this.store.remove(this.task().id));
  }
}
