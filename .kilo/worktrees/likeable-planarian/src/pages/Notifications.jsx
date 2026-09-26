import { useEffect, useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Video,
  Layers,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import { request } from "../api/client";
import { EmptyState, PageTitle } from "../components/UI";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Notifications({ data, onChange, openItem, setRoute, session }) {
  const notifications = useMemo(() => data.notifications || [], [data.notifications]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const hasUnread = notifications.some((note) => !note.readAt);
    if (hasUnread) {
      request("/notifications/read", { method: "POST" })
        .then(() => onChange?.())
        .catch(() => {});
    }
  }, []);

  async function markAllRead() {
    await request("/notifications/read", { method: "POST" });
    await onChange?.();
  }

  function handleNotificationClick(note) {
    if (!note) return;

    // If unread, mark read in background
    if (!note.readAt) {
      request("/notifications/read", { method: "POST" })
        .then(() => onChange?.())
        .catch(() => {});
    }

    const isAdmin = session?.role === "admin";
    const canApprove =
      isAdmin ||
      (session?.permissions || []).some((p) =>
        ["approvals_parent", "task_approval", "task_reapproval"].includes(p)
      );

    // 1. Admin/Approver notifications for pending submissions & re-approvals
    if (
      canApprove &&
      (note.type === "task_submission" ||
        note.type === "video_submission" ||
        note.type === "file_replaced" ||
        note.message?.toLowerCase().includes("awaiting re-approval") ||
        note.message?.toLowerCase().includes("submitted for review"))
    ) {
      if (setRoute) {
        setRoute("approvals");
        return;
      }
    }

    // 2. Video notifications with videoId
    if (note.videoId) {
      if (openItem) {
        openItem(note.videoId, "video");
        return;
      }
    }

    // 3. Task or Knowledge notifications with taskId
    if (note.taskId) {
      const taskIdNum = Number(note.taskId);
      const isTask = (data.tasks || []).some((t) => t.id === taskIdNum);
      const isKnowledge = (data.knowledgePosts || []).some((k) => k.id === taskIdNum);
      const isVideo = (data.videos || []).some((v) => v.id === taskIdNum);

      if (openItem) {
        if (isTask) {
          openItem(taskIdNum, "task");
          return;
        }
        if (isKnowledge) {
          openItem(taskIdNum, "knowledge");
          return;
        }
        if (isVideo) {
          openItem(taskIdNum, "video");
          return;
        }

        // Hint from notification type
        if (note.type?.includes("knowledge")) {
          openItem(taskIdNum, "knowledge");
        } else if (note.type?.includes("video")) {
          openItem(taskIdNum, "video");
        } else {
          openItem(taskIdNum, "task");
        }
        return;
      }
    }

    // 4. Comment / Discussion Replies without explicit ID
    if (note.type === "reply" || note.type === "comment" || note.type === "comment_reply") {
      if (setRoute) {
        setRoute("knowledge-feed");
        return;
      }
    }

    // 5. User role or profile updates
    if (note.type === "role_assigned" || note.type === "role_updated") {
      if (setRoute) {
        setRoute(isAdmin ? "role-assign" : "home");
        return;
      }
    }

    // 6. Content removed
    if (note.type === "content_removed") {
      if (setRoute) {
        setRoute("tasks");
        return;
      }
    }

    // Fallback: general knowledge page or home
    if (setRoute) {
      if (note.type?.includes("task")) {
        setRoute("tasks");
      } else if (note.type?.includes("knowledge") || note.type?.includes("video")) {
        setRoute("knowledge-feed");
      } else {
        setRoute(isAdmin ? "admin" : "home");
      }
    }
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.readAt);
    if (filter === "approvals") {
      return notifications.filter((n) =>
        ["task_approved", "task_rejected", "file_rejected", "file_replaced", "knowledge_approved", "knowledge_rejected"].includes(n.type)
      );
    }
    return notifications;
  }, [notifications, filter]);

  function getNotificationIcon(type) {
    if (type?.includes("approved")) {
      return <CheckCircle2 size={18} style={{ color: "#16a34a" }} />;
    }
    if (type?.includes("rejected")) {
      return <XCircle size={18} style={{ color: "#dc2626" }} />;
    }
    if (type?.includes("comment") || type?.includes("reply")) {
      return <MessageSquare size={18} style={{ color: "#2563eb" }} />;
    }
    return <Bell size={18} style={{ color: "#2563eb" }} />;
  }

  return (
    <div className="notifications-page" style={{ maxWidth: 840, margin: "0 auto" }}>
      <PageTitle
        eyebrow="Activity Center"
        title="Notifications"
        subtitle="Stay updated on submission approvals, admin reviews, and replies across the knowledge portal."
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              className="secondary"
              onClick={markAllRead}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600 }}
            >
              <CheckCheck size={16} /> Mark all as read
            </button>
          ) : null
        }
      />

      {/* Filter Tabs */}
      <div className="table-card" style={{ padding: "14px 18px", marginBottom: 20, display: "flex", gap: 8, overflowX: "auto" }}>
        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
            border: filter === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
            background: filter === "all" ? "#2563eb" : "#f8fafc",
            color: filter === "all" ? "#ffffff" : "#475569",
            cursor: "pointer"
          }}
        >
          All Notifications ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("approvals")}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 700,
            border: filter === "approvals" ? "1px solid #2563eb" : "1px solid #e2e8f0",
            background: filter === "approvals" ? "#2563eb" : "#f8fafc",
            color: filter === "approvals" ? "#ffffff" : "#475569",
            cursor: "pointer"
          }}
        >
          Approvals & Reviews
        </button>
      </div>

      {/* Notifications Feed */}
      {filtered.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState title="No notifications to show." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((note) => {
            const isUnread = !note.readAt;
            return (
              <article
                key={note.id}
                className="table-card"
                onClick={() => handleNotificationClick(note)}
                title="Click to view details"
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: isUnread ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid rgba(0,0,0,0.07)",
                  background: isUnread ? "linear-gradient(180deg, #ffffff 0%, #f8faff 100%)" : "#ffffff",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.08)";
                  e.currentTarget.style.borderColor = "#93c5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
                  e.currentTarget.style.borderColor = isUnread ? "rgba(37, 99, 235, 0.3)" : "rgba(0,0,0,0.07)";
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isUnread ? "#eff6ff" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {getNotificationIcon(note.type)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 14, color: "#1e293b", lineHeight: 1.5, fontWeight: isUnread ? 700 : 500 }}>
                    {note.message}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                    <Clock size={12} />
                    <span>{formatRelativeTime(note.createdAt)}</span>
                    <span>·</span>
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {isUnread && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#2563eb",
                      flexShrink: 0
                    }}
                  />
                )}

                <ChevronRight size={18} style={{ color: "#94a3b8", flexShrink: 0, opacity: 0.7 }} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
