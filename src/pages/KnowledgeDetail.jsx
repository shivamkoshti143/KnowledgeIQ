import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Star,
  Trash2,
  Calendar,
  Building2,
  Folder,
  FileText,
  Video,
  Layers,
  MessageSquare,
  Send,
  Reply,
  File,
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud
} from "lucide-react";
import { FileCarousel } from "../pages/KnowledgeFeed";
import { request } from "../api/client";
import { BookmarkButton } from "../components/BookmarkButton";
import { EmptyState, PageTitle, StatusBadge } from "../components/UI";
import { getInitials } from "../utils/initials";
import { hasPermission } from "../utils/permissions";
import { LinkifiedText } from "../components/LinkifiedText";

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

export function KnowledgeDetail({
  data,
  session,
  contentType,
  itemId,
  onChange,
  setToast,
  setRoute
}) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [recommended, setRecommended] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);

  const taskItem = (data.tasks || []).find((x) => Number(x.id) === Number(itemId));
  const knowledgeItem = (data.knowledgePosts || []).find((x) => Number(x.id) === Number(itemId));
  const videoItem = (data.videos || []).find((x) => Number(x.id) === Number(itemId));

  let item = null;
  let resolvedContentType = "task";

  if (contentType === "video" && videoItem) {
    item = videoItem;
    resolvedContentType = "video";
  } else if (contentType === "knowledge" && knowledgeItem) {
    item = knowledgeItem;
    resolvedContentType = "knowledge";
  } else if (contentType === "task" && taskItem) {
    item = taskItem;
    resolvedContentType = "task";
  } else if (taskItem) {
    item = taskItem;
    resolvedContentType = "task";
  } else if (knowledgeItem) {
    item = knowledgeItem;
    resolvedContentType = "knowledge";
  } else if (videoItem) {
    item = videoItem;
    resolvedContentType = "video";
  } else {
    item = [data.videos || [], data.knowledgePosts || [], data.tasks || []]
      .flat()
      .find((x) => Number(x.id) === Number(itemId));
    resolvedContentType = item?.videoUrl ? "video" : (contentType || "task");
  }

  const comments =
    resolvedContentType === "video" || resolvedContentType === "knowledge"
      ? []
      : (data.comments || []).filter((comment) => comment[`${resolvedContentType}Id`] === item?.id || comment.taskId === item?.id);

  const roots = comments.filter((comment) => !comment.parentId);

  const isBookmarked = (data.bookmarks || []).some((b) => {
    return b.contentType === resolvedContentType && b.contentId === item?.id;
  });

  useEffect(() => {
    if (item) {
      setRecommended(Boolean(item.isRecommended));
    }
  }, [item?.id, item?.isRecommended]);

  const isUploader = Boolean(session && Number(session.id) === Number(item?.uploaderId));
  const isAdmin = session?.role === "admin";
  const allFiles = item?.files?.length
    ? item.files
    : item?.fileUrl
    ? [{ fileUrl: item.fileUrl, fileExtension: item.fileExtension, approvalStatus: "approved" }]
    : [];
  const visibleFiles = isAdmin || isUploader
    ? allFiles
    : allFiles.filter((f) => f.approvalStatus === "approved");

  useEffect(() => {
    if (!item) return;
    if (item.status !== "approved" && resolvedContentType === "video") return;
    if (resolvedContentType === "video") {
      request(`/videos/${item.id}/view`, { method: "POST" })
        .then(onChange)
        .catch(() => {});
    }
  }, [item?.id, resolvedContentType, item?.status, onChange]);

  async function postComment(event) {
    event.preventDefault();
    if (!body.trim()) return;
    if (resolvedContentType !== "video" && resolvedContentType !== "knowledge") {
      const path = `/tasks/${item.id}/comments`;
      await request(path, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
      setBody("");
      setReplyTo(null);
      await onChange();
      setToast("Discussion updated.");
    }
  }

  async function toggleRecommend() {
    if (!item) return;
    setRecommendLoading(true);
    try {
      const endpoint =
        resolvedContentType === "knowledge"
          ? `/knowledge/${item.id}/recommend`
          : resolvedContentType === "video"
          ? `/videos/${item.id}/recommend`
          : `/tasks/${item.id}/recommend`;
      await request(endpoint, { method: "POST", body: JSON.stringify({ isRecommended: !recommended }) });
      setRecommended(!recommended);
      setToast(recommended ? "Removed from Recommended" : "Added to Recommended");
      onChange?.();
    } catch (error) {
      console.error(error);
      setToast(error.message || "Failed to update recommendation.");
    } finally {
      setRecommendLoading(false);
    }
  }

  const admin = session?.role === "admin";

  async function deleteItem() {
    const reason = admin
      ? window.prompt(`Delete this ${resolvedContentType}? Enter an optional reason for the employee:`, "Content removed by admin")
      : window.confirm(`Delete this ${resolvedContentType}? This cannot be undone.`)
      ? ""
      : null;
    if (reason === null) return;
    try {
      const endpoint =
        resolvedContentType === "knowledge"
          ? `/knowledge/${item.id}`
          : `/${resolvedContentType}s/${item.id}`;
      await request(endpoint, { method: "DELETE", body: JSON.stringify({ reason }) });
      setToast(
        `${resolvedContentType === "knowledge" ? "Knowledge post" : resolvedContentType === "video" ? "Video" : "Task"} deleted.`
      );
      setRoute(
        resolvedContentType === "knowledge"
          ? "knowledge-feed"
          : resolvedContentType === "video"
          ? "browse"
          : "tasks"
      );
      onChange?.();
    } catch (err) {
      setToast(err.message || "Failed to delete content.");
    }
  }

  if (!item) {
    return (
      <div className="table-card" style={{ textAlign: "center", padding: "48px 24px", maxWidth: 580, margin: "40px auto", borderRadius: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: "#ef4444"
          }}
        >
          <Trash2 size={26} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#ef4444" }}>
          Resource not found or deleted
        </h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          This resource is no longer available. It may have been removed or unpublished.
        </p>
        <button className="primary" onClick={() => setRoute("knowledge-feed")}>
          Return to Knowledge Base
        </button>
      </div>
    );
  }

  // Resolving metadata cleanly without undefined
  const authorName = item.uploader?.name || item.uploaderName || "Team Member";
  const departmentName =
    item.department?.name ||
    item.departmentName ||
    (data.departments || []).find((d) => d.id === (item.departmentId || item.department_id))?.name ||
    "";
  const categoryName =
    item.category?.name ||
    item.categoryName ||
    (data.categories || []).find((c) => c.id === (item.categoryId || item.category_id))?.name ||
    "";

  const tags = Array.isArray(item.tags)
    ? item.tags
    : item.tags
    ? String(item.tags).split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const backLabel =
    resolvedContentType === "knowledge"
      ? "Knowledge Base"
      : resolvedContentType === "video"
      ? "Browse"
      : "My Knowledge";

  const backRoute =
    resolvedContentType === "knowledge"
      ? "knowledge-feed"
      : resolvedContentType === "video"
      ? "browse"
      : "tasks";

  return (
    <div className="resource-detail-page">
      {/* Top Action & Back Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setRoute(backRoute)}
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
          <ArrowLeft size={16} /> Back to {backLabel}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BookmarkButton
            contentType={resolvedContentType}
            contentId={item.id}
            initialBookmarked={isBookmarked}
            onToggle={onChange}
          />

          {(admin || hasPermission(session, "knowledge_recommendation")) && (
            <button
              type="button"
              className={`secondary ${recommended ? "active" : ""}`}
              onClick={toggleRecommend}
              disabled={recommendLoading}
              title={recommended ? "Remove from Recommended" : "Add to Recommended"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                background: recommended ? "#eff6ff" : "#ffffff",
                border: recommended ? "1px solid #93c5fd" : "1px solid #cbd5e1",
                color: recommended ? "#2563eb" : "#475569"
              }}
            >
              <Star size={15} style={{ fill: recommended ? "#2563eb" : "none", color: recommended ? "#2563eb" : "currentColor" }} />
              {recommended ? "Recommended" : "Recommend"}
            </button>
          )}

          {(admin || hasPermission(session, "knowledge_base_delete") || item?.uploaderId === session?.id) && (
            <button
              type="button"
              onClick={deleteItem}
              title={`Delete ${resolvedContentType}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                cursor: "pointer"
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
        </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              padding: "3px 10px",
              borderRadius: 6,
              background: "rgba(37, 99, 235, 0.1)",
              color: "#2563eb",
              border: "1px solid rgba(37, 99, 235, 0.2)"
            }}
          >
            {resolvedContentType === "video" ? <Video size={13} /> : resolvedContentType === "knowledge" ? <FileText size={13} /> : <Layers size={13} />}
            <span>{resolvedContentType === "video" ? "Video Resource" : resolvedContentType === "knowledge" ? "Knowledge Post" : "Task Knowledge"}</span>
          </span>

          {categoryName && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 6,
                background: "#f1f5f9",
                color: "#475569"
              }}
            >
              {categoryName}
            </span>
          )}

          <span style={{ marginLeft: "auto" }}>
            <StatusBadge status={item.status || "approved"} />
          </span>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text-primary, #0f172a)",
            margin: "0 0 14px",
            lineHeight: 1.35
          }}
        >
          {item.title}
        </h1>

        {/* Author Metadata Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0
            }}
          >
            {getInitials(authorName)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14, color: "#1e293b" }}>{authorName}</strong>
              {departmentName && (
                <span
                  style={{
                    fontSize: 11.5,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    color: "#64748b",
                    fontWeight: 600
                  }}
                >
                  {departmentName}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
              Published {formatRelativeTime(item.createdAt)} · {new Date(item.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
        {/* Left Column: Description, Media & Discussion */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {/* Description Card */}
          {item.description && (
            <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Description
              </h2>
              <div
                style={{
                  fontSize: 15,
                  color: "#334155",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                <LinkifiedText text={item.description} />
              </div>
            </div>
          )}

          {/* Media / Files Carousel */}
          {(resolvedContentType === "video" || visibleFiles.length > 0) && (
            <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Attached Media & Documents ({visibleFiles.length})
              </h2>
              <FileCarousel
                files={
                  resolvedContentType === "video"
                    ? [{ fileUrl: item.videoUrl, fileExtension: item.fileExtension || "mp4", approvalStatus: "approved" }, ...visibleFiles]
                    : visibleFiles
                }
                contentType={resolvedContentType === "video" ? "video" : "file"}
                title={item.title}
              />
            </div>
          )}

          {/* Discussion & Comments */}
          {resolvedContentType !== "video" && resolvedContentType !== "knowledge" && (
            <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <MessageSquare size={18} style={{ color: "#2563eb" }} />
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", margin: 0 }}>
                  Discussion ({comments.length})
                </h2>
              </div>

              {/* Comment Composer */}
              <form onSubmit={postComment} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
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
                      placeholder={replyTo ? "Write your reply..." : "Ask a question, share feedback, or add context..."}
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

              {/* Comments Tree */}
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
          )}
        </div>

        {/* Right Column: Metadata Details Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="table-card" style={{ padding: "20px 22px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Resource Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Department */}
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Building2 size={13} /> Department
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {departmentName || "All Teams"}
                </strong>
              </div>

              {/* Category */}
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Folder size={13} /> Category
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {categoryName || "General"}
                </strong>
              </div>

              {/* Uploaded */}
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} /> Uploaded Date
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </strong>
              </div>

              {/* Status */}
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} /> Approval Status
                </span>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={item.status || "approved"} />
                </div>
              </div>

              {/* Admin Remarks if rejected */}
              {item.rejectionRemarks && (
                <div style={{ padding: 10, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={13} /> Remarks:
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#991b1b" }}>
                    {item.rejectionRemarks}
                  </p>
                </div>
              )}
            </div>

            {/* Attachments List in Sidebar */}
            {visibleFiles.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "block", marginBottom: 10 }}>
                  Attachments ({visibleFiles.length})
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visibleFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#f8fafc",
                        border: file.approvalStatus === "rejected" ? "1px solid #fecaca" : "1px solid #e2e8f0"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={file.fileName || `File ${idx + 1}`}
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: "#2563eb",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            wordBreak: "break-all"
                          }}
                        >
                          <File size={13} style={{ flexShrink: 0 }} />
                          <span>{file.fileName || (file.fileUrl ? file.fileUrl.split("/").pop() : `File ${idx + 1}`)}</span>
                        </a>
                        {(isAdmin || isUploader) && (
                          <span className={`status-badge ${file.approvalStatus || "pending"}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                            {file.approvalStatus || "pending"}
                          </span>
                        )}
                      </div>

                      {(isAdmin || isUploader) && file.adminRemarks && (
                        <small style={{ color: "#dc2626", fontSize: 11 }}>Remarks: {file.adminRemarks}</small>
                      )}

                      {file.approvalStatus === "rejected" && isUploader && (
                        <ReplacementForm
                          contentType={resolvedContentType}
                          itemId={item.id}
                          fileId={file.id}
                          onReplaced={onChange}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            color: "#2563eb",
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

function ReplacementForm({ contentType, itemId, fileId, onReplaced }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      await request(`/${contentType}s/${itemId}/files/${fileId}/replace`, {
        method: "PUT",
        body: form
      });

      onReplaced();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        accept=".docx,.pdf,.txt,.png,.jpg,.jpeg,.mp4,.webm,.mov"
        required
        style={{ fontSize: 11, flex: 1 }}
      />
      <button
        className="primary"
        type="submit"
        disabled={uploading}
        style={{ padding: "3px 8px", fontSize: 11, borderRadius: 6 }}
      >
        {uploading ? "..." : "Replace"}
      </button>
    </form>
  );
}
