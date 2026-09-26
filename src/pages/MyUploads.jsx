import { useEffect, useState, useMemo } from "react";
import {
  Search,
  FileText,
  Video,
  Layers,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  File,
  X,
  Building2,
  Folder
} from "lucide-react";
import { PageTitle, StatusBadge, EmptyState } from "../components/UI";
import { request } from "../api/client";

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

export function MyUploads({ data, session, onChange, setToast }) {
  const myVideos = useMemo(
    () => (data.myVideos || []).map((v) => ({ ...v, contentType: "video", typeName: "Video" })),
    [data.myVideos]
  );
  const myTasks = useMemo(
    () => (data.myTasks || []).map((t) => ({ ...t, contentType: "task", typeName: "Task Guide" })),
    [data.myTasks]
  );
  const myKnowledge = useMemo(
    () => (data.myKnowledgePosts || []).map((k) => ({ ...k, contentType: "knowledge", typeName: "Knowledge Post" })),
    [data.myKnowledgePosts]
  );

  const allUploads = useMemo(
    () => [...myTasks, ...myKnowledge, ...myVideos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [myTasks, myKnowledge, myVideos]
  );

  const [expandedId, setExpandedId] = useState(null);
  const [replacingFileId, setReplacingFileId] = useState(null);
  const [fileInputs, setFileInputs] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const counts = useMemo(() => {
    return {
      all: allUploads.length,
      approved: allUploads.filter((u) => u.status === "approved" || u.status === "published").length,
      pending: allUploads.filter((u) => u.status === "pending" || u.status === "draft").length,
      rejected: allUploads.filter((u) => {
        const itemRejected = u.status === "rejected";
        const fileRejected = (u.files || []).some((f) => f.approvalStatus === "rejected");
        return itemRejected || fileRejected;
      }).length
    };
  }, [allUploads]);

  const filtered = useMemo(() => {
    return allUploads.filter((item) => {
      // Type Filter
      if (selectedType !== "all" && item.contentType !== selectedType) return false;

      // Status Filter
      if (statusFilter === "approved" && item.status !== "approved" && item.status !== "published") return false;
      if (statusFilter === "pending" && item.status !== "pending" && item.status !== "draft") return false;
      if (statusFilter === "rejected") {
        const itemRejected = item.status === "rejected";
        const fileRejected = (item.files || []).some((f) => f.approvalStatus === "rejected");
        if (!itemRejected && !fileRejected) return false;
      }

      // Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const dept = item.department?.name || item.departmentName || "";
        const cat = item.category?.name || item.categoryName || "";
        const haystack = `${item.title} ${item.description || ""} ${dept} ${cat}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [allUploads, selectedType, statusFilter, search]);

  function toggleExpand(key) {
    setExpandedId((prev) => (prev === key ? null : key));
  }

  async function removeUpload(item) {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      const endpoint =
        item.contentType === "video"
          ? `/videos/${item.id}`
          : item.contentType === "knowledge"
          ? `/knowledge/${item.id}`
          : `/tasks/${item.id}`;
      await request(endpoint, { method: "DELETE" });
      await onChange();
      setToast(`${item.typeName} deleted.`);
    } catch (err) {
      setToast(err.message || "Failed to delete item.");
    }
  }

  async function replaceFile(item, fileId) {
    const input = fileInputs[fileId];
    if (!input || !input.files?.[0]) {
      setToast("Please select a file to upload.");
      return;
    }

    const form = new FormData();
    form.append("file", input.files[0]);

    try {
      const endpoint =
        item.contentType === "knowledge"
          ? `/knowledge/${item.id}/files/${fileId}/replace`
          : `/tasks/${item.id}/files/${fileId}/replace`;

      await request(endpoint, { method: "PUT", body: form });
      setFileInputs((curr) => {
        const next = { ...curr };
        delete next[fileId];
        return next;
      });
      setReplacingFileId(null);
      await onChange();
      setToast("File replaced successfully. Waiting for review.");
    } catch (err) {
      setToast(err.message || "Failed to replace file.");
    }
  }

  return (
    <div className="my-uploads-page">
      <PageTitle
        eyebrow="My Workspace"
        title="My Uploads"
        subtitle="Track approval status, review remarks, and manage supporting attachments for all your submissions."
      />

      {/* Top Search & Filter Card */}
      <div className="table-card" style={{ padding: "18px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div style={{ position: "relative", flex: "1 1 300px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none"
              }}
            />
            <input
              type="text"
              placeholder="Search your uploads by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 36px 10px 40px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: 14,
                outline: "none",
                background: "#ffffff"
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 4
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Content Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Layers size={16} style={{ color: "#64748b" }} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                color: selectedType !== "all" ? "#2563eb" : "#334155",
                outline: "none"
              }}
            >
              <option value="all">All Types</option>
              <option value="task">Task Guides</option>
              <option value="knowledge">Knowledge Posts</option>
              <option value="video">Videos</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: statusFilter === "all" ? "#2563eb" : "#f8fafc",
              color: statusFilter === "all" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>All Uploads</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: statusFilter === "all" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("approved")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "approved" ? "1px solid #16a34a" : "1px solid #e2e8f0",
              background: statusFilter === "approved" ? "#16a34a" : "#f8fafc",
              color: statusFilter === "approved" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Approved</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: statusFilter === "approved" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
              {counts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "pending" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: statusFilter === "pending" ? "#2563eb" : "#f8fafc",
              color: statusFilter === "pending" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Pending Review</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: statusFilter === "pending" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
              {counts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("rejected")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "rejected" ? "1px solid #dc2626" : "1px solid #e2e8f0",
              background: statusFilter === "rejected" ? "#dc2626" : "#f8fafc",
              color: statusFilter === "rejected" ? "#ffffff" : "#475569",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Needs Revision / Rejected</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: statusFilter === "rejected" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
              {counts.rejected}
            </span>
          </button>
        </div>
      </div>

      {/* Uploads List Feed */}
      {filtered.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState title="No uploads found matching your filter criteria." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((item) => {
            const key = `${item.contentType}-${item.id}`;
            const isExpanded = expandedId === key;
            const files = item.files || [];
            const rejectedFiles = files.filter((f) => f.approvalStatus === "rejected");
            const hasRejectedFiles = rejectedFiles.length > 0;
            const deptName = item.department?.name || item.departmentName || "";
            const catName = item.category?.name || item.categoryName || "";

            return (
              <article
                key={key}
                className="table-card"
                style={{
                  padding: "20px 24px",
                  borderRadius: 14,
                  border: hasRejectedFiles
                    ? "1px solid rgba(239, 68, 68, 0.3)"
                    : "1px solid rgba(0, 0, 0, 0.08)",
                  background: hasRejectedFiles
                    ? "linear-gradient(180deg, #ffffff 0%, #fffbfb 100%)"
                    : "#ffffff",
                  transition: "all 0.15s ease"
                }}
              >
                {/* Top Row: Type Badge, Category, Status Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: item.contentType === "video" ? "rgba(14, 165, 233, 0.1)" : "rgba(37, 99, 235, 0.1)",
                        color: item.contentType === "video" ? "#0284c7" : "#2563eb"
                      }}
                    >
                      {item.contentType === "video" ? <Video size={12} /> : item.contentType === "knowledge" ? <FileText size={12} /> : <Layers size={12} />}
                      <span>{item.typeName}</span>
                    </span>

                    {catName && (
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>
                        {catName}
                      </span>
                    )}

                    {deptName && (
                      <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                        · {deptName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={item.status || "pending"} />
                    {hasRejectedFiles && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#fee2e2",
                          color: "#dc2626"
                        }}
                      >
                        {rejectedFiles.length} file{rejectedFiles.length > 1 ? "s" : ""} rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", lineHeight: 1.4 }}>
                  {item.title}
                </h3>

                {/* Description */}
                {item.description && (
                  <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                )}

                {/* Overall Remarks Banner if Rejected */}
                {item.rejectionRemarks && (
                  <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "#991b1b" }}>
                      <strong>Remarks:</strong> {item.rejectionRemarks}
                    </span>
                  </div>
                )}

                {/* Card Footer: Date, Files Toggle, Delete */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    Uploaded {formatRelativeTime(item.createdAt)}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {files.length > 0 && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => toggleExpand(key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          borderRadius: 8
                        }}
                      >
                        <File size={13} />
                        <span>Files ({files.length})</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}

                    {(session.role === "admin" || item.status === "pending" || item.status === "draft") && (
                      <button
                        type="button"
                        onClick={() => removeUpload(item)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "5px 10px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Files Drawer */}
                {isExpanded && files.length > 0 && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Attached Files ({files.length})
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {files.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            padding: "10px 12px",
                            borderRadius: 8,
                            background: "#ffffff",
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
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#2563eb",
                                textDecoration: "none",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                wordBreak: "break-all"
                              }}
                            >
                              <File size={14} style={{ flexShrink: 0 }} />
                              <span>{file.fileName || (file.fileUrl ? file.fileUrl.split("/").pop() : `File ${idx + 1}`)}</span>
                            </a>
                            <span className={`status-badge ${file.approvalStatus || "pending"}`} style={{ fontSize: 10.5, padding: "1px 6px" }}>
                              {file.approvalStatus || "pending"}
                            </span>
                          </div>

                          {file.adminRemarks && (
                            <small style={{ color: "#dc2626", fontSize: 11.5 }}>
                              <strong>Feedback:</strong> {file.adminRemarks}
                            </small>
                          )}

                          {file.approvalStatus === "rejected" && session.role !== "admin" && (
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #fecaca" }}>
                              {replacingFileId === file.id ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <input
                                    type="file"
                                    onChange={(e) => setFileInputs((curr) => ({ ...curr, [file.id]: e.target }))}
                                    accept=".docx,.pdf,.txt,.png,.jpg,.jpeg,.mp4,.webm,.mov"
                                    style={{ fontSize: 12 }}
                                  />
                                  <button
                                    type="button"
                                    className="primary"
                                    onClick={() => replaceFile(item, file.id)}
                                    style={{ padding: "4px 10px", fontSize: 12 }}
                                  >
                                    Upload Replacement
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => setReplacingFileId(null)}
                                    style={{ padding: "4px 10px", fontSize: 12 }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => setReplacingFileId(file.id)}
                                  style={{ padding: "4px 10px", fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 4 }}
                                >
                                  <Upload size={12} /> Replace Rejected File
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
