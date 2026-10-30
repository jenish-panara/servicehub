import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";

const LINKS = [
  { to: "/", icon: "bi-kanban", label: "Dispatch board", end: true },
  { to: "/customers", icon: "bi-people", label: "Customers" },
  { to: "/technicians", icon: "bi-person-badge", label: "Technicians" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="d-flex align-items-center gap-2 sidebar-brand">
          <i className="bi bi-tools fs-4 text-primary"></i>
          <span className="fs-5 fw-semibold text-white sidebar-hide-sm">ServiceHub</span>
        </div>

        <nav className="sidebar-nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `sidebar-link d-flex align-items-center gap-2 ${isActive ? "active" : ""}`
              }
              title={link.label}
            >
              <i className={`bi ${link.icon}`}></i>
              <span className="sidebar-hide-sm">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="text-secondary small sidebar-user">
              <i className="bi bi-person-circle me-1"></i>
              <span className="sidebar-hide-sm">
                {user.name} · {user.role.toLowerCase()}
              </span>
            </div>
          )}
          <button onClick={onLogout} className="btn btn-outline-secondary btn-sm" title="Logout">
            <i className="bi bi-box-arrow-right"></i>
            <span className="sidebar-hide-sm ms-1">Logout</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
