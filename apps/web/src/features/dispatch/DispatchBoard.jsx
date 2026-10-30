import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const STATUS_COLUMNS = ["REQUESTED", "ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED"];

const STATUS_BADGES = {
  REQUESTED: "text-bg-warning",
  ASSIGNED: "text-bg-primary",
  EN_ROUTE: "text-bg-info",
  IN_PROGRESS: "text-bg-secondary",
  COMPLETED: "text-bg-success",
};

export default function DispatchBoard() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/jobs")
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <div className="alert alert-danger m-4">{error}</div>;
  }

  return (
    <div className="container-fluid p-4">
      <h1 className="h5 mb-4">Dispatch board</h1>
      <div className="row g-3">
        {STATUS_COLUMNS.map((status) => {
          const columnJobs = jobs.filter((j) => j.status === status);
          return (
            <div className="col" key={status}>
              <div className="bg-light rounded-3 p-3 h-100 board-column">
                <h2 className="text-uppercase small text-muted fw-semibold">
                  {status.replace("_", " ")} ({columnJobs.length})
                </h2>
                <div className="d-flex flex-column gap-2">
                  {columnJobs.map((job) => (
                    <div className="card shadow-sm" key={job.id}>
                      <div className="card-body p-2">
                        <p className="card-text small fw-medium mb-1">{job.title}</p>
                        <p className="card-text text-muted" style={{ fontSize: "0.75rem" }}>
                          {job.customer?.name}
                        </p>
                        <span className={`badge ${STATUS_BADGES[job.status]}`}>
                          {job.technician ? job.technician.name : "Unassigned"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {columnJobs.length === 0 && (
                    <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                      No jobs
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
