import { useEffect, useState, type SubmitEvent } from "react";
import { api, errorMessage } from "../api.ts";
import { FILTER_OPTIONS, type Settings } from "../types.ts";

export function SettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then(setForm)
      .catch(() => setLoadError("Could not load settings. Is the API running?"));
  }, []);

  function change(patch: Partial<Settings>) {
    setForm((f) => f && { ...f, ...patch });
    setSaved(false);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      setForm(await api.updateSettings(form));
      setSaveError(null);
      setSaved(true);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Settings</h1>
      {loadError && (
        <p role="alert" className="error">
          {loadError}
        </p>
      )}
      {form === null && !loadError && <p className="empty">Loading…</p>}
      {form && (
        <form className="card settings-form" aria-label="Settings" onSubmit={handleSubmit} noValidate>
          <label className="choice">
            <input
              type="checkbox"
              checked={form.confirmDelete}
              onChange={(e) => change({ confirmDelete: e.target.checked })}
              aria-describedby="confirm-delete-hint"
            />
            Confirm before deleting
          </label>
          <p id="confirm-delete-hint" className="hint">
            Ask before a task is permanently removed.
          </p>

          <fieldset>
            <legend>Default filter</legend>
            <p className="hint">The tab the task list opens on.</p>
            {FILTER_OPTIONS.map((option) => (
              <label key={option.value} className="choice">
                <input
                  type="radio"
                  name="defaultFilter"
                  value={option.value}
                  checked={form.defaultFilter === option.value}
                  onChange={() => change({ defaultFilter: option.value })}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {saveError && (
            <p role="alert" className="error">
              {saveError}
            </p>
          )}
          <div className="actions">
            {/* Always rendered so screen readers announce the change. */}
            <p role="status" className="saved">
              {saved ? "Settings saved" : ""}
            </p>
            <button type="submit" className="primary" disabled={saving}>
              Save settings
            </button>
          </div>
        </form>
      )}
    </>
  );
}
