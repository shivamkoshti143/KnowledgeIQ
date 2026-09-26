import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Folder,
  CheckCircle2,
  AlertCircle,
  File,
  MessageSquare,
  Send,
  Reply
} from "lucide-react";
import { request } from "../api/client";
import { EmptyState, StatusBadge } from "../components/UI";
import { getInitials } from "../utils/initials";
import { LinkifiedText } from "../components/LinkifiedText";

export function TaskDetail({ data, session, taskId, onChange, setToast, setRoute }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const task = (data.tasks || []).find((item) => item.id === taskId);
  const comments = (data.comments || []).filter((comment) => comment.taskId === task?.id);
  const roots = comments.filter((comment) => !comment.parentId);

  async function postComment(event) {
    event.preventDefault();
    if (!body.trim()) return;
    await request(`/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: replyTo }) });
    setBody("");
    setReplyTo(null);
    await onChange();
    setToast("Discussion updated.");
  }

  if (!task) return <EmptyState title="Task not found" />;

  const authorName = task.uploader?.name || task.uploaderName || "Team Member";
  const departmentName = task.department?.name || task.departmentName || (data.departments || []).find((d) => d.id === task.departmentId)?.name || "All Teams";
  const categoryName = task.category?.name || task.categoryName || (data.categories || []).find((c) => c.id === task.categoryId)?.name || "General";
  const isUploader = Boolean(session && Number(session.id) === Number(task.uploaderId));
  const isAdmin = session?.role === "admin";
  const allFiles = task.files || [];
  const visibleFiles = isAdmin || isUploader
    ? allFiles
    : allFiles.filter((f) => f.approvalStatus === "approved");

  return (
    <div className="task-detail-page">
      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setRoute("tasks")}
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
          <ArrowLeft size={16} /> Back to My Knowledge
        </button>
      </div>

      {/* Header Card */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
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
          <StatusBadge status={task.status || "pending"} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 14px" }}>
          {task.title}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
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
              Submitted on {new Date(task.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          {task.description && (
            <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#334155", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Description
              </h2>
              <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                <LinkifiedText text={task.description} />
              </div>
            </div>
          )}

          {/* Discussion */}
          <div className="table-card" style={{ padding: "24px 28px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <MessageSquare size={18} style={{ color: "#2563eb" }} />
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
              Task Details
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
                  <Calendar size={13} /> Submitted Date
                </span>
                <strong style={{ fontSize: 13.5, color: "#334155", display: "block", marginTop: 2 }}>
                  {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={13} /> Status
                </span>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={task.status || "pending"} />
                </div>
              </div>

              {task.rejectionRemarks && (
                <div style={{ padding: 10, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={13} /> Remarks:
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#991b1b" }}>
                    {task.rejectionRemarks}
                  </p>
                </div>
              )}
            </div>

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
                          contentType="task"
                          itemId={task.id}
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
