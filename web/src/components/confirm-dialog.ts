import { Component, ElementRef, afterNextRender, inject, input, output, type OnDestroy } from "@angular/core";

let nextId = 0;

/** A modal <dialog>. Rendered with `@if`, it opens as soon as it appears. */
@Component({
  selector: "dialog[appConfirmDialog]",
  host: {
    class: "card dialog",
    "[attr.aria-labelledby]": "headingId",
    // Escape key: route through the parent's state instead of closing natively.
    "(cancel)": "$event.preventDefault(); cancelled.emit()",
  },
  template: `
    <h2 [id]="headingId">{{ heading() }}</h2>
    <p>{{ message() }}</p>
    <div class="actions">
      <button type="button" (click)="cancelled.emit()">Cancel</button>
      <button type="button" class="danger" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
    </div>
  `,
})
export class ConfirmDialog implements OnDestroy {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  // Not "cancel": that would collide with the native <dialog> cancel event.
  readonly confirmed = output();
  readonly cancelled = output();

  protected readonly headingId = `confirm-dialog-${nextId++}`;
  private readonly dialog: HTMLDialogElement = inject(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => this.dialog.showModal());
  }

  ngOnDestroy() {
    this.dialog.close();
  }
}
