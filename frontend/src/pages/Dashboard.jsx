import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { useAuth } from "../AuthContext";
import TaskForm from "../components/TaskForm";
import TaskTable from "../components/TaskTable";
import Pagination from "../components/Pagination";

const SIZE = 10;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState({ status: "", priority: "", q: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | a task object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, size: SIZE };
      for (const [key, value] of Object.entries(filters)) {
        if (value) params[key] = value;
      }
      const res = await api.get("/tasks", { params });
      setData(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  }

  async function handleSave(values) {
    if (editing === "new") {
      await api.post("/tasks", values);
    } else {
      await api.patch(`/tasks/${editing.id}`, values);
    }
    setEditing(null);
    await load();
  }

  async function handleComplete(task) {
    try {
      await api.patch(`/tasks/${task.id}/complete`);
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>My tasks</h2>
          <span className="muted">Signed in as {user.full_name}</span>
        </div>
        <div className="row">
          <button onClick={() => setEditing("new")}>Add task</button>
          <button className="secondary" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {editing && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editing === "new" ? "New task" : "Edit task"}</h3>
          <TaskForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
            submitLabel={editing === "new" ? "Create" : "Save changes"}
          />
        </div>
      )}

      <div className="card">
        <div className="row">
          <input
            placeholder="Search title or description"
            value={filters.q}
            onChange={(e) => changeFilter("q", e.target.value)}
          />
          <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select value={filters.priority} onChange={(e) => changeFilter("priority", e.target.value)}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="card">
        {error && <div className="error">{error}</div>}
        {loading ? (
          <p className="muted">Loading tasks...</p>
        ) : (
          <>
            <TaskTable tasks={data.items} onEdit={setEditing} onDelete={handleDelete} onComplete={handleComplete} />
            <Pagination page={page} total={data.total} size={SIZE} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
