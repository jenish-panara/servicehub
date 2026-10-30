import { useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { initials, formatDate } from "../../lib/ui.js";

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
  onChanged,
}) {
  const status = job.status;
  const assignVisible = !job.technician && canDispatch && ["REQUESTED", "SCHEDULED"].includes(status);

  const [photoKind, setPhotoKind] = useState("after");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const fileRef = useRef(null);

  async function uploadPhoto(file) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("kind", photoKind);
      await api(`/jobs/${job.id}/photos`, { method: "POST", body: form });
      if (fileRef.current) fileRef.current.value = "";
      onChanged?.();
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function deletePhoto(photo) {
    setPhotoError(null);
    try {
      await api(`/jobs/${job.id}/photos/${photo.id}`, { method: "DELETE" });
      onChanged?.();
    } catch (err) {
      setPhotoError(err.message);
    }
  }

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
                  <span className="tech-avatar">
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

          {/* Photos */}
          <div className="mt-3 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
            <span className="drawer-key">Photos</span>
            {photoError && <div className="alert alert-danger py-1 px-2 small mt-2 mb-0">{photoError}</div>}

            {job.photos?.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {job.photos.map((photo) => (
                  <div className="position-relative" key={photo.id}>
                    <a href={photo.url} target="_blank" rel="noreferrer" title="Open full size">
                      <img
                        src={photo.url}
                        alt={`${photo.kind} photo`}
                        className="photo-thumb"
                      />
                    </a>
                    <span className={`photo-kind ${photo.kind === "before" ? "photo-kind-before" : ""}`}>
                      {photo.kind}
                    </span>
                    {canDispatch && (
                      <button
                        className="photo-del"
                        title="Delete photo"
                        onClick={() => deletePhoto(photo)}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="cm-sub mb-0 mt-1">No photos yet.</p>
            )}

            <div className="d-flex align-items-center gap-2 mt-2">
              <select
                value={photoKind}
                onChange={(e) => setPhotoKind(e.target.value)}
                className="form-select form-select-sm"
                style={{ width: 110 }}
                title="Photo type"
              >
                <option value="after">After</option>
                <option value="before">Before</option>
              </select>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="form-control form-control-sm"
                style={{ width: 200 }}
                onChange={(e) => uploadPhoto(e.target.files[0])}
                disabled={photoBusy}
              />
              {photoBusy && <div className="spinner-border spinner-border-sm text-primary"></div>}
            </div>
            <p className="cm-sub mt-1 mb-0" style={{ fontSize: "0.68rem" }}>
              JPG/PNG up to 5MB — stored on Cloudinary.
            </p>
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
