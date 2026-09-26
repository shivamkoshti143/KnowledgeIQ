import { useEffect } from "react";

export function PageTitle({ title, subtitle, eyebrow, actions, stats }) {
  return (
    <section className="page-hero">
      <div className="page-hero-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <div className="page-title">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {stats?.length ? (
          <div className="hero-stats">
            {stats.map((item) => (
              <div className="hero-stat" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {actions ? <div className="page-hero-actions">{actions}</div> : null}
    </section>
  );
}

export function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`status ${status}`}>{status}</span>;
}

export function EmptyState({ title }) {
  return <div className="empty-state">{title}</div>;
}

export function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className="toast">{message}</div>;
}

export function TableRow({ title, subtitle, actions, badge }) {
  return (
    <div className="data-row">
      <div className="data-row-main">
        <div className="data-row-text">
          <strong>{title}</strong>
          <p>{subtitle}</p>
        </div>
        {badge}
      </div>
      {actions && <div className="data-row-actions">{actions}</div>}
    </div>
  );
}
