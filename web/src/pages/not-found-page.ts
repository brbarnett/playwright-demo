import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-not-found-page",
  imports: [RouterLink],
  host: { class: "page" },
  template: `
    <h1>Page not found</h1>
    <p class="empty"><a routerLink="/">Back to tasks</a></p>
  `,
})
export class NotFoundPage {}
