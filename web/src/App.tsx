import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";
import { FilterTabs } from "./components/FilterTabs.tsx";
import { TaskForm } from "./components/TaskForm.tsx";
import { TaskList } from "./components/TaskList.tsx";
import type { Filter, NewTask, Task, TaskPatch } from "./types.ts";

export function App() {
  const [filter, setFilter] = useState<Filter>("all");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await api.listTasks(filter === "all" ? undefined : filter));
      setLoadError(null);
    } catch {
      setLoadError("Could not load tasks. Is the API running?");
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(input: NewTask) {
    await api.createTask(input);
    await load();
  }

  async function handleUpdate(id: string, patch: TaskPatch) {
    const updated = await api.updateTask(id, patch);
    setTasks((ts) =>
      (ts ?? [])
        .map((t) => (t.id === updated.id ? updated : t))
        .filter((t) => filter === "all" || t.status === filter),
    );
  }

  async function handleDelete(id: string) {
    await api.deleteTask(id);
    setTasks((ts) => (ts ?? []).filter((t) => t.id !== id));
  }

  return (
    <main className="app">
      <header>
        <h1>Task Tracker</h1>
        <p className="subtitle">A tiny app for demoing Playwright.</p>
      </header>
      <TaskForm onCreate={handleCreate} />
      <section className="tasks-section">
        <FilterTabs value={filter} onChange={setFilter} />
        {loadError && (
          <p role="alert" className="error">
            {loadError}
          </p>
        )}
        {tasks === null && !loadError ? (
          <p className="empty">Loading…</p>
        ) : (
          tasks && <TaskList tasks={tasks} filter={filter} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
      </section>
    </main>
  );
}
