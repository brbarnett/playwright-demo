import { Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-root",
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app">
      <header class="site-header">
        <p class="brand">Task Tracker</p>
        <nav aria-label="Main">
          <a
            routerLink="/"
            routerLinkActive="active"
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: true }"
            >Tasks</a
          >
          <a routerLink="/settings" routerLinkActive="active" ariaCurrentWhenActive="page">Settings</a>
        </nav>
      </header>
      <!-- Each page component carries the "page" class on its own host element. -->
      <main>
        <router-outlet />
      </main>
    </div>
  `,
})
export class App {}
