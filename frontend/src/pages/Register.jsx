import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { errMsg } from "../api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, fullName, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card auth-card">
      <h2>Create account</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Account created. Redirecting to login...</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Full name</label>
        <input id="name" required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password (8-72 characters)</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p>
          <button type="submit" disabled={submitting || success}>
            {submitting ? "Creating..." : "Register"}
          </button>
        </p>
      </form>
      <p className="muted">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
