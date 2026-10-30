import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@demo.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <form onSubmit={onSubmit} className="card shadow-sm" style={{ width: "22rem" }}>
        <div className="card-body">
          <h1 className="h4 card-title">ServiceHub</h1>
          <p className="card-text text-muted small">Sign in to your workspace</p>
          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          <div className="mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="form-control form-control-sm"
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="form-control form-control-sm"
              required
            />
          </div>
          <button type="submit" disabled={busy} className="btn btn-dark w-100 btn-sm">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
