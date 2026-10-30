import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useAuth } from "../auth/AuthContext.jsx";

const STATUS_COLUMNS = ["REQUESTED", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const COLUMN_STYLES = {
  REQUESTED: { badge: "text-bg-warning", dot: "#f59e0b" },
  ASSIGNED: { badge: "text-bg-primary", dot: "#4f6df5" },
  EN_ROUTE: { badge: "text-bg-info", dot: "#0dcaf0" },
  IN_PROGRESS: { badge: "text-bg-secondary", dot: "#8a93a5" },
  COMPLETED: { badge: "text-bg-success", dot: "#10b981" },
  CANCELLED: { badge: "text-bg-light text-muted border", dot: "#b0b8c5" },
};

// Buttons the board offers, keyed by the NEXT status. ASSIGNED is handled by
// the assign dropdown, and INVOICED/PAID arrive with M4 (invoicing), so they
// are intentionally absent for now.
const ACTION_LABELS = {
  SCHEDULED: { label: "Schedule", icon: "bi-calendar-plus", class: "btn-outline-primary" },
  CANCELLED: { label: "Cancel", icon: "bi-x-circle", class: "btn-outline-danger" },
  EN_ROUTE: { label: "On the way", icon: "bi-truck", class: "btn-outline-info" },
  IN_PROGRESS: { label: "Start work", icon: "bi-play-fill", class: "btn-outline-secondary" },
  COMPLETED: { label: "Complete", icon: "bi-check-lg", class: "btn-outline-success" },
};

// Statuses from which a technician can still be attached via the dropdown.
const ASSIGNABLE_STATUSES = ["REQUESTED", "SCHEDULED"];

export default function DispatchBoard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ transitions: {}, technicians: [] });
  const [techFilter, setTechFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pendingJobId, setPendingJobId] = useState(null);

  const canDispatch = user?.role === "OWNER" || user?.role === "DISPATCHER";

  const loadJobs = useCallback(() => {
    return api("/jobs")
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
    api("/jobs/meta")
      .then(setMeta)
      .catch(() => {});
    // Keep the board roughly current; real-time websockets come later.
    const timer = setInterval(loadJobs, 30000);
    return () => clearInterval(timer);
  }, [loadJobs]);

  // Legal next statuses for a card, straight from the API's transition map.
  const metaNext = (status) => meta.transitions[status] || [];

  async function updateJob(fetchPromise, jobId, applyLocal) {
    setPendingJobId(jobId);
    setActionError(null);
    const snapshot = jobs;
    applyLocal();
    try {
      const updated = await fetchPromise;
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err) {
      setJobs(snapshot); // roll back the optimistic change
      setActionError(err.message);
    } finally {
      setPendingJobId(null);
    }
  }

  function changeStatus(job, nextStatus) {
    updateJob(
      api(`/jobs/${job.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus }),
      }),
      job.id,
      () => setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j)))
    );
  }

  function assign(job, technicianId) {
    const tech = meta.technicians.find((t) => t.id === technicianId);
    updateJob(
      api(`/jobs/${job.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ technicianId }),
      }),
      job.id,
      () =>
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, technicianId, technician: tech } : j))
        )
    );
  }

  const visibleJobs = jobs.filter(
    (job) => techFilter === "all" || job.technicianId === techFilter
  );

  return (
    <div className="container-fluid p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h4 mb-0 fw-semibold">Dispatch board</h1>
          <div className="text-muted small mt-1">
            {visibleJobs.length} job{visibleJobs.length === 1 ? "" : "s"} shown · auto-refreshes
            every 30s
          </div>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div className="position-relative">
            <i className="bi bi-person-badge position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="form-select form-select-sm ps-5"
              style={{ width: 200 }}
            >
              <option value="all">All technicians</option>
              <option value="">Unassigned</option>
              {meta.technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={loadJobs} className="btn btn-light btn-sm border" title="Refresh now">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {actionError && (
        <div className="alert alert-warning py-2 d-flex justify-content-between align-items-center">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="btn-close"
            style={{ fontSize: "0.6rem" }}
          ></button>
        </div>
      )}

      <div className="row g-3 flex-nowrap board-scroll">
        {STATUS_COLUMNS.map((status) => {
          const columnJobs = visibleJobs.filter((j) => j.status === status);
          const style = COLUMN_STYLES[status];
          return (
            <div className="col-auto board-col" key={status}>
              <div className="bg-light rounded-3 p-3 h-100 board-column">
                <h2 className="text-uppercase small text-muted fw-semibold d-flex align-items-center gap-2 mb-3">
                  <span className="status-dot" style={{ background: style.dot }}></span>
                  {status.replace("_", " ")}{" "}
                  <span className="badge rounded-pill text-bg-light border">
                    {columnJobs.length}
                  </span>
                </h2>
                <div className="d-flex flex-column gap-2">
                  {columnJobs.map((job) => (
                    <div className="card shadow-sm job-card" key={job.id}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <p className="card-text small fw-semibold mb-1">{job.title}</p>
                          <span className={`badge ${style.badge}`} style={{ fontSize: "0.65rem" }}>
                            {status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="card-text text-muted mb-2" style={{ fontSize: "0.78rem" }}>
                          <i className="bi bi-person me-1"></i>
                          {job.customer?.name}
                          {job.address && (
                            <>
                              {" · "}
                              <i className="bi bi-geo-alt me-1"></i>
                              {job.address}
                            </>
                          )}
                        </p>

                        {canDispatch && ASSIGNABLE_STATUSES.includes(job.status) && (
                          <select
                            className="form-select form-select-sm mb-2"
                            value={job.technicianId || ""}
                            disabled={pendingJobId === job.id}
                            onChange={(e) => e.target.value && assign(job, e.target.value)}
                          >
                            <option value="">
                              {job.technician ? `↻ ${job.technician.name}` : "Assign technician…"}
                            </option>
                            {meta.technicians.map((tech) => (
                              <option key={tech.id} value={tech.id}>
                                {tech.name}
                                {tech.zone ? ` · ${tech.zone}` : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        {!canDispatch && job.technician && (
                          <p className="mb-2" style={{ fontSize: "0.78rem" }}>
                            <i className="bi bi-tools me-1"></i>
                            {job.technician.name}
                          </p>
                        )}

                        <div className="d-flex flex-wrap gap-1">
                          {(metaNext(status) || []).map((next) => {
                            const action = ACTION_LABELS[next];
                            if (!action) return null;
                            return (
                              <button
                                key={next}
                                onClick={() => changeStatus(job, next)}
                                disabled={pendingJobId === job.id}
                                className={`btn btn-sm border ${action.class}`}
                                style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                              >
                                <i className={`bi ${action.icon} me-1`}></i>
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnJobs.length === 0 && (
                    <p className="text-muted text-center py-3 mb-0" style={{ fontSize: "0.75rem" }}>
                      {loading ? "…" : "No jobs"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
