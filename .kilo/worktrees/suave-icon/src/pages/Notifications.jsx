import { Bell, CheckCheck, Clock3 } from "lucide-react";
import { request } from "../api/client";
import { EmptyState, PageTitle } from "../components/UI";

export function Notifications({ data, onChange }) {
  const notifications = data.notifications || [];
  const unread = notifications.filter((note) => !note.readAt);
  const read = notifications.filter((note) => note.readAt);

  async function markAllRead() {
    await request("/notifications/read", { method: "POST" });
    await onChange();
  }

  return (
    <>
      <PageTitle
        eyebrow="Activity Center"
        title="Notifications"
        subtitle="Stay updated on approvals, replies, and activity across the knowledge portal."
        actions={notifications.length ? <button onClick={markAllRead}><CheckCheck size={15} /> Mark all as read</button> : null}
        stats={[
          { label: "Total", value: notifications.length },
          { label: "Unread", value: unread.length },
          { label: "Read", value: read.length }
        ]}
      />

      <div className="notification-layout">
        <section className="table-card">
          <div className="section-heading">
            <h2>Unread Notifications</h2>
          </div>
          {!unread.length ? (
            <EmptyState title="No unread notifications." />
          ) : (
            <div className="notification-list">
              {unread.map((note) => (
                <article className="notification-card unread" key={note.id}>
                  <div className="notification-icon">
                    <Bell size={18} />
                  </div>
                  <div className="notification-copy">
                    <strong>{note.message}</strong>
                    <p>{formatDate(note.createdAt)}</p>
                  </div>
                  <span className="notification-pill">Unread</span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="table-card">
          <div className="section-heading">
            <h2>Read Notifications</h2>
          </div>
          {!read.length ? (
            <EmptyState title="No read notifications yet." />
          ) : (
            <div className="notification-list">
              {read.map((note) => (
                <article className="notification-card" key={note.id}>
                  <div className="notification-icon muted">
                    <Clock3 size={18} />
                  </div>
                  <div className="notification-copy">
                    <strong>{note.message}</strong>
                    <p>{formatDate(note.createdAt)}</p>
                  </div>
                  <span className="notification-pill subtle">Read</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}
