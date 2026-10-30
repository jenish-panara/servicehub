import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { initials, formatDate } from "../../lib/ui.js";
import PageHeader from "../../components/PageHeader.jsx";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // null | {mode:'create'} | {mode:'edit', customer}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
        .then(setCustomers)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function onSave(form) {
    setBusy(true);
    setError(null);
    try {
      const method = modal.mode === "edit" ? "PUT" : "POST";
      const path = modal.mode === "edit" ? `/customers/${modal.customer.id}` : "/customers";
      await api(path, { method, body: JSON.stringify(form) });
      setModal(null);
      const refreshed = await api(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setCustomers(refreshed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        icon="bi-people"
        title="Customers"
        subtitle={`${customers.length} ${customers.length === 1 ? "customer" : "customers"} in your workspace`}
        actions={
          <>
            <div className="position-relative">
              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="form-control form-control-sm ps-5"
                style={{ width: 220 }}
              />
            </div>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="btn btn-primary btn-sm d-flex align-items-center gap-1"
            >
              <i className="bi bi-plus-lg"></i>Add customer
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
                <th className="ps-4">Customer</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Added</th>
                <th className="text-end pe-4"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-2">
                      <span className="avatar">
                        {initials(customer.name)}
                      </span>
                      <div>
                        <div className="fw-medium">{customer.name}</div>
                        {customer.email && (
                          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-muted">{customer.phone}</td>
                  <td className="text-muted" style={{ maxWidth: 280 }}>
                    <div className="text-truncate">{customer.address}</div>
                  </td>
                  <td className="text-muted small">{formatDate(customer.createdAt)}</td>
                  <td className="text-end pe-4">
                    <button
                      onClick={() => setModal({ mode: "edit", customer })}
                      className="btn btn-light btn-sm border"
                      title="Edit"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="text-center text-muted py-4">Loading…</div>}
        {!loading && customers.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-people fs-1 text-secondary"></i>
            <p className="text-muted mt-2 mb-3">
              {search ? "No customers match your search." : "No customers yet."}
            </p>
            {!search && (
              <button
                onClick={() => setModal({ mode: "create" })}
                className="btn btn-outline-primary btn-sm"
              >
                Add your first customer
              </button>
            )}
          </div>
        )}
      </div>

      {modal && (
        <FormModal
          key={modal.customer?.id || "new"}
          title={modal.mode === "edit" ? `Edit ${modal.customer.name}` : "Add customer"}
          initial={modal.customer || EMPTY_FORM}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={onSave}
          fields={[
            { key: "name", label: "Full name", required: true, placeholder: "e.g. Asha Sharma" },
            { key: "phone", label: "Phone", required: true, placeholder: "+91-…" },
            { key: "email", label: "Email (optional)", type: "email" },
            { key: "address", label: "Address", required: true, placeholder: "Street, area, city" },
          ]}
        />
      )}
    </div>
  );
}

export function FormModal({ title, fields, initial, busy, error, onClose, onSave }) {
  const [form, setForm] = useState(initial);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1} onClick={onClose}>
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <form className="modal-content shadow" onSubmit={onSubmit}>
            <div className="modal-header">
              <h5 className="modal-title fs-6">{title}</h5>
              <button type="button" onClick={onClose} className="btn-close"></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {fields.map((field) => (
                <div className="mb-3" key={field.key}>
                  <label className="form-label small fw-medium mb-1">{field.label}</label>
                  <input
                    type={field.type || "text"}
                    value={form[field.key] || ""}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="form-control form-control-sm"
                  />
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-light btn-sm border">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
