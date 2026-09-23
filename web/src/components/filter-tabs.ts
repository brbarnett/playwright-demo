import { Component, input, output } from "@angular/core";
import { FILTER_OPTIONS, type Filter } from "../types";

@Component({
  selector: "app-filter-tabs",
  template: `
    <div role="tablist" aria-label="Filter tasks" class="tabs">
      @for (f of options; track f.value) {
        <button type="button" role="tab" [attr.aria-selected]="value() === f.value" (click)="valueChange.emit(f.value)">
          {{ f.label }}
        </button>
      }
    </div>
  `,
})
export class FilterTabs {
  readonly value = input.required<Filter>();
  readonly valueChange = output<Filter>();
  protected readonly options = FILTER_OPTIONS;
}
