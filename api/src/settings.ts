import type { TaskStatus } from "./store.ts";

export type TaskFilter = "all" | TaskStatus;

export const TASK_FILTERS: readonly TaskFilter[] = ["all", "todo", "in_progress", "done"];

export type Settings = {
  confirmDelete: boolean;
  defaultFilter: TaskFilter;
};

export type SettingsPatch = Partial<Settings>;

const DEFAULTS: Settings = { confirmDelete: true, defaultFilter: "all" };

export function createSettingsStore() {
  let settings: Settings = { ...DEFAULTS };

  return {
    get: (): Settings => ({ ...settings }),
    update(patch: SettingsPatch): Settings {
      settings = { ...settings, ...patch };
      return { ...settings };
    },
    reset(): void {
      settings = { ...DEFAULTS };
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
