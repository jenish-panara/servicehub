import { useMemo, useState } from "react";
import { initials } from "../../lib/ui.js";

/**
 * Assignment wizard: pick a technician for a job, filtered by name,
 * skill and zone/location. Reads from the same technician list the
 * board got from /jobs/meta.
 */
export default function AssignModal({ job, technicians, busy, onClose, onAssign }) {
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("all");
  const [zone, setZone] = useState("all");

  const skills = useMemo(
    () => [...new Set(technicians.flatMap((t) => t.skills))].sort(),
    [technicians]
  );
  const zones = useMemo(
    () => [...new Set(technicians.map((t) => t.zone).filter(Boolean))].sort(),
    [technicians]
  );

  const matches = technicians.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (skill === "all" || t.skills.includes(skill)) &&
      (zone === "all" || t.zone === zone)
  );

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content shadow">
            <div className="modal-header">
              <div>
                <h5 className="modal-title fs-6">
                  Assign technician
                  <span className="badge text-bg-primary ms-2" style={{ fontSize: "0.7rem" }}>
                    {job.title}
                  </span>
                </h5>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  {job.customer?.name} · {job.address}
                </div>
              </div>
              <button type="button" onClick={onClose} className="btn-close"></button>
            </div>

            {/* Filters */}
            <div className="px-3 pt-3 pb-2 border-bottom bg-light">
              <div className="row g-2">
                <div className="col-12 col-md-5">
                  <div className="position-relative">
                    <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name…"
                      className="form-control form-control-sm ps-5"
                    />
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="all">All skills</option>
                    {skills.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-3">
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="form-select form-select-sm"
                  >
                    <option value="all">All locations</option>
                    {zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Technician list */}
            <div className="modal-body p-3" style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {matches.length === 0 && (
                <div className="text-center py-4">
                  <i className="bi bi-person-x fs-1 text-secondary"></i>
                  <p className="text-muted mt-2 mb-0 small">
                    No technicians match these filters.
                  </p>
                </div>
              )}
              <div className="list-group list-group-flush">
                {matches.map((tech) => (
                  <div
                    key={tech.id}
                    className="list-group-item px-2 py-3 d-flex align-items-center gap-3 assign-row"
                  >
                    <span className="avatar">
                      {initials(tech.name)}
                    </span>
                    <div className="flex-grow-1">
                      <div className="fw-medium">{tech.name}</div>
                      <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                        {tech.skills.map((s) => (
                          <span key={s} className="skill-chip">
                            {s}
                          </span>
                        ))}
                        {tech.zone && (
                          <span className="text-muted ms-1" style={{ fontSize: "0.75rem" }}>
                            <i className="bi bi-geo-alt me-1"></i>
                            {tech.zone}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onAssign(tech.id)}
                      disabled={busy}
                      className="btn btn-primary btn-sm"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
