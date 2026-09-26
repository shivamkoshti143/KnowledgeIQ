import { useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  Video,
  Layers,
  Star,
  Trash2,
  ChevronDown,
  ChevronUp,
  File,
  Search,
  CheckCheck,
  AlertCircle,
  ExternalLink,
  Building2,
  X
} from "lucide-react";
import { request } from "../api/client";
import { PageTitle, EmptyState, StatusBadge } from "../components/UI";
import { hasPermission } from "../utils/permissions";
import { getInitials } from "../utils/initials";
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

export function Approvals({ data, onChange, setToast, openItem, session }) {
  const canApprove = session?.role === "admin" || hasPermission(session, ["task_approval", "dashboard"]);
  const canReApprove = session?.role === "admin" || hasPermission(session, ["task_reapproval", "dashboard"]);
  const canRecommend = session?.role === "admin" || hasPermission(session, "knowledge_recommendation");
  const canDelete = session?.role === "admin" || hasPermission(session, "knowledge_base_delete");

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [fileRemarks, setFileRemarks] = useState({});

  // Pending Submissions
  const pendingTasks = useMemo(
    () => (data.tasks || []).filter((task) => task.status === "pending").map((t) => ({ ...t, contentType: "task", typeName: "Task Guide" })),
    [data.tasks]
  );
  const pendingKnowledge = useMemo(
    () => (data.knowledgePosts || []).filter((post) => post.status === "pending").map((k) => ({ ...k, contentType: "knowledge", typeName: "Knowledge Post" })),
    [data.knowledgePosts]
  );

  // Re-approval items (has files pending approval while the post itself is already approved)
  const reApprovalTasks = useMemo(
    () =>
      (data.tasks || [])
        .filter((task) => task.status !== "pending" && (task.files || []).some((file) => file.approvalStatus === "pending"))
        .map((task) => {
          const pendingFiles = (task.files || []).filter((f) => f.approvalStatus === "pending");
          return {
            ...task,
            contentType: "task",
            typeName: "Task Guide",
            _isReApproval: true,
            _pendingFilesCount: pendingFiles.length
          };
        }),
    [data.tasks]
  );
  const reApprovalKnowledge = useMemo(
    () =>
      (data.knowledgePosts || [])
        .filter((post) => post.status !== "pending" && (post.files || []).some((file) => file.approvalStatus === "pending"))
        .map((post) => {
          const pendingFiles = (post.files || []).filter((f) => f.approvalStatus === "pending");
          return {
            ...post,
            contentType: "knowledge",
            typeName: "Knowledge Post",
            _isReApproval: true,
            _pendingFilesCount: pendingFiles.length
          };
        }),
    [data.knowledgePosts]
  );

  const pendingSubmissions = useMemo(() => [...pendingTasks, ...pendingKnowledge], [pendingTasks, pendingKnowledge]);
  const reApprovals = useMemo(() => [...reApprovalTasks, ...reApprovalKnowledge], [reApprovalTasks, reApprovalKnowledge]);
  const allItems = useMemo(() => [...pendingSubmissions, ...reApprovals], [pendingSubmissions, reApprovals]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filter === "submissions") items = pendingSubmissions;
    if (filter === "reapprovals") items = reApprovals;

    if (selectedDepartment !== "all") {
      items = items.filter((item) => String(item.departmentId || item.department?.id) === selectedDepartment);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const uploader = (item.uploader?.name || item.uploaderName || "").toLowerCase();
        const dept = (item.department?.name || item.departmentName || "").toLowerCase();
        return title.includes(q) || uploader.includes(q) || dept.includes(q);
      });
    }

    return items;
  }, [allItems, filter, pendingSubmissions, reApprovals, selectedDepartment, search]);

  function toggleExpand(idKey) {
    setExpandedId((prev) => (prev === idKey ? null : idKey));
  }

  async function reviewItem(item, decision) {
    const remarks =
      decision === "rejected" || decision === "draft"
        ? window.prompt("Add remarks (optional feedback for the employee):", "Please provide more details or attach a relevant file.")
        : "";
    if (remarks === null) return;

    try {
      const endpoint =
        item.contentType === "knowledge"
          ? `/knowledge/${item.id}/review`
          : `/tasks/${item.id}/review`;

      const resolvedDecision = item.contentType === "knowledge" && decision === "approved" ? "published" : decision;

      await request(endpoint, { method: "POST", body: JSON.stringify({ decision: resolvedDecision, remarks }) });
      await onChange();
      setToast(`${item.typeName} ${decision}.`);
      setExpandedId(null);
    } catch (err) {
      setToast(err.message || "Failed to submit review.");
    }
  }

  async function approveFile(item, fileId, decision) {
    const remarks = fileRemarks[fileId] || "";
    try {
      const endpoint =
        item.contentType === "knowledge"
          ? `/knowledge/${item.id}/files/${fileId}/approve`
          : `/tasks/${item.id}/files/${fileId}/approve`;

      await request(endpoint, { method: "POST", body: JSON.stringify({ decision, remarks }) });
      setFileRemarks((curr) => {
        const next = { ...curr };
        delete next[fileId];
        return next;
      });
      await onChange();
      setToast(`File ${decision}.`);
    } catch (err) {
      setToast(err.message || "Failed to update file approval.");
    }
  }

  async function toggleRecommended(item) {
    try {
      const isKnowledge = (data.knowledgePosts || []).some((k) => k.id === item.id) || item.contentType === "knowledge" || item.source === "knowledge";
      const isVideo = (data.videos || []).some((v) => v.id === item.id) || item.contentType === "video" || item.source === "video";
      const endpoint = isKnowledge
        ? `/knowledge/${item.id}/recommend`
        : isVideo
        ? `/videos/${item.id}/recommend`
        : `/tasks/${item.id}/recommend`;

      await request(endpoint, { method: "POST", body: JSON.stringify({ isRecommended: !item.isRecommended }) });
      await onChange();
      setToast(item.isRecommended ? "Removed from Recommended" : "Added to Recommended");
    } catch (err) {
      setToast(err.message || "Failed to update recommendation.");
    }
  }

  async function deleteItem(item) {
    const reason = window.prompt(
      `Delete "${item.title}"? Enter an optional reason for the employee:`,
      "Content removed by admin"
    );
    if (reason === null) return;
    try {
      const endpoint =
        item.contentType === "knowledge"
          ? `/knowledge/${item.id}`
          : `/tasks/${item.id}`;

      await request(endpoint, { method: "DELETE", body: JSON.stringify({ reason }) });
      await onChange();
      setToast(`${item.typeName} deleted.`);
    } catch (err) {
      setToast(err.message || "Failed to delete item.");
    }
  }

  return (
    <div className="approvals-page" style={{ maxWidth: 1120, margin: "0 auto" }}>
      <PageTitle
        eyebrow="Admin Workflow"
        title="Approvals"
        subtitle="Review employee knowledge submissions, inspect attachments, and approve replaced files."
      />

      {/* Top Filter & Search Card */}
      <div className="table-card" style={{ padding: "18px 24px", marginBottom: 24, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 320px" }}>
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
              placeholder="Search pending items by title, uploader, or department..."
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

          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={16} style={{ color: "#64748b" }} />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                color: selectedDepartment !== "all" ? "#2563eb" : "#334155",
                outline: "none"
              }}
            >
              <option value="all">All Departments</option>
              {(data?.departments || []).map((dept) => (
                <option key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
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
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>All Queue</span>
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: filter === "all" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
              {allItems.length}
            </span>
          </button>

          {canApprove && (
            <button
              type="button"
              onClick={() => setFilter("submissions")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                border: filter === "submissions" ? "1px solid #2563eb" : "1px solid #e2e8f0",
                background: filter === "submissions" ? "#2563eb" : "#f8fafc",
                color: filter === "submissions" ? "#ffffff" : "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>New Submissions</span>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: filter === "submissions" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
                {pendingSubmissions.length}
              </span>
            </button>
          )}

          {canReApprove && (
            <button
              type="button"
              onClick={() => setFilter("reapprovals")}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                border: filter === "reapprovals" ? "1px solid #2563eb" : "1px solid #e2e8f0",
                background: filter === "reapprovals" ? "#2563eb" : "#f8fafc",
                color: filter === "reapprovals" ? "#ffffff" : "#475569",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>File Re-approvals</span>
              <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: filter === "reapprovals" ? "rgba(255,255,255,0.25)" : "#e2e8f0" }}>
                {reApprovals.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Approvals List */}
      {filteredItems.length === 0 ? (
        <div className="table-card" style={{ padding: 48, textAlign: "center", borderRadius: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px"
            }}
          >
            <CheckCheck size={26} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
            All caught up!
          </h3>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            No submissions or files currently pending review in this view.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredItems.map((item) => {
            const key = `${item.contentType}-${item.id}-${item._isReApproval ? "re" : "sub"}`;
            const isExpanded = expandedId === key;
            const files = item.files || [];
            const authorName = item.uploader?.name || item.uploaderName || "Team Member";
            const deptName =
              item.department?.name ||
              item.departmentName ||
              (data?.departments || []).find((d) => d.id === (item.departmentId || item.department?.id))?.name ||
              "";
            const catName =
              item.category?.name ||
              item.categoryName ||
              (data?.categories || []).find((c) => c.id === (item.categoryId || item.category?.id))?.name ||
              "";

            const pendingFiles = files.filter((f) => f.approvalStatus === "pending");

            return (
              <article
                key={key}
                className="table-card"
                style={{
                  padding: "20px 24px",
                  borderRadius: 14,
                  border: "1px solid rgba(0, 0, 0, 0.08)",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                  transition: "all 0.15s ease"
                }}
              >
                {/* Card Top: Author, Type Pills & Action Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13.5,
                        flexShrink: 0
                      }}
                    >
                      {getInitials(authorName)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13.5, color: "#1e293b" }}>{authorName}</strong>
                        {deptName && (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                            {deptName}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>· {formatRelativeTime(item.createdAt)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 7px",
                            borderRadius: 5,
                            background: "rgba(37, 99, 235, 0.1)",
                            color: "#2563eb"
                          }}
                        >
                          {item._isReApproval ? `⏳ ${item._pendingFilesCount || pendingFiles.length} Replaced File(s) Waiting Review` : item.typeName}
                        </span>
                        {catName && (
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#64748b" }}>
                            · {catName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Group */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => openItem(item.id, item.contentType)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        fontSize: 12.5,
                        fontWeight: 600,
                        borderRadius: 8,
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        cursor: "pointer"
                      }}
                    >
                      <ExternalLink size={13} /> Preview
                    </button>

                    {!item._isReApproval && canApprove && (
                      <>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => reviewItem(item, "approved")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12.5 }}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          className="reject"
                          onClick={() => reviewItem(item, "rejected")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12.5 }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}

                    {canRecommend && (
                      <button
                        type="button"
                        className={`secondary ${item.isRecommended ? "active" : ""}`}
                        onClick={() => toggleRecommended(item)}
                        title={item.isRecommended ? "Remove from Recommended" : "Add to Recommended"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 12px",
                          fontSize: 12.5,
                          borderRadius: 8,
                          background: item.isRecommended ? "#eff6ff" : "#ffffff",
                          color: item.isRecommended ? "#2563eb" : "#475569",
                          border: item.isRecommended ? "1px solid #93c5fd" : "1px solid #cbd5e1"
                        }}
                      >
                        <Star size={13} style={{ fill: item.isRecommended ? "#2563eb" : "none", color: item.isRecommended ? "#2563eb" : "currentColor" }} />
                        {item.isRecommended ? "Recommended" : "Recommend"}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        title="Delete item"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#ef4444",
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => openItem(item.id, item.contentType)}
                  style={{
                    fontSize: 16.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 6px",
                    cursor: "pointer",
                    lineHeight: 1.4
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#0f172a")}
                >
                  {item.title}
                </h3>

                {/* Description Snippet (Clamped to 2 lines) */}
                {item.description && (
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: 13.5,
                      color: "#475569",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    <LinkifiedText text={item.description} />
                  </p>
                )}

                {/* Footer: Files Drawer Trigger and Review State Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.05)", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => toggleExpand(key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 8,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8"
                    }}
                  >
                    <File size={14} />
                    <span>
                      {item._isReApproval
                        ? `Review Files (${pendingFiles.length} Pending Approval)`
                        : `Attached Files (${files.length})`}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe"
                    }}
                  >
                    {item._isReApproval ? "File Re-approval Pending" : "New Submission Pending"}
                  </span>
                </div>

                {/* Expandable Files Drawer */}
                {isExpanded && (
                  <div style={{ marginTop: 14, padding: "16px 18px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#475569", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {item._isReApproval ? "Replaced Files Pending Decision" : "Review All Attached Files"} ({files.length})
                    </h4>

                    {files.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: 13 }}>No files attached to this submission.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {files.map((file, idx) => {
                          const isFilePending = file.approvalStatus === "pending";
                          return (
                            <div
                              key={file.id || idx}
                              style={{
                                padding: "12px 14px",
                                borderRadius: 10,
                                background: isFilePending ? "#f8fafc" : "#ffffff",
                                border: isFilePending ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                gap: 8
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={file.fileName || `File ${idx + 1}`}
                                  style={{
                                    fontSize: 13.5,
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
                                <span className={`status-badge ${file.approvalStatus || "pending"}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                                  {file.approvalStatus || "pending"}
                                </span>
                              </div>

                              {file.adminRemarks && (
                                <small style={{ color: "#dc2626", fontSize: 12 }}>
                                  <strong>Current Feedback:</strong> {file.adminRemarks}
                                </small>
                              )}

                              {/* Remarks input & Decision actions */}
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                                <input
                                  type="text"
                                  placeholder="Add feedback remarks for this file (optional)..."
                                  value={fileRemarks[file.id] || ""}
                                  onChange={(e) => setFileRemarks((curr) => ({ ...curr, [file.id]: e.target.value }))}
                                  style={{
                                    flex: 1,
                                    minWidth: 220,
                                    padding: "7px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    fontSize: 12.5,
                                    background: "#ffffff"
                                  }}
                                />
                                <button
                                  type="button"
                                  className="approve"
                                  onClick={() => approveFile(item, file.id, "approved")}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12 }}
                                >
                                  <CheckCircle2 size={13} /> Approve File
                                </button>
                                <button
                                  type="button"
                                  className="reject"
                                  onClick={() => approveFile(item, file.id, "rejected")}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 12 }}
                                >
                                  <XCircle size={13} /> Reject File
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
