import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { avatarColor, initials } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader.jsx";
import { FormModal } from "../customers/CustomersPage.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

const EMPTY_FORM = { name: "", phone: "", skills: "", zone: "" };

export default function TechniciansPage() {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState([]);
  const [filter, setFilter] = useState("all"); // all | active | inactive
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const isOwner = user?.role === "OWNER";

  function refresh(activeParam) {
    setLoading(true);
    const query = activeParam && activeParam !== "all" ? `?active=${activeParam}` : "";
    return api(`/technicians${query}`)
      .then(setTechnicians)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh(filter);
  }, [filter]);

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
      await refresh(filter);
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
      await refresh(filter);
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
        subtitle={`${technicians.length} ${technicians.length === 1 ? "technician" : "technicians"} shown`}
        actions={
          <>
            <div className="btn-group btn-group-sm" role="group">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`btn ${filter === tab.key ? "btn-dark" : "btn-light border"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            >
              <i className="bi bi-plus-lg"></i>Add technician
            </button>
          </>
        }
      />

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
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
                <tr key={technician.id} className={technician.isActive ? "" : "opacity-50"}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="avatar"
                        style={{ backgroundColor: avatarColor(technician.name) }}
                      >
                        {initials(technician.name)}
                      </span>
                      <span className="fw-medium">{technician.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{technician.phone}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {technician.skills.map((skill) => (
                        <span key={skill} className="badge rounded-pill text-bg-light border">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted">{technician.zone || "—"}</td>
                  <td>
                    {technician.isActive ? (
                      <span className="badge bg-success-subtle text-success fw-normal">
                        <i className="bi bi-circle-fill" style={{ fontSize: "0.4rem" }}></i> Active
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary fw-normal">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="text-end pe-4">
                    <div className="d-flex justify-content-end gap-1">
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
            <p className="text-muted mt-2 mb-3">No technicians here yet.</p>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="btn btn-outline-primary btn-sm"
            >
              Add your first technician
            </button>
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
