import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { avatarColor, initials, formatDate } from "../../lib/ui.js";
import { useAuth } from "../auth/AuthContext.jsx";
import AssignModal from "./AssignModal.jsx";

const STATUS_COLUMNS = [
  "REQUESTED",
  "SCHEDULED",
  "ASSIGNED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

// Tab + badge visuals per status (colors from the board design spec).
const STATUS_META = {
  ALL: { label: "All", icon: "bi-list-ul", color: "#64748B", bg: "#EEF1F6" },
  REQUESTED: { label: "Requested", icon: "bi-hourglass-split", color: "#F59E0B", bg: "#FEF3E2" },
  SCHEDULED: { label: "Scheduled", icon: "bi-calendar-check", color: "#6366F1", bg: "#EEF0FE" },
  ASSIGNED: { label: "Assigned", icon: "bi-person-check", color: "#2563EB", bg: "#EAF1FE" },
  EN_ROUTE: { label: "En Route", icon: "bi-truck", color: "#06B6D4", bg: "#E5F8FB" },
  IN_PROGRESS: { label: "In Progress", icon: "bi-play-fill", color: "#8B5CF6", bg: "#F1EBFE" },
  COMPLETED: { label: "Completed", icon: "bi-check-circle", color: "#16A34A", bg: "#E8F7F0" },
  CANCELLED: { label: "Cancelled", icon: "bi-x-circle", color: "#DC2626", bg: "#FDECEC" },
};

// Fallback so an unexpected status can never crash the whole board.
const UNKNOWN_STATUS_META = {
  label: "",
  icon: "bi-question-circle",
  color: "#64748B",
  bg: "#EEF1F6",
};

// Card action buttons, keyed by the NEXT status. Assigning happens in the
// AssignModal; INVOICED/PAID arrive with M4 (invoicing).
const ACTION_LABELS = {
  SCHEDULED: { label: "Schedule", icon: "bi-calendar-plus" },
  CANCELLED: { label: "Cancel", icon: "bi-x-circle", danger: true },
  EN_ROUTE: { label: "On the way", icon: "bi-truck" },
  IN_PROGRESS: { label: "Start Work", icon: "bi-play-fill", primary: true },
  COMPLETED: { label: "Complete", icon: "bi-check-lg", success: true },
};

// Statuses from which a technician can still be attached.
const ASSIGNABLE_STATUSES = ["REQUESTED", "SCHEDULED"];

export default function DispatchBoard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ transitions: {}, technicians: [] });
  const [statusFilter, setStatusFilter] = useState("all");
  const [techFilter, setTechFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [pendingJobId, setPendingJobId] = useState(null);
  const [assignJob, setAssignJob] = useState(null);

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

  function doAssign(technicianId) {
    const job = assignJob;
    const tech = meta.technicians.find((t) => t.id === technicianId);
    setAssignJob(null);
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

  const techFiltered = jobs.filter((job) => {
    if (techFilter === "all") return true;
    if (techFilter === "") return !job.technicianId;
    return job.technicianId === techFilter;
  });

  const statusFiltered =
    statusFilter === "all" ? techFiltered : techFiltered.filter((j) => j.status === statusFilter);

  const query = search.trim().toLowerCase();
  const visibleJobs = query
    ? statusFiltered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.customer?.name?.toLowerCase().includes(query) ||
          job.address?.toLowerCase().includes(query)
      )
    : statusFiltered;

  const statusCounts = Object.fromEntries([
    ["all", techFiltered.length],
    ...STATUS_COLUMNS.map((status) => [
      status,
      techFiltered.filter((j) => j.status === status).length,
    ]),
  ]);

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <span className="dsb-title-icon">
            <i className="bi bi-truck"></i>
          </span>
          <div>
            <h1 className="h4 mb-0 fw-semibold">Dispatch Board</h1>
            <div className="jc-secondary d-flex align-items-center gap-2 mt-1">
              <span className="live-dot"></span>
              {visibleJobs.length} job{visibleJobs.length === 1 ? "" : "s"} shown · auto-refreshes
              every 30s
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className="position-relative">
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, customers…"
              className="form-control form-control-sm ps-5"
              style={{ width: 230 }}
            />
          </div>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: 170 }}
          >
            <option value="all">All Technicians</option>
            <option value="">Unassigned</option>
            {meta.technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name}
              </option>
            ))}
          </select>
          <button
            onClick={loadJobs}
            className="btn btn-sm border bg-white d-flex align-items-center gap-1"
            title="Refresh now"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span className="d-none d-md-inline">Refresh</span>
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

      {/* Status tabs */}
      <div className="dsb-tabs mb-4">
        {["all", ...STATUS_COLUMNS].map((key) => {
          const tab = STATUS_META[key.toUpperCase()];
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`dsb-tab ${isActive ? "active" : ""}`}
            >
              <i className={`bi ${tab.icon} tab-icon`}></i>
              {tab.label}
              <span className="tab-count">{statusCounts[key]}</span>
            </button>
          );
        })}
      </div>

      {loading && jobs.length === 0 && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Loading board…
        </div>
      )}

      {/* Job cards */}
      {!loading && visibleJobs.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-inbox fs-1 text-secondary"></i>
          <p className="text-muted mt-2 mb-0">
            {query
              ? `No jobs match "${search}".`
              : `No ${STATUS_META[statusFilter.toUpperCase()].label.toLowerCase()} jobs${techFilter !== "all" ? " for this technician" : ""}.`}
          </p>
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {visibleJobs.map((job) => {
          const badge = STATUS_META[job.status] || {
            ...UNKNOWN_STATUS_META,
            label: job.status.replace("_", " "),
          };
          const assignVisible =
            !job.technician && canDispatch && ASSIGNABLE_STATUSES.includes(job.status);
          return (
            <div className="jobcard" key={job.id}>
              <div className="jobcard-grid">
                {/* A. Job info */}
                <div className="jc-section d-flex align-items-center gap-3">
                  <span className="jc-job-icon">
                    <i className="bi bi-hammer"></i>
                  </span>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: "0.95rem" }}>
                      {job.title}
                    </div>
                    <div className="jc-job-id mt-1">
                      #{job.id.slice(0, 8)}
                      {job.scheduledFor && (
                        <>
                          {" · "}
                          <i className="bi bi-calendar me-1"></i>
                          {formatDate(job.scheduledFor)}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* B. Customer */}
                <div className="jc-section">
                  <div className="jc-label">Customer</div>
                  <div className="jc-value">
                    <i className="bi bi-person me-1"></i>
                    {job.customer?.name}
                  </div>
                  <div className="jc-secondary text-truncate">
                    <i className="bi bi-geo-alt me-1"></i>
                    {job.address}
                  </div>
                </div>

                {/* C. Schedule */}
                <div className="jc-section">
                  <div className="jc-label">Schedule</div>
                  <div className="jc-value">
                    <i className="bi bi-calendar3 me-1"></i>
                    {job.scheduledFor ? formatDate(job.scheduledFor) : "Not scheduled"}
                  </div>
                  <div className="jc-secondary">
                    {job.scheduledFor && (
                      <>
                        <i className="bi bi-clock me-1"></i>
                        {new Date(job.scheduledFor).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* D. Technician */}
                <div className="jc-section">
                  <div className="jc-label">Technician</div>
                  {job.technician ? (
                    <div className="d-flex align-items-center gap-2 mt-1">
                      <span
                        className="tech-avatar"
                        style={{ backgroundColor: avatarColor(job.technician.name) }}
                      >
                        {initials(job.technician.name)}
                      </span>
                      <span className="jc-value fw-medium">{job.technician.name}</span>
                    </div>
                  ) : assignVisible ? (
                    <button
                      onClick={() => setAssignJob(job)}
                      disabled={pendingJobId === job.id}
                      className="jc-btn w-100 mt-1"
                    >
                      <i className="bi bi-person-plus me-1"></i>Assign technician
                    </button>
                  ) : (
                    <div className="jc-secondary mt-1">Unassigned</div>
                  )}
                </div>

                {/* E. Status */}
                <div className="jc-section">
                  <span
                    className="status-badge"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    <i className={`bi ${badge.icon}`}></i>
                    {badge.label}
                  </span>
                </div>

                {/* F. Actions */}
                <div className="jc-section jc-actions">
                  {metaNext(job.status).map((next) => {
                    const action = ACTION_LABELS[next];
                    if (!action) return null;
                    return (
                      <button
                        key={next}
                        onClick={() => changeStatus(job, next)}
                        disabled={pendingJobId === job.id}
                        className={`jc-btn ${action.primary ? "jc-btn-primary" : ""} ${
                          action.danger ? "jc-btn-danger" : ""
                        }`}
                      >
                        <i className={`bi ${action.icon} me-1`}></i>
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {assignJob && (
        <AssignModal
          job={assignJob}
          technicians={meta.technicians}
          busy={pendingJobId === assignJob.id}
          onClose={() => setAssignJob(null)}
          onAssign={doAssign}
        />
      )}
    </div>
  );
}
