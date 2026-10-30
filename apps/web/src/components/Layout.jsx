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
    <div className="d-flex min-vh-100">
      <aside className="sidebar d-flex flex-column flex-shrink-0 p-3">
        <div className="d-flex align-items-center gap-2 mb-4 px-2">
          <i className="bi bi-tools fs-4 text-primary"></i>
          <span className="fs-5 fw-semibold text-white">ServiceHub</span>
        </div>

        <nav className="nav flex-column gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `sidebar-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 ${isActive ? "active" : ""}`
              }
            >
              <i className={`bi ${link.icon}`}></i>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2">
          {user && (
            <div className="text-secondary small mb-2">
              <i className="bi bi-person-circle me-1"></i>
              {user.name} · {user.role.toLowerCase()}
            </div>
          )}
          <button onClick={onLogout} className="btn btn-outline-secondary btn-sm w-100">
            <i className="bi bi-box-arrow-right me-1"></i>Logout
          </button>
        </div>
      </aside>

      <main className="flex-grow-1 p-4 min-vh-100" style={{ overflowX: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}
