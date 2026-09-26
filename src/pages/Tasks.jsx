import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Calendar,
  ArrowUpDown,
  X,
  FileText,
  Layers,
  ChevronRight,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { request } from "../api/client";
import { BookmarkButton } from "../components/BookmarkButton";
import { EmptyState, PageTitle, StatusBadge } from "../components/UI";
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

export function Tasks({ data, session, onChange, setToast, setRoute, openTask }) {
  const admin = session?.role === "admin";
  const canApprove = admin || hasPermission(session, "task_approval");
  const canDelete = admin || hasPermission(session, "knowledge_base_delete");
  const isDeptRestricted = Boolean(Number(data?.siteSettings?.restrictByDepartment)) && !admin;
  const userDeptId = session?.departmentId || session?.department_id || data?.currentUser?.departmentId;
  const userDept = (data?.departments || []).find((d) => Number(d.id) === Number(userDeptId));

  const allTasks = useMemo(() => data?.tasks || [], [data?.tasks]);
  const myTasks = useMemo(
    () => allTasks.filter((task) => Number(task.uploaderId) === Number(session?.id)),
    [allTasks, session?.id]
  );
  const pending = useMemo(
    () => allTasks.filter((task) => task.status === "pending"),
    [allTasks]
  );

  const baseTasks = admin ? pending : myTasks;

  // Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  // Status Counts
  const statusCounts = useMemo(() => {
    return {
      all: baseTasks.length,
      approved: baseTasks.filter((t) => t.status === "approved").length,
      pending: baseTasks.filter((t) => t.status === "pending").length,
      rejected: baseTasks.filter((t) => t.status === "rejected").length
    };
  }, [baseTasks]);

  // Filtered and Sorted
  const filtered = useMemo(() => {
    return baseTasks
      .filter((task) => {
        // Status Filter
        if (statusFilter !== "all" && task.status !== statusFilter) {
          return false;
        }

        // Department Filter
        if (selectedDepartment !== "all" && String(task.departmentId) !== selectedDepartment) {
          return false;
        }

        // Search Filter
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const deptName = task.department?.name || task.departmentName || "";
          const catName = task.category?.name || task.categoryName || "";
          const haystack = `${task.title} ${task.description || ""} ${deptName} ${catName}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [baseTasks, statusFilter, selectedDepartment, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function clearAllFilters() {
    setSearch("");
    setStatusFilter("all");
    setSelectedDepartment("all");
    setSortBy("newest");
    setPage(1);
  }

  const hasActiveFilters =
    search ||
    statusFilter !== "all" ||
    selectedDepartment !== "all";

  async function review(task, decision) {
    const remarks =
      decision === "rejected"
        ? window.prompt("Add remarks", "Please provide more details or attach a relevant file.")
        : "";
    await request(`/tasks/${task.id}/review`, { method: "POST", body: JSON.stringify({ decision, remarks }) });
    await onChange();
    setToast(`Task ${decision}.`);
  }

  async function removeTask(task) {
    const reason =
      admin || canDelete
        ? window.prompt(`Delete "${task.title}"? Enter an optional reason:`, "Content removed by user")
        : window.confirm(`Delete "${task.title}"? This cannot be undone.`)
        ? ""
        : null;
    if (reason === null) return;
    try {
      await request(`/tasks/${task.id}`, { method: "DELETE", body: JSON.stringify({ reason }) });
      await onChange();
      setToast("Task deleted.");
    } catch (err) {
      setToast(err.message || "Failed to delete task.");
    }
  }

  return (
    <div className="my-knowledge-page">
      <PageTitle
        eyebrow={admin ? "Admin Workflow" : "My Workspace"}
        title={admin ? "Pending Knowledge" : "My Knowledge"}
        subtitle={
          admin
            ? "Review and approve employee submissions across the organization."
            : "Track your submitted knowledge posts, review progress, and supporting attachments."
        }
      />

      {isDeptRestricted && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 18px",
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#15803d",
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <Building2 size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
          <span>
            Department Content Restriction is <strong>Active</strong>: You are viewing tasks exclusive to the <strong>{userDept?.name || "your assigned"}</strong> department.
          </span>
        </div>
      )}

      {/* Top Search & Filter Card */}
      <div className="table-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        {/* Search & Selectors Row */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
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
              placeholder="Search your submitted posts by title, description, or department..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: "100%",
                padding: "11px 36px 11px 40px",
                borderRadius: 10,
                border: "1px solid var(--border-color, #cbd5e1)",
                fontSize: 14,
                outline: "none",
                background: "#ffffff",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
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
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={16} style={{ color: isDeptRestricted ? "#16a34a" : "#64748b" }} />
            {isDeptRestricted ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#15803d",
                  fontSize: 13,
                  fontWeight: 700
                }}
                title="Department restriction is active. Viewing content for your department only."
              >
                <span>🔒 {userDept?.name || "Your Department"}</span>
              </div>
            ) : (
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color, #cbd5e1)",
                  background: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  color: selectedDepartment !== "all" ? "var(--primary, #2563eb)" : "var(--text-primary)",
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
            )}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowUpDown size={16} style={{ color: "#64748b" }} />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                outline: "none"
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            paddingTop: 14
          }}
        >
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: statusFilter === "all" ? "#2563eb" : "#f8fafc",
              color: statusFilter === "all" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>All Posts</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: statusFilter === "all" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: statusFilter === "all" ? "#fff" : "#64748b"
              }}
            >
              {statusCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === "approved" ? "all" : "approved");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "approved" ? "1px solid #16a34a" : "1px solid #e2e8f0",
              background: statusFilter === "approved" ? "#16a34a" : "#f8fafc",
              color: statusFilter === "approved" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Approved</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: statusFilter === "approved" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: statusFilter === "approved" ? "#fff" : "#64748b"
              }}
            >
              {statusCounts.approved}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === "pending" ? "all" : "pending");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "pending" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: statusFilter === "pending" ? "#2563eb" : "#f8fafc",
              color: statusFilter === "pending" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Pending Review</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: statusFilter === "pending" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: statusFilter === "pending" ? "#fff" : "#64748b"
              }}
            >
              {statusCounts.pending}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter(statusFilter === "rejected" ? "all" : "rejected");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: statusFilter === "rejected" ? "1px solid #dc2626" : "1px solid #e2e8f0",
              background: statusFilter === "rejected" ? "#dc2626" : "#f8fafc",
              color: statusFilter === "rejected" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>Rejected / Needs Revision</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: statusFilter === "rejected" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: statusFilter === "rejected" ? "#fff" : "#64748b"
              }}
            >
              {statusCounts.rejected}
            </span>
          </button>
        </div>
      </div>

      {/* Results Meta Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
          Showing {filtered.length} {filtered.length === 1 ? "submission" : "submissions"}
        </span>
        {hasActiveFilters && (
          <span style={{ fontSize: 12.5, color: "#64748b" }}>
            Filtered from {baseTasks.length} total
          </span>
        )}
      </div>

      {/* Cards Feed */}
      {paginated.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState
            title={
              baseTasks.length === 0
                ? admin
                  ? "No tasks pending review."
                  : "You have not submitted any knowledge posts yet."
                : "No submissions match your filter criteria."
            }
          />
          {!admin && baseTasks.length === 0 ? (
            <button
              type="button"
              className="primary"
              onClick={() => setRoute("create-task")}
              style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={16} /> Submit Your First Knowledge Post
            </button>
          ) : (
            hasActiveFilters && (
              <button
                type="button"
                className="secondary"
                onClick={clearAllFilters}
                style={{ marginTop: 14 }}
              >
                Clear filters and view all
              </button>
            )
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paginated.map((task) => {
            const authorName = task.uploader?.name || task.uploaderName || session?.name || "Team Member";
            const departmentName = task.department?.name || task.departmentName || (data?.departments || []).find((d) => d.id === task.departmentId)?.name || "";
            const categoryName = task.category?.name || task.categoryName || (data?.categories || []).find((c) => c.id === task.categoryId)?.name || "";
            const tags = typeof task.tags === "string" ? task.tags.split(",").map((t) => t.trim()).filter(Boolean) : (Array.isArray(task.tags) ? task.tags : []);

            return (
              <article
                key={task.id}
                className="table-card"
                style={{
                  padding: "20px 24px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  transition: "all 0.15s ease"
                }}
              >
                {/* Top Row: Author, Status Badge, Bookmark, Review Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
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
                        <strong style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                          {authorName}
                        </strong>
                        {departmentName && (
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "#f1f5f9",
                              color: "#475569",
                              fontWeight: 600
                            }}
                          >
                            {departmentName}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          · {formatRelativeTime(task.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={task.status || "pending"} />

                    {!admin && (
                      <BookmarkButton
                        contentType="task"
                        contentId={task.id}
                        initialBookmarked={(data?.bookmarks || []).some(
                          (b) => b.contentType === "task" && b.contentId === task.id
                        )}
                      />
                    )}

                    {admin ? (
                      <>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => review(task, "approved")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12.5 }}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button
                          type="button"
                          className="reject"
                          onClick={() => review(task, "rejected")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", fontSize: 12.5 }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                        <button
                          type="button"
                          className="reject"
                          onClick={() => removeTask(task)}
                          title="Delete task"
                          style={{ padding: "5px 8px" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      task.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => removeTask(task)}
                          title="Delete pending submission"
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "4px 6px"
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => openTask(task.id)}
                  style={{
                    fontSize: 16.5,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 6px",
                    cursor: "pointer",
                    lineHeight: 1.4
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                >
                  {task.title}
                </h3>

                {/* Description Snippet */}
                {task.description && (
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: 13.5,
                      color: "var(--text-secondary, #475569)",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    <LinkifiedText text={task.description} />
                  </p>
                )}

                {/* Rejection remarks warning banner if rejected */}
                {task.status === "rejected" && task.rejectionRemarks && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#fef2f2",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <AlertCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "#991b1b" }}>
                      <strong>Remarks:</strong> <LinkifiedText text={task.rejectionRemarks} />
                    </span>
                  </div>
                )}

                {/* Footer: Category & Tags & CTA */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(0,0,0,0.05)",
                    flexWrap: "wrap"
                  }}
                >
                  {/* Category & Tags */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {categoryName && (
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#f1f5f9",
                          color: "#475569"
                        }}
                      >
                        {categoryName}
                      </span>
                    )}
                  </div>

                  {/* Open Details Button */}
                  <button
                    type="button"
                    className="primary"
                    onClick={() => openTask(task.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8
                    }}
                  >
                    View Details <ChevronRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 24, paddingBottom: 10 }}>
          <button
            type="button"
            className="secondary"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8 }}
          >
            ‹ Previous
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="secondary"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8 }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
