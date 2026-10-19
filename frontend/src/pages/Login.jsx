import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { errMsg } from "../api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const me = await login(email, password);
      navigate(me.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>Log in</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <p>
          <button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </p>
      </form>
      <p className="muted">
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
