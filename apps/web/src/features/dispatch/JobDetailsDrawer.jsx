import { avatarColor, initials, formatDate } from "../../lib/ui.js";

/**
 * Right-side drawer with full job details. Pure presentation — all actions
 * are passed in from the board so business logic stays in one place.
 */
export default function JobDetailsDrawer({
  job,
  canDispatch,
  pending,
  onClose,
  onAssignClick,
  onChangeStatus,
}) {
  const status = job.status;
  const assignVisible = !job.technician && canDispatch && ["REQUESTED", "SCHEDULED"].includes(status);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div className="fw-semibold" style={{ fontSize: "1rem" }}>
              {job.title}
            </div>
            <div className="cm-sub">#{job.id.slice(0, 8)}</div>
          </div>
          <button onClick={onClose} className="btn-close" title="Close"></button>
        </div>

        <div className="drawer-body">
          <div className="drawer-row">
            <span className="drawer-key">Status</span>
            <span className="drawer-value">
              <span className="cm-status">
                <i className="bi bi-circle-fill" />
                {status.replace("_", " ")}
              </span>
            </span>
          </div>

          <div className="drawer-row">
            <span className="drawer-key">Customer</span>
            <span className="drawer-value">{job.customer?.name || "—"}</span>
          </div>
          <div className="drawer-row">
            <span className="drawer-key">Phone</span>
            <span className="drawer-value">{job.customer?.phone || "—"}</span>
          </div>
          {job.customer?.email && (
            <div className="drawer-row">
              <span className="drawer-key">Email</span>
              <span className="drawer-value">{job.customer.email}</span>
            </div>
          )}
          <div className="drawer-row">
            <span className="drawer-key">Address</span>
            <span className="drawer-value">{job.address}</span>
          </div>

          <div className="drawer-row">
            <span className="drawer-key">Scheduled for</span>
            <span className="drawer-value">
              {job.scheduledFor
                ? `${formatDate(job.scheduledFor)}, ${new Date(job.scheduledFor).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Not scheduled"}
            </span>
          </div>
          <div className="drawer-row">
            <span className="drawer-key">Technician</span>
            <span className="drawer-value">
              {job.technician ? (
                <span className="d-inline-flex align-items-center gap-2">
                  <span
                    className="tech-avatar"
                    style={{ backgroundColor: avatarColor(job.technician.name), width: 26, height: 26, fontSize: "0.6rem" }}
                  >
                    {initials(job.technician.name)}
                  </span>
                  {job.technician.name}
                </span>
              ) : (
                "Unassigned"
              )}
            </span>
          </div>
          {job.completedAt && (
            <div className="drawer-row">
              <span className="drawer-key">Completed at</span>
              <span className="drawer-value">{formatDate(job.completedAt)}</span>
            </div>
          )}
          <div className="drawer-row">
            <span className="drawer-key">Created</span>
            <span className="drawer-value">{formatDate(job.createdAt)}</span>
          </div>

          <div className="drawer-desc">
            <span className="drawer-key">Description</span>
            <p className="cm-sub mb-0 mt-1">{job.description || "No description added."}</p>
          </div>
        </div>

        {assignVisible && (
          <div className="drawer-footer">
            <button className="btn-min btn-min-primary w-100" disabled={pending} onClick={onAssignClick}>
              <i className="bi bi-person-plus me-1"></i>Assign technician
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
