import { useState, useMemo } from "react";
import {
  Search,
  Building2,
  Calendar,
  ArrowUpDown,
  X,
  Play,
  FileText,
  BookmarkPlus,
  BookmarkCheck,
  Video,
  Layers,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { PageTitle, EmptyState } from "../components/UI";
import { BookmarkButton } from "../components/BookmarkButton";
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

export function SearchResults({ data, content, openItem }) {
  const isAdmin = data?.currentUser?.role === "admin";
  const isDeptRestricted = Boolean(Number(data?.siteSettings?.restrictByDepartment)) && !isAdmin;
  const userDeptId = data?.currentUser?.departmentId;
  const userDept = (data?.departments || []).find((d) => Number(d.id) === Number(userDeptId));

  // Normalize and aggregate all approved content (videos, tasks, knowledge posts)
  const allItems = useMemo(() => {
    const videos = (data?.videos || [])
      .filter((v) => v.status === "approved")
      .map((v) => ({
        ...v,
        contentType: "video",
        typeName: "Video",
        uploaderName: v.uploader?.name || v.uploaderName || "",
        departmentName: v.department?.name || v.departmentName || "",
        departmentId: v.departmentId || v.department?.id,
        categoryName: v.category?.name || v.categoryName || "",
        tags: Array.isArray(v.tags) ? v.tags : (v.tags ? String(v.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    const tasks = (data?.tasks || [])
      .filter((t) => t.status === "approved")
      .map((t) => ({
        ...t,
        contentType: "task",
        typeName: "Task Guide",
        uploaderName: t.uploader?.name || t.uploaderName || "",
        departmentName: t.department?.name || t.departmentName || "",
        departmentId: t.departmentId || t.department?.id,
        categoryName: t.category?.name || t.categoryName || "",
        tags: Array.isArray(t.tags) ? t.tags : (t.tags ? String(t.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    const knowledge = (data?.knowledgePosts || [])
      .filter((k) => k.status === "published" || k.status === "approved")
      .map((k) => ({
        ...k,
        contentType: "knowledge",
        typeName: "Knowledge Post",
        uploaderName: k.uploader?.name || k.uploaderName || "",
        departmentName: k.department?.name || k.departmentName || "",
        departmentId: k.departmentId || k.department?.id,
        categoryName: k.category?.name || k.categoryName || "",
        tags: Array.isArray(k.tags) ? k.tags : (k.tags ? String(k.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    let list = [...videos, ...tasks, ...knowledge];
    if (isDeptRestricted && userDeptId) {
      list = list.filter((item) => Number(item.departmentId) === Number(userDeptId) || Number(item.uploaderId) === Number(data?.currentUser?.id));
    }
    return list.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [data, isDeptRestricted, userDeptId]);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const pageSize = 8;

  // Type Counts
  const typeCounts = useMemo(() => {
    return {
      all: allItems.length,
      video: allItems.filter((i) => i.contentType === "video").length,
      knowledge: allItems.filter((i) => i.contentType === "knowledge").length,
      task: allItems.filter((i) => i.contentType === "task").length
    };
  }, [allItems]);

  // Filtered and Sorted items
  const filtered = useMemo(() => {
    return allItems
      .filter((item) => {
        // Content Type Filter
        if (selectedType !== "all" && item.contentType !== selectedType) {
          return false;
        }

        // Department Filter
        if (selectedDepartment !== "all" && String(item.departmentId) !== selectedDepartment) {
          return false;
        }

        // Date Filter
        if (dateRange !== "all") {
          const itemDate = new Date(item.createdAt).getTime();
          const now = Date.now();
          if (dateRange === "today" && now - itemDate > 24 * 60 * 60 * 1000) return false;
          if (dateRange === "week" && now - itemDate > 7 * 24 * 60 * 60 * 1000) return false;
          if (dateRange === "month" && now - itemDate > 30 * 24 * 60 * 60 * 1000) return false;
        }

        // Search Filter
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const haystack = `${item.title} ${item.description || ""} ${item.uploaderName} ${item.departmentName} ${item.tags.join(" ")}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [allItems, selectedType, selectedDepartment, dateRange, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function clearAllFilters() {
    setSearch("");
    setSelectedType("all");
    setSelectedDepartment("all");
    setDateRange("all");
    setSortBy("newest");
    setPage(1);
  }

  const hasActiveFilters =
    search ||
    selectedType !== "all" ||
    selectedDepartment !== "all" ||
    dateRange !== "all";

  return (
    <div className="browse-library-page">
      <PageTitle
        eyebrow="Explore Library"
        title="Browse Library"
        subtitle="Search and discover walkthrough videos, approved task guides, and technical documentation across all departments."
      />

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
              placeholder="Search library by title, description, or department..."
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

          {/* Date Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={16} style={{ color: "#64748b" }} />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-color, #cbd5e1)",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                color: dateRange !== "all" ? "var(--primary, #2563eb)" : "var(--text-primary)",
                outline: "none"
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Past 24 Hours</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
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

        {/* Content Type Pills Row */}
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
              setSelectedType("all");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: selectedType === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedType === "all" ? "#2563eb" : "#f8fafc",
              color: selectedType === "all" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>All Content</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: selectedType === "all" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: selectedType === "all" ? "#fff" : "#64748b"
              }}
            >
              {typeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType(selectedType === "video" ? "all" : "video");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: selectedType === "video" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedType === "video" ? "#2563eb" : "#f8fafc",
              color: selectedType === "video" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Video size={14} />
            <span>Videos</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: selectedType === "video" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: selectedType === "video" ? "#fff" : "#64748b"
              }}
            >
              {typeCounts.video}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType(selectedType === "knowledge" ? "all" : "knowledge");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: selectedType === "knowledge" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedType === "knowledge" ? "#2563eb" : "#f8fafc",
              color: selectedType === "knowledge" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <FileText size={14} />
            <span>Knowledge Posts</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: selectedType === "knowledge" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: selectedType === "knowledge" ? "#fff" : "#64748b"
              }}
            >
              {typeCounts.knowledge}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedType(selectedType === "task" ? "all" : "task");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: selectedType === "task" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedType === "task" ? "#2563eb" : "#f8fafc",
              color: selectedType === "task" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Layers size={14} />
            <span>Task Guides</span>
            <span
              style={{
                fontSize: 11,
                padding: "1px 6px",
                borderRadius: 999,
                background: selectedType === "task" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: selectedType === "task" ? "#fff" : "#64748b"
              }}
            >
              {typeCounts.task}
            </span>
          </button>
        </div>
      </div>

      {/* Results Meta Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
          Showing {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </span>
        {hasActiveFilters && (
          <span style={{ fontSize: 12.5, color: "#64748b" }}>
            Filtered from {allItems.length} total
          </span>
        )}
      </div>

      {/* Items Feed Grid / List */}
      {paginated.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState title="No matching resources found in library." />
          {hasActiveFilters && (
            <button
              type="button"
              className="secondary"
              onClick={clearAllFilters}
              style={{ marginTop: 14 }}
            >
              Clear filters and view all
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paginated.map((item) => {
            const isVideo = item.contentType === "video";

            return (
              <article
                key={`${item.contentType}-${item.id}`}
                className="table-card"
                style={{
                  padding: "18px 22px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  transition: "all 0.15s ease"
                }}
              >
                {/* Top Row: Author & Metadata & Bookmark */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: isVideo
                          ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                          : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13.5,
                        flexShrink: 0
                      }}
                    >
                      {getInitials(item.uploaderName, "T")}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                          {item.uploaderName || "Team Member"}
                        </strong>
                        {item.departmentName && (
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
                            {item.departmentName}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          · {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: 6,
                        background: isVideo ? "rgba(14, 165, 233, 0.1)" : "rgba(37, 99, 235, 0.1)",
                        color: isVideo ? "#0284c7" : "#2563eb",
                        border: isVideo ? "1px solid rgba(14, 165, 233, 0.2)" : "1px solid rgba(37, 99, 235, 0.2)"
                      }}
                    >
                      {isVideo ? <Video size={13} /> : <FileText size={13} />}
                      <span>{item.typeName}</span>
                    </span>

                    <BookmarkButton
                      contentType={item.contentType}
                      contentId={item.id}
                      initialBookmarked={(data?.bookmarks || []).some(
                        (b) => b.contentType === item.contentType && b.contentId === item.id
                      )}
                    />
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => openItem(item.id, item.contentType)}
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
                  {item.title}
                </h3>

                {/* Description Snippet */}
                {item.description && (
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
                    <LinkifiedText text={item.description} />
                  </p>
                )}

                {/* Footer Meta & CTA */}
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
                    {item.categoryName && (
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
                        {item.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Open Item Button */}
                  <button
                    type="button"
                    className="primary"
                    onClick={() => openItem(item.id, item.contentType)}
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
                    {isVideo ? "Watch Video" : "View Resource"} <ChevronRight size={15} />
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