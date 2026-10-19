export default function Pagination({ page, total, size, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (total <= size) return null;

  return (
    <div className="pager">
      <button className="small secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {page} of {pages} ({total} total)
      </span>
      <button className="small secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
