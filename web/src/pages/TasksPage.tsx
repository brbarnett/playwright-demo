import { useCallback, useEffect, useState } from "react";
import { api } from "../api.ts";
import { FilterTabs } from "../components/FilterTabs.tsx";
import { TaskForm } from "../components/TaskForm.tsx";
import { TaskList } from "../components/TaskList.tsx";
import type { Filter, NewTask, Task, TaskPatch } from "../types.ts";

export function TasksPage() {
  // null until settings arrive, so the list opens on the saved default filter.
  const [filter, setFilter] = useState<Filter | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((settings) => {
        setFilter(settings.defaultFilter);
        setConfirmDelete(settings.confirmDelete);
      })
      .catch(() => {
        setFilter("all");
        setError("Could not load settings. Is the API running?");
      });
  }, []);

  const load = useCallback(async () => {
    if (filter === null) return;
    try {
      setTasks(await api.listTasks(filter === "all" ? undefined : filter));
      setError(null);
    } catch {
      setError("Could not load tasks. Is the API running?");
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
    <>
      <h1>Tasks</h1>
      <TaskForm onCreate={handleCreate} />
      <section className="tasks-section">
        {filter !== null && <FilterTabs value={filter} onChange={setFilter} />}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {tasks === null && !error ? (
          <p className="empty">Loading…</p>
        ) : (
          tasks &&
          filter !== null && (
            <TaskList
              tasks={tasks}
              filter={filter}
              confirmDelete={confirmDelete}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )
        )}
      </section>
    </>
  );
}
