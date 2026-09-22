import type { NewTask, Task, TaskPatch, TaskStatus } from "./types.ts";

export class ApiError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init.body ? { "content-type": "application/json" } : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Non-JSON error body; keep the generic message.
    }
    throw new ApiError(message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  listTasks: (status?: TaskStatus) =>
    request<Task[]>(status ? `/tasks?status=${status}` : "/tasks"),
  createTask: (input: NewTask) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: string, patch: TaskPatch) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: "DELETE" }),
};

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Is the API running?";
}
