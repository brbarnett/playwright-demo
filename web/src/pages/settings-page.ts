import { Component, signal } from "@angular/core";
import { api, errorMessage } from "../api";
import { FILTER_OPTIONS, type Settings } from "../types";

@Component({
  selector: "app-settings-page",
  host: { class: "page" },
  template: `
    <h1>Settings</h1>
    @if (loadError(); as loadError) {
      <p role="alert" class="error">{{ loadError }}</p>
    }
    @if (form() === null && !loadError()) {
      <p class="empty">Loading…</p>
    }
    @if (form(); as form) {
      <form class="card settings-form" aria-label="Settings" novalidate (submit)="submit($event)">
        <label class="choice">
          <input
            type="checkbox"
            [checked]="form.confirmDelete"
            (change)="change({ confirmDelete: $any($event.target).checked })"
            aria-describedby="confirm-delete-hint"
          />
          Confirm before deleting
        </label>
        <p id="confirm-delete-hint" class="hint">Ask before a task is permanently removed.</p>

        <fieldset>
          <legend>Default filter</legend>
          <p class="hint">The tab the task list opens on.</p>
          @for (option of filterOptions; track option.value) {
            <label class="choice">
              <input
                type="radio"
                name="defaultFilter"
                [value]="option.value"
                [checked]="form.defaultFilter === option.value"
                (change)="change({ defaultFilter: option.value })"
              />
              {{ option.label }}
            </label>
          }
        </fieldset>

        @if (saveError(); as saveError) {
          <p role="alert" class="error">{{ saveError }}</p>
        }
        <div class="actions">
          <!-- Always rendered so screen readers announce the change. -->
          <p role="status" class="saved">{{ saved() ? "Settings saved" : "" }}</p>
          <button type="submit" class="primary" [disabled]="saving()">Save settings</button>
        </div>
      </form>
    }
  `,
})
export class SettingsPage {
  protected readonly filterOptions = FILTER_OPTIONS;
  protected readonly form = signal<Settings | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);

  constructor() {
    api
      .getSettings()
      .then((settings) => this.form.set(settings))
      .catch(() => this.loadError.set("Could not load settings. Is the API running?"));
  }

  protected change(patch: Partial<Settings>) {
    this.form.update((f) => f && { ...f, ...patch });
    this.saved.set(false);
  }

  protected async submit(e: SubmitEvent) {
    e.preventDefault();
    const form = this.form();
    if (!form) return;
    this.saving.set(true);
    try {
      this.form.set(await api.updateSettings(form));
      this.saveError.set(null);
      this.saved.set(true);
    } catch (err) {
      this.saveError.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
