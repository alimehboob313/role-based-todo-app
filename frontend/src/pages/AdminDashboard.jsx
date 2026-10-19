import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api";
import { useAuth } from "../AuthContext";
import TaskForm from "../components/TaskForm";
import TaskTable from "../components/TaskTable";
import Pagination from "../components/Pagination";

const SIZE = 10;

function UsersSection({ selectedId, onSelect }) {
  const { user: me } = useAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ full_name: "", email: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, size: SIZE };
      if (q) params.q = q;
      if (activeFilter) params.is_active = activeFilter === "active";
      const res = await api.get("/admin/users", { params });
      setData(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page, q, activeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(u) {
    setEditId(u.id);
    setDraft({ full_name: u.full_name, email: u.email });
  }

  async function saveEdit(u) {
    setError("");
    try {
      await api.patch(`/admin/users/${u.id}`, draft);
      setEditId(null);
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  async function toggleActive(u) {
    setError("");
    try {
      await api.patch(`/admin/users/${u.id}`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Users</h3>
      <div className="row">
        <input
          placeholder="Search name or email"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading users...</p>
      ) : data.items.length === 0 ? (
        <p className="muted">No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => {
              const editing = editId === u.id;
              return (
                <tr key={u.id} style={u.id === selectedId ? { background: "#eff6ff" } : undefined}>
                  <td>{u.id}</td>
                  <td>
                    {editing ? (
                      <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
                    ) : (
                      u.full_name
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    ) : (
                      u.email
                    )}
                  </td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? "done" : "inactive"}`}>
                      {u.is_active ? "active" : "deactivated"}
                    </span>
                  </td>
                  <td>
                    <div className="row">
                      {editing ? (
                        <>
                          <button className="small" onClick={() => saveEdit(u)}>
                            Save
                          </button>
                          <button className="small secondary" onClick={() => setEditId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="small secondary" onClick={() => startEdit(u)}>
                            Edit
                          </button>
                          <button
                            className={`small ${u.is_active ? "danger" : ""}`}
                            disabled={u.id === me.id}
                            title={u.id === me.id ? "You cannot deactivate your own account" : ""}
                            onClick={() => toggleActive(u)}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button className="small" onClick={() => onSelect(u)}>
                            View tasks
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <Pagination page={page} total={data.total} size={SIZE} onChange={setPage} />
    </div>
  );
}

function UserTasks({ user, onClose }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [filters, setFilters] = useState({ status: "", priority: "", q: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
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
      const res = await api.get(`/admin/users/${user.id}/tasks`, { params });
      setData(res.data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [user.id, page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function changeFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }));
    setPage(1);
  }

  async function handleSave(values) {
    await api.patch(`/admin/users/${user.id}/tasks/${editing.id}`, values);
    setEditing(null);
    await load();
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete "${task.title}" for ${user.full_name}?`)) return;
    try {
      await api.delete(`/admin/users/${user.id}/tasks/${task.id}`);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="card">
      <div className="topbar">
        <h3 style={{ margin: 0 }}>Tasks of {user.full_name}</h3>
        <button className="secondary small" onClick={onClose}>
          Close
        </button>
      </div>

      {editing && (
        <div className="card" style={{ background: "#f9fafb" }}>
          <h4 style={{ marginTop: 0 }}>Edit task</h4>
          <TaskForm
            key={editing.id}
            initial={editing}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        </div>
      )}

      <div className="row">
        <input placeholder="Search" value={filters.q} onChange={(e) => changeFilter("q", e.target.value)} />
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

      {error && <div className="error">{error}</div>}
      {loading ? (
        <p className="muted">Loading tasks...</p>
      ) : (
        <>
          <TaskTable tasks={data.items} onEdit={setEditing} onDelete={handleDelete} />
          <Pagination page={page} total={data.total} size={SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [selected, setSelected] = useState(null);

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>Admin dashboard</h2>
          <span className="muted">Signed in as {user.full_name}</span>
        </div>
        <button className="secondary" onClick={logout}>
          Log out
        </button>
      </div>

      <UsersSection selectedId={selected?.id} onSelect={setSelected} />
      {selected && <UserTasks key={selected.id} user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
