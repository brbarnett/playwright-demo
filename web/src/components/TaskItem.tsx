import { useState, type FormEvent } from "react";
import { errorMessage } from "../api.ts";
import { STATUS_LABELS, type Task, type TaskPatch, type TaskStatus } from "../types.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

type Props = {
  task: Task;
  onUpdate: (id: string, patch: TaskPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TaskItem({ task, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<boolean> {
    try {
      await action();
      setError(null);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  }

  function startEditing() {
    setTitle(task.title);
    setDescription(task.description);
    setError(null);
    setEditing(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (await run(() => onUpdate(task.id, { title, description }))) setEditing(false);
  }

  async function handleConfirmDelete() {
    setConfirming(false);
    await run(() => onDelete(task.id));
  }

  const errorAlert = error && (
    <p role="alert" className="error">
      {error}
    </p>
  );

  if (editing) {
    return (
      <li className="card task editing" aria-label={task.title}>
        <form aria-label={`Edit ${task.title}`} onSubmit={handleSave} noValidate>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </label>
          <label>
            Description
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          {errorAlert}
          <div className="actions">
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  const statusId = `status-${task.id}`;
  return (
    <li className={`card task status-${task.status}`} aria-label={task.title}>
      <div className="task-body">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        {errorAlert}
      </div>
      <div className="task-controls">
        <label htmlFor={statusId} className="visually-hidden">
          Status
        </label>
        <select
          id={statusId}
          value={task.status}
          onChange={(e) => run(() => onUpdate(task.id, { status: e.target.value as TaskStatus }))}
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" onClick={startEditing}>
          Edit
        </button>
        <button type="button" className="danger-outline" onClick={() => setConfirming(true)}>
          Delete
        </button>
      </div>
      {confirming && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${task.title}" will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </li>
  );
}
