import { randomUUID } from "node:crypto";

export type TaskStatus = "todo" | "in_progress" | "done";

export const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"];

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
  status?: TaskStatus;
};

export type TaskPatch = Partial<Pick<Task, "title" | "description" | "status">>;

// Oldest first; the list endpoint returns newest first.
const SEED: NewTask[] = [
  { title: "Create repository", description: "git init and first commit", status: "done" },
  { title: "Set up CI pipeline", description: "Run the Playwright suite on every PR", status: "in_progress" },
  { title: "Write project README", description: "Setup steps and the demo runbook", status: "todo" },
];

export function createStore() {
  // Map preserves insertion order, which doubles as creation order.
  const tasks = new Map<string, Task>();

  function create(input: NewTask): Task {
    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      status: input.status ?? "todo",
      createdAt: new Date().toISOString(),
    };
    tasks.set(task.id, task);
    return task;
  }

  function list(status?: TaskStatus): Task[] {
    const all = [...tasks.values()].reverse();
    return status ? all.filter((t) => t.status === status) : all;
  }

  function get(id: string): Task | undefined {
    return tasks.get(id);
  }

  function update(id: string, patch: TaskPatch): Task | undefined {
    const existing = tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = {
      ...existing,
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.description !== undefined && { description: patch.description.trim() }),
      ...(patch.status !== undefined && { status: patch.status }),
    };
    tasks.set(id, updated);
    return updated;
  }

  function remove(id: string): boolean {
    return tasks.delete(id);
  }

  function reset(): void {
    tasks.clear();
    for (const input of SEED) create(input);
  }

  reset();
  return { list, get, create, update, remove, reset };
}

export type Store = ReturnType<typeof createStore>;
