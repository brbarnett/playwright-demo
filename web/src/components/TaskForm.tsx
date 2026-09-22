import { useState, type FormEvent } from "react";
import { errorMessage } from "../api.ts";
import type { NewTask } from "../types.ts";

type Props = {
  onCreate: (input: NewTask) => Promise<void>;
};

export function TaskForm({ onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreate({ title, description });
      setTitle("");
      setDescription("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // noValidate: let the server's validation message show instead of the browser's.
  return (
    <form className="card task-form" aria-label="New task" onSubmit={handleSubmit} noValidate>
      <h2>New task</h2>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        Description
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={submitting}>
          Add task
        </button>
      </div>
    </form>
  );
}
