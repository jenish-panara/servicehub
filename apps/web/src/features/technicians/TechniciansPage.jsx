import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { initials } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader.jsx";
import { FormModal } from "../customers/CustomersPage.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const EMPTY_FORM = { name: "", phone: "", skills: "", zone: "" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export default function TechniciansPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const isOwner = user?.role === "OWNER";

  // The API filters by ?active=true|false — map our filter keys to that.
  function loadList(activeFilter) {
    setLoading(true);
    setError(null);
    const query =
      activeFilter === "all" ? "" : `?active=${activeFilter === "active" ? "true" : "false"}`;
    return api(`/technicians${query}`)
      .then(setTechnicians)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Stats always come from the unfiltered list so the counts stay truthful.
  function loadStats() {
    return api("/technicians").then((all) =>
      setStats({
        total: all.length,
        active: all.filter((t) => t.isActive).length,
        inactive: all.filter((t) => !t.isActive).length,
      })
    );
  }

  useEffect(() => {
    loadList(filter);
  }, [filter]);

  useEffect(() => {
    loadStats();
  }, []);

  function refreshAll() {
    loadList(filter);
    loadStats();
  }

  async function onSave(form) {
    setBusy(true);
    setError(null);
    try {
      // skills come from the form as a comma-separated string
      const payload = {
        name: form.name,
        phone: form.phone,
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        zone: form.zone,
      };
      const method = modal.mode === "edit" ? "PUT" : "POST";
      const path = modal.mode === "edit" ? `/technicians/${modal.technician.id}` : "/technicians";
      await api(path, { method, body: JSON.stringify(payload) });
      setModal(null);
      refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(technician) {
    setError(null);
    try {
      await api(`/technicians/${technician.id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !technician.isActive }),
      });
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        icon="bi-person-badge"
        iconColor="success"
        title="Technicians"
        subtitle="Manage your field team, skills and zones"
        actions={
          <button
            onClick={() => setModal({ mode: "create" })}
            className="btn btn-primary btn-sm d-flex align-items-center gap-1"
          >
            <i className="bi bi-plus-lg"></i>Add technician
          </button>
        }
      />

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#eef1fe", color: "#4f6df5" }}>
              <i className="bi bi-people"></i>
            </div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total technicians</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#e8f7f0", color: "#10b981" }}>
              <i className="bi bi-check-circle"></i>
            </div>
            <div>
              <div className="stat-value">{stats.active}</div>
              <div className="stat-label">Active now</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: "#f1f3f7", color: "#8a93a5" }}>
              <i className="bi bi-pause-circle"></i>
            </div>
            <div>
              <div className="stat-value">{stats.inactive}</div>
              <div className="stat-label">Inactive</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* Segmented filter */}
      <div className="segmented mb-3" role="group">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={filter === tab.key ? "active" : ""}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 tech-table">
            <thead>
              <tr>
                <th className="ps-4">Technician</th>
                <th>Phone</th>
                <th>Skills</th>
                <th>Zone</th>
                <th>Status</th>
                <th className="text-end pe-4"></th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id} className={technician.isActive ? "" : "row-inactive"}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-2">
                      <span className="avatar">
                        {initials(technician.name)}
                      </span>
                      <span className="fw-medium">{technician.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">
                    <i className="bi bi-telephone me-1" style={{ fontSize: "0.75rem" }}></i>
                    {technician.phone}
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {technician.skills.map((skill) => (
                        <span key={skill} className="skill-chip">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted">
                    {technician.zone ? (
                      <>
                        <i className="bi bi-geo-alt me-1" style={{ fontSize: "0.8rem" }}></i>
                        {technician.zone}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {technician.isActive ? (
                      <span className="status-pill status-active">
                        <span className="status-dot"></span>Active
                      </span>
                    ) : (
                      <span className="status-pill status-inactive">
                        <span className="status-dot"></span>Inactive
                      </span>
                    )}
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-1 row-actions">
                      <button
                        onClick={() => setModal({ mode: "edit", technician })}
                        className="btn btn-light btn-sm border"
                        title="Edit"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => toggleActive(technician)}
                          className={`btn btn-sm border ${
                            technician.isActive ? "btn-light" : "btn-success text-white"
                          }`}
                          title={technician.isActive ? "Deactivate" : "Reactivate"}
                        >
                          <i className={`bi ${technician.isActive ? "bi-pause" : "bi-play"}`}></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="text-center text-muted py-4">Loading…</div>}
        {!loading && technicians.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-person-badge fs-1 text-secondary"></i>
            <p className="text-muted mt-2 mb-3">
              {filter === "all"
                ? "No technicians here yet."
                : `No ${filter} technicians right now.`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => setModal({ mode: "create" })}
                className="btn btn-outline-primary btn-sm"
              >
                Add your first technician
              </button>
            )}
          </div>
        )}
      </div>

      {modal && (
        <FormModal
          key={modal.technician?.id || "new"}
          title={modal.mode === "edit" ? `Edit ${modal.technician.name}` : "Add technician"}
          initial={
            modal.technician
              ? {
                  name: modal.technician.name,
                  phone: modal.technician.phone,
                  skills: modal.technician.skills.join(", "),
                  zone: modal.technician.zone || "",
                }
              : EMPTY_FORM
          }
          busy={busy}
          onClose={() => setModal(null)}
          onSave={onSave}
          fields={[
            { key: "name", label: "Full name", required: true, placeholder: "e.g. Ravi Kumar" },
            { key: "phone", label: "Phone", required: true, placeholder: "+91-…" },
            {
              key: "skills",
              label: "Skills (comma-separated)",
              placeholder: "plumbing, electrical, AC repair",
            },
            { key: "zone", label: "Zone (optional)", placeholder: "e.g. north" },
          ]}
        />
      )}
    </div>
  );
}
