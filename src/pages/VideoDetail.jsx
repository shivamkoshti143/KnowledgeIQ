import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Folder,
  Eye,
  MessageSquare,
  Send,
  Reply,
  Video,
  CheckCircle2
} from "lucide-react";
import { request } from "../api/client";
import { EmptyState, StatusBadge } from "../components/UI";
import { BookmarkButton } from "../components/BookmarkButton";
import { getInitials } from "../utils/initials";
import { LinkifiedText } from "../components/LinkifiedText";

const demoVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export function VideoDetail({ data, session, videoId, onChange, setToast, setRoute }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const video =
    (data.videos || []).find((item) => item.id === videoId) ||
    (data.videos || []).find((item) => item.status === "approved");

  const comments = (data.comments || []).filter((comment) => comment.videoId === video?.id);
  const roots = comments.filter((comment) => !comment.parentId);

  useEffect(() => {
    if (video?.status === "approved") {
      request(`/videos/${video.id}/view`, { method: "POST" })
        .then(onChange)
        .catch(() => {});
    }
  }, [video?.id]);

  async function postComment(event) {
    event.preventDefault();
    if (!body.trim()) return;
    await request(`/videos/${video.id}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
    setBody("");
    setReplyTo(null);
    await onChange();
    setToast("Discussion updated.");
  }

  if (!video) return <EmptyState title="No video selected" />;

  const authorName = video.uploader?.name || video.uploaderName || "Team Member";
  const departmentName = video.department?.name || video.departmentName || (data.departments || []).find((d) => d.id === video.departmentId)?.name || "All Teams";
  const categoryName = video.category?.name || video.categoryName || (data.categories || []).find((c) => c.id === video.categoryId)?.name || "General";
  const tags = Array.isArray(video.tags) ? video.tags : (video.tags ? String(video.tags).split(",").map((t) => t.trim()).filter(Boolean) : []);

  const isBookmarked = (data.bookmarks || []).some(
    (b) => b.contentType === "video" && b.contentId === video.id
  );

  return (
    <div className="video-detail-page">
      {/* Top Action & Back Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => (setRoute ? setRoute("browse") : history.back())}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
          }}
        >
          <ArrowLeft size={16} /> Back to Browse
        </button>

        <BookmarkButton
          contentType="video"
          contentId={video.id}
          initialBookmarked={isBookmarked}
          onToggle={onChange}
        />
      </div>

      {/* Hero Header Card */}
      <div
        className="table-card"
        style={{
          padding: "24px 28px",
          borderRadius: 16,
          marginBottom: 24,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(14, 165, 233, 0.1)",
                color: "#0284c7",
                border: "1px solid rgba(14, 165, 233, 0.2)"
              }}
            >
              <Video size={13} /> Video Guide
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>
              {categoryName}
            </span>
          </div>

          <StatusBadge status={video.status || "approved"} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 14px" }}>
          {video.title}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14
            }}
          >
            {getInitials(authorName)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14, color: "#1e293b" }}>{authorName}</strong>
              <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#64748b", fontWeight: 600 }}>
                {departmentName}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
              Uploaded {new Date(video.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {video.viewCount?.toLocaleString() || 0} views
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {/* Video Player Card */}
          <div className="table-card" style={{ padding: 16, borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", overflow: "hidden" }}>
            <video
              controls
              src={video.videoUrl || demoVideo}
              style={{ width: "100%", maxHeight: 460, borderRadius: 12, background: "#000000" }}
            />
          </div>

          {/* Description */}
          {video.description && (
            <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Video Notes & Overview
              </h2>
              <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                <LinkifiedText text={video.description} />
              </div>
            </div>
          )}

          {/* Discussion */}
          <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <MessageSquare size={18} style={{ color: "#0ea5e9" }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                Discussion ({comments.length})
              </h2>
            </div>

            <form onSubmit={postComment} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0
                  }}
                >
                  {getInitials(session?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={replyTo ? "Write your reply..." : "Ask a question about this video guide..."}
                    rows={3}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      outline: "none",
                      resize: "vertical",
                      background: "#f8fafc",
                      lineHeight: 1.5
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                    {replyTo && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setReplyTo(null)}
                        style={{ padding: "6px 14px", fontSize: 13 }}
                      >
                        Cancel Reply
                      </button>
                    )}
                    <button
                      type="submit"
                      className="primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", fontSize: 13 }}
                    >
                      <Send size={14} /> Post
                    </button>
                  </div>
                </div>
              </div>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {roots.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13.5 }}>
                  No comments yet. Start the conversation above!
                </div>
              ) : (
                roots.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    comments={comments}
                    users={data.users || []}
                    reply={(id) => setReplyTo(id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="table-card" style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Video Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Building2 size={13} /> Department
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {departmentName}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Folder size={13} /> Category
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {categoryName}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} /> Uploaded Date
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Eye size={13} /> Total Views
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {video.viewCount?.toLocaleString() || 0}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} /> Approval Status
                </span>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={video.status || "approved"} />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CommentItem({ comment, comments, users, reply }) {
  const user = users.find((item) => item.id === comment.userId);
  const children = comments.filter((item) => item.parentId === comment.id);

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 12,
        background: "#f8fafc",
        border: "1px solid #e2e8f0"
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #64748b, #475569)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0
        }}
      >
        {getInitials(user?.name)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <strong style={{ fontSize: 13.5, color: "#1e293b" }}>{user?.name || "Team Member"}</strong>
          <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{new Date(comment.createdAt).toLocaleString()}</span>
        </div>
        <p style={{ margin: "0 0 6px", fontSize: 13.5, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          <LinkifiedText text={comment.body} />
        </p>
        <button
          type="button"
          onClick={() => reply(comment.id)}
          style={{
            background: "none",
            border: "none",
            color: "#0ea5e9",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
        >
          <Reply size={12} /> Reply
        </button>

        {children.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, paddingLeft: 12, borderLeft: "2px solid #cbd5e1" }}>
            {children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                comments={comments}
                users={users}
                reply={reply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
