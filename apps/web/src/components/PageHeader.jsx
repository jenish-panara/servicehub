export default function PageHeader({ icon, iconColor = "primary", title, subtitle, actions }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div className="d-flex align-items-center gap-3">
        <div className={`page-icon text-bg-${iconColor} shadow-sm`}>
          <i className={`bi ${icon}`}></i>
        </div>
        <div>
          <h1 className="h4 mb-0 fw-semibold">{title}</h1>
          {subtitle && <div className="text-muted small mt-1">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="d-flex gap-2 align-items-center">{actions}</div>}
    </div>
  );
}
