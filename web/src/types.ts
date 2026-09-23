export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
};

export type NewTask = {
  title: string;
  description?: string;
};

export type TaskPatch = Partial<Pick<Task, "title" | "description" | "status">>;

export type Filter = "all" | TaskStatus;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In progress",
  done: "Done",
};

export const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.entries(STATUS_LABELS) as [TaskStatus, string][]).map(([value, label]) => ({ value, label })),
];

export type Settings = {
  confirmDelete: boolean;
  defaultFilter: Filter;
};
