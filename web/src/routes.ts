import type { Routes } from "@angular/router";
import { NotFoundPage } from "./pages/not-found-page";
import { SettingsPage } from "./pages/settings-page";
import { TasksPage } from "./pages/tasks-page";

export const routes: Routes = [
  { path: "", component: TasksPage },
  { path: "settings", component: SettingsPage },
  { path: "**", component: NotFoundPage },
];
