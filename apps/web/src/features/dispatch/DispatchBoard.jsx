import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { initials, formatDate } from "../../lib/ui.js";
import { useAuth } from "../auth/AuthContext.jsx";
import AssignModal from "./AssignModal.jsx";
import JobDetailsDrawer from "./JobDetailsDrawer.jsx";

const STATUS_COLUMNS = [
  "REQUESTED",
  "SCHEDULED",
  "ASSIGNED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

// Status dot colors + labels (subtle enterprise palette).
const STATUS_META = {
  ALL: { label: "All", short: "All", color: "#64748B" },
  REQUESTED: { label: "Requested", short: "Req", color: "#64748B" },
  SCHEDULED: { label: "Scheduled", short: "Sched", color: "#2563EB" },
  ASSIGNED: { label: "Assigned", short: "Asgn", color: "#F59E0B" },
  EN_ROUTE: { label: "En Route", short: "Route", color: "#06B6D4" },
  IN_PROGRESS: { label: "In Progress", short: "Prog", color: "#8B5CF6" },
  COMPLETED: { label: "Completed", short: "Done", color: "#16A34A" },
  CANCELLED: { label: "Cancelled", short: "Canc", color: "#DC2626" },
};

// Action buttons, keyed by the NEXT status. `primary: true` renders as the
// card's main button; everything else lands in the ⋯ menu. Assigning happens
// via the AssignModal; INVOICED/PAID arrive with M4 (invoicing).
const ACTION_LABELS = {
  SCHEDULED: { label: "Schedule" },
  CANCELLED: { label: "Cancel", danger: true },
  EN_ROUTE: { label: "On the way" },
  IN_PROGRESS: { label: "Start Work", primary: true },
  COMPLETED: { label: "Complete", primary: true },
};

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
  const [detailJob, setDetailJob] = useState(null);
  const [menuJobId, setMenuJobId] = useState(null);

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
    const timer = setInterval(loadJobs, 30000);
    return () => clearInterval(timer);
  }, [loadJobs]);

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
      setJobs(snapshot);
      setActionError(err.message);
    } finally {
      setPendingJobId(null);
    }
  }

  function changeStatus(job, nextStatus) {
    setMenuJobId(null);
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

  // The card's main button: assign if unassigned, else the most useful next step.
  function primaryAction(job) {
    const nexts = metaNext(job.status);
    if (!job.technician && canDispatch && ASSIGNABLE_STATUSES.includes(job.status)) {
      return { type: "assign" };
    }
    for (const status of ["IN_PROGRESS", "EN_ROUTE", "SCHEDULED", "COMPLETED"]) {
      if (nexts.includes(status)) return { type: "status", status };
    }
    return null;
  }

  // Secondary transitions for the ⋯ menu (excludes the primary + assign/invoice steps).
  function menuActions(job) {
    const primary = primaryAction(job);
    return metaNext(job.status).filter(
      (s) =>
        ACTION_LABELS[s] &&
        !(primary?.type === "status" && primary.status === s) &&
        s !== "ASSIGNED"
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
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
              style={{ width: 220 }}
            />
          </div>
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="form-select form-select-sm"
            style={{ width: 165 }}
            title="Filter by technician"
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
            className="btn btn-sm border bg-white"
            title="Refresh now"
          >
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

      {/* Status tabs — text style with counts */}
      <div className="dsb-tabs mb-3">
        {["all", ...STATUS_COLUMNS].map((key) => {
          const tab = STATUS_META[key.toUpperCase()];
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`dsb-tab ${isActive ? "active" : ""}`}
              title={tab.label}
            >
              <span className="tab-full">{tab.label}</span>
              <span className="tab-short">{tab.short}</span>
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

      {/* Job cards */}
      <div className="d-flex flex-column gap-3">
        {visibleJobs.map((job) => {
          const meta2 = STATUS_META[job.status] || {
            label: job.status.replace("_", " "),
            color: "#64748B",
          };
          const primary = primaryAction(job);
          const menu = menuActions(job);
          return (
            <div
              className="card-min"
              key={job.id}
              onClick={() => setDetailJob(job)}
              role="button"
            >
              {/* Left: job */}
              <div className="cm-left">
                <span className="cm-icon">
                  <i className="bi bi-hammer"></i>
                </span>
                <div>
                  <div className="cm-title">{job.title}</div>
                  <div className="cm-sub">#{job.id.slice(0, 8)}</div>
                </div>
              </div>

              {/* Middle: customer */}
              <div className="cm-mid">
                <div className="cm-value">
                  <i className="bi bi-person me-1"></i>
                  {job.customer?.name}
                </div>
                <div className="cm-sub text-truncate">
                  <i className="bi bi-geo-alt me-1"></i>
                  {job.address}
                </div>
              </div>

              {/* Right: technician + status + actions */}
              <div className="cm-right">
                {job.technician ? (
                  <div className="d-flex align-items-center gap-2">
                    <span className="tech-avatar">
                      {initials(job.technician.name)}
                    </span>
                    <div>
                      <div className="cm-value">{job.technician.name}</div>
                      <div className="cm-status" style={{ color: meta2.color }}>
                        <i className="bi bi-circle-fill"></i>
                        {meta2.label}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="cm-status" style={{ color: meta2.color }}>
                    <i className="bi bi-circle-fill"></i>
                    {meta2.label} · Unassigned
                  </div>
                )}

                <div className="cm-actions" onClick={(e) => e.stopPropagation()}>
                  {primary?.type === "assign" && (
                    <button
                      className="btn-min btn-min-primary"
                      disabled={pendingJobId === job.id}
                      onClick={() => setAssignJob(job)}
                    >
                      Assign
                    </button>
                  )}
                  {primary?.type === "status" && (
                    <button
                      className="btn-min btn-min-primary"
                      disabled={pendingJobId === job.id}
                      onClick={() => changeStatus(job, primary.status)}
                    >
                      {ACTION_LABELS[primary.status].label}
                    </button>
                  )}
                  {menu.length > 0 && (
                    <div className="menu-wrap">
                      <button
                        className="btn-dots"
                        title="More actions"
                        onClick={() => setMenuJobId(menuJobId === job.id ? null : job.id)}
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                      {menuJobId === job.id && (
                        <>
                          <div className="menu-backdrop" onClick={() => setMenuJobId(null)} />
                          <div className="menu-pop">
                            {menu.map((s) => (
                              <button
                                key={s}
                                className={ACTION_LABELS[s].danger ? "menu-danger" : ""}
                                onClick={() => changeStatus(job, s)}
                              >
                                <i className={`bi ${ACTION_LABELS[s].danger ? "bi-x-circle" : "bi-arrow-right-circle"}`}></i>
                                {ACTION_LABELS[s].label}
                              </button>
                            ))}
                            <button onClick={() => { setMenuJobId(null); setDetailJob(job); }}>
                              <i className="bi bi-info-circle"></i>View details
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
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

      {detailJob && (
        <JobDetailsDrawer
          job={jobs.find((j) => j.id === detailJob.id) || detailJob}
          canDispatch={canDispatch}
          pending={pendingJobId === detailJob.id}
          onClose={() => setDetailJob(null)}
          onAssignClick={() => {
            const job = detailJob;
            setDetailJob(null);
            setAssignJob(job);
          }}
          onChangeStatus={(status) => changeStatus(detailJob, status)}
        />
      )}
    </div>
  );
}
