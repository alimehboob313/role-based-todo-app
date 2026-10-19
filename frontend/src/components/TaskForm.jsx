import { useState } from "react";
import { errMsg } from "../api";

const EMPTY = { title: "", description: "", priority: "medium", status: "pending", due_date: "" };

export default function TaskForm({ initial, onSubmit, onCancel, submitLabel = "Save" }) {
  const [values, setValues] = useState(
    initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          priority: initial.priority,
          status: initial.status,
          due_date: initial.due_date ?? "",
        }
      : EMPTY
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        title: values.title.trim(),
        due_date: values.due_date || null,
      });
    } catch (err) {
      setError(errMsg(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <label>Title</label>
      <input required maxLength={200} value={values.title} onChange={(e) => set("title", e.target.value)} />
      <label>Description</label>
      <textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} />
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Priority</label>
          <select value={values.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Status</label>
          <select value={values.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Due date</label>
          <input type="date" value={values.due_date} onChange={(e) => set("due_date", e.target.value)} />
        </div>
      </div>
      <p className="row">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </p>
    </form>
  );
}
