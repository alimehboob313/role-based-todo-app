export default function TaskTable({ tasks, onEdit, onDelete, onComplete }) {
  if (tasks.length === 0) return <p className="muted">No tasks found.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Due</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <td>
              <strong>{t.title}</strong>
              {t.description && <div className="muted">{t.description}</div>}
            </td>
            <td>
              <span className={`badge ${t.priority}`}>{t.priority}</span>
            </td>
            <td>
              <span className={`badge ${t.status}`}>{t.status}</span>
            </td>
            <td>{t.due_date ?? "-"}</td>
            <td>
              <div className="row">
                {onComplete && t.status !== "done" && (
                  <button className="small" onClick={() => onComplete(t)}>
                    Complete
                  </button>
                )}
                <button className="small secondary" onClick={() => onEdit(t)}>
                  Edit
                </button>
                <button className="small danger" onClick={() => onDelete(t)}>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
