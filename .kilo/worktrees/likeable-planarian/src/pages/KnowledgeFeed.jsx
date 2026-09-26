import { useState, useMemo, useEffect, memo } from "react";
import {
  Search,
  Plus,
  Trash2,
  BookmarkPlus,
  BookmarkCheck,
  Download,
  Calendar,
  Building2,
  Tag,
  Layers,
  FileText,
  File,
  Filter,
  X,
  Clock,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { PageTitle, EmptyState } from "../components/UI";
import { BookmarkButton } from "../components/BookmarkButton";
import { request } from "../api/client";
import { hasPermission } from "../utils/permissions";
import { getInitials } from "../utils/initials";
import { LinkifiedText } from "../components/LinkifiedText";

function normalizeKnowledgePost(post) {
  const tags = Array.isArray(post.tags)
    ? post.tags
    : post.tags
    ? String(post.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return {
    id: post.id,
    title: post.title,
    description: post.description || "",
    contentType: post.contentType || "file",
    departmentId: post.departmentId,
    categoryId: post.categoryId,
    departmentName: post.department?.name || post.departmentName || "",
    categoryName: post.category?.name || post.categoryName || "",
    fileUrl: post.fileUrl || "",
    fileName: post.fileName || (post.fileUrl ? post.fileUrl.split("/").pop() : ""),
    fileExtension: post.fileExtension || "",
    files: post.files || [],
    uploaderId: post.uploaderId,
    uploaderName: post.uploader?.name || post.uploaderName || "",
    tags,
    status: post.status || "",
    createdAt: post.createdAt,
    source: "knowledge"
  };
}

function normalizeTask(task) {
  const tags = Array.isArray(task.tags)
    ? task.tags
    : task.tags
    ? String(task.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    contentType: "task",
    departmentId: task.departmentId,
    categoryId: task.categoryId,
    departmentName: task.department?.name || task.departmentName || "",
    categoryName: task.category?.name || task.categoryName || "",
    fileUrl: task.fileUrl || "",
    fileName: task.fileName || (task.fileUrl ? task.fileUrl.split("/").pop() : ""),
    fileExtension: task.fileExtension || "",
    files: task.files || [],
    uploaderId: task.uploaderId,
    uploaderName: task.uploader?.name || task.uploaderName || "",
    tags,
    status: task.status || "",
    createdAt: task.createdAt,
    source: "task"
  };
}

export const FileCarousel = memo(function FileCarousel({ files, contentType, title }) {
  const [index, setIndex] = useState(0);
  const list = Array.isArray(files) && files.length ? files : [];

  useEffect(() => {
    setIndex(0);
  }, [files]);

  if (!list.length) return null;

  const safeIndex = Math.min(Math.max(0, index), list.length - 1);
  const current = list[safeIndex] || list[0];
  const fileKey = current?.fileUrl || current?.id || `file-${safeIndex}`;

  function go(dir) {
    setIndex((curr) => {
      const next = curr + dir;
      if (next < 0) return list.length - 1;
      if (next >= list.length) return 0;
      return next;
    });
  }

  function renderFile(file) {
    if (!file) return null;
    const ext = (file.fileExtension || "").toLowerCase();
    const key = file.fileUrl || file.id || `media-${safeIndex}`;

    if (ext === "pdf") {
      return (
        <div key={key} style={{ width: "100%", height: 380, position: "relative", borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
          <iframe
            key={key}
            src={file.fileUrl}
            title={file.fileName || `${title} ${safeIndex + 1}`}
            style={{ width: "100%", height: "100%", border: "none", borderRadius: 10 }}
          >
            <a href={file.fileUrl} target="_blank" rel="noreferrer" className="knowledge-file-link">
              <Download size={16} />
              <span>Open PDF ({file.fileName || "document.pdf"})</span>
            </a>
          </iframe>
        </div>
      );
    }

    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return (
        <div key={key} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "#0b0f19", borderRadius: 10, overflow: "hidden", minHeight: 240 }}>
          <img
            key={key}
            src={file.fileUrl}
            alt={file.fileName || `${title} ${safeIndex + 1}`}
            style={{ maxWidth: "100%", maxHeight: 420, objectFit: "contain" }}
          />
        </div>
      );
    }

    if (contentType === "video" || ["mp4", "mov", "webm", "m4v", "ogv", "mkv"].includes(ext)) {
      return (
        <div key={key} style={{ width: "100%", background: "#000000", borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <video
            key={key}
            src={file.fileUrl}
            controls
            controlsList="nodownload"
            preload="metadata"
            style={{ width: "100%", maxHeight: 420, display: "block", borderRadius: 10 }}
          >
            <source src={file.fileUrl} type={`video/${ext || "mp4"}`} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div
        key={key}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          background: "#ffffff",
          borderRadius: 10,
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <File size={28} style={{ color: "#2563eb" }} />
        </div>
        <strong style={{ fontSize: 14, color: "#1e293b", marginBottom: 4, wordBreak: "break-all", textAlign: "center" }}>
          {file.fileName || `Attachment ${ext ? `(.${ext})` : ""}`}
        </strong>
        <span style={{ fontSize: 12, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          {ext || "Document"} File
        </span>
        <a
          href={file.fileUrl}
          target="_blank"
          rel="noreferrer"
          download={file.fileName || true}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 8,
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 13,
            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.2)"
          }}
        >
          <Download size={15} />
          <span>Download Attachment</span>
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, borderRadius: 14, overflow: "hidden", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px" }}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#eff6ff", border: "1px solid #dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <File size={15} style={{ color: "#2563eb" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {current?.fileName || `File ${safeIndex + 1}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#475569", background: "#ffffff", padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontWeight: 700 }}>
            {safeIndex + 1} of {list.length} {list.length === 1 ? "file" : "files"}
          </span>
          {current?.fileUrl && (
            <a
              href={current.fileUrl}
              target="_blank"
              rel="noreferrer"
              download={current.fileName || true}
              title="Download file"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                textDecoration: "none"
              }}
            >
              <Download size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Main File Content Box */}
      <div key={`carousel-content-${fileKey}`} style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {renderFile(current)}
      </div>

      {/* Multi-File Navigation Toolbar */}
      {list.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous file"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 8,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              flexShrink: 0
            }}
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          {/* Interactive File Playlist Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              overflowX: "auto",
              padding: "2px 0",
              flex: 1,
              scrollbarWidth: "none"
            }}
          >
            {list.map((file, i) => {
              const isActive = i === safeIndex;
              const cleanName = file.fileName || `File ${i + 1}`;
              return (
                <button
                  key={file.fileUrl || file.id || i}
                  type="button"
                  onClick={() => setIndex(i)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    background: isActive ? "#2563eb" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: isActive ? "0 2px 6px rgba(37,99,235,0.25)" : "none",
                    transition: "all 0.15s ease",
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  title={cleanName}
                >
                  <span style={{ fontSize: 11, opacity: isActive ? 0.9 : 0.6 }}>{i + 1}.</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cleanName}</span>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next file"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 8,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#334155",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              flexShrink: 0
            }}
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
});

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

export function KnowledgeFeed({ data, session, setRoute, onViewItem, onChange, setToast }) {
  const isAdmin = session?.role === "admin";
  const canAddKnowledge = isAdmin || hasPermission(session, "add_knowledge_post_admin");

  const knowledgePosts = useMemo(
    () => (data.knowledgePosts || []).map(normalizeKnowledgePost),
    [data.knowledgePosts]
  );
  const tasks = useMemo(
    () =>
      (data.tasks || [])
        .filter((task) => isAdmin || task.status === "approved")
        .map(normalizeTask),
    [data.tasks, isAdmin]
  );

  const items = useMemo(() => {
    return [...knowledgePosts, ...tasks].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [knowledgePosts, tasks]);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const pageSize = 8;

  // Compute Categories with Counts
  const categoryCounts = useMemo(() => {
    const counts = { all: items.length };
    items.forEach((item) => {
      const catId = item.categoryId ? String(item.categoryId) : "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Filter and Sort Items
  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        // Category Filter
        if (selectedCategory !== "all") {
          if (String(item.categoryId) !== selectedCategory) return false;
        }

        // Department Filter
        if (selectedDepartment !== "all") {
          if (String(item.departmentId) !== selectedDepartment) return false;
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
          const haystack = `${item.title} ${item.description} ${item.uploaderName} ${item.departmentName}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return new Date(b.createdAt) - new Date(a.createdAt); // newest
      });
  }, [items, selectedCategory, selectedDepartment, dateRange, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function clearAllFilters() {
    setSearch("");
    setSelectedCategory("all");
    setSelectedDepartment("all");
    setDateRange("all");
    setSortBy("newest");
    setPage(1);
  }

  const hasActiveFilters =
    search ||
    selectedCategory !== "all" ||
    selectedDepartment !== "all" ||
    dateRange !== "all";

  function toggleDescription(id) {
    setExpandedDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="knowledge-base-page">
      <PageTitle
        eyebrow="Team Knowledge Base"
        title="Knowledge Base"
        subtitle={
          isAdmin
            ? "Manage, discover, and organize published walkthroughs, guides, and bug resolutions."
            : "Explore approved team walkthroughs, operational guides, and shared engineering knowledge."
        }
        actions={
          canAddKnowledge ? (
            <button
              type="button"
              className="primary"
              onClick={() => setRoute?.("create-knowledge")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus size={16} /> Add Post
            </button>
          ) : null
        }
      />

      {/* Top Search & Filter Card */}
      <div className="table-card" style={{ padding: "20px 24px", marginBottom: 24 }}>
        {/* Search & Action Bar */}
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
              placeholder="Search guides, bug reports, or authors..."
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

          {/* Department Filter Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={16} style={{ color: "#64748b" }} />
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
              {(data.departments || []).map((dept) => (
                <option key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Dropdown */}
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

        {/* Category Pills Row */}
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
              setSelectedCategory("all");
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: selectedCategory === "all" ? "1px solid #2563eb" : "1px solid #e2e8f0",
              background: selectedCategory === "all" ? "#2563eb" : "#f8fafc",
              color: selectedCategory === "all" ? "#ffffff" : "#475569",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
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
                background: selectedCategory === "all" ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                color: selectedCategory === "all" ? "#fff" : "#64748b"
              }}
            >
              {categoryCounts.all || 0}
            </span>
          </button>

          {(data.categories || []).map((cat) => {
            const isSelected = selectedCategory === String(cat.id);
            const count = categoryCounts[String(cat.id)] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(isSelected ? "all" : String(cat.id));
                  setPage(1);
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                  background: isSelected ? "#2563eb" : "#f8fafc",
                  color: isSelected ? "#ffffff" : "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: isSelected ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                      color: isSelected ? "#fff" : "#64748b"
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
          Showing {filtered.length} {filtered.length === 1 ? "guide" : "guides"}
        </span>
        {hasActiveFilters && (
          <span style={{ fontSize: 12.5, color: "#64748b" }}>
            Filtered from {items.length} total
          </span>
        )}
      </div>

      {/* Knowledge Cards Feed */}
      {paginated.length === 0 ? (
        <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
          <EmptyState title="No matching knowledge guides found." />
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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {paginated.map((post) => {
            const hasFiles = (post.files && post.files.length > 0) || post.fileUrl;
            const isTask = post.source === "task";

            return (
              <article
                key={`${post.source}-${post.id}`}
                className="table-card"
                style={{
                  padding: "20px 24px",
                  borderRadius: 16,
                  transition: "all 0.15s ease",
                  border: "1px solid rgba(0, 0, 0, 0.08)"
                }}
              >
                {/* Author & Header Metadata Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                      {getInitials(post.uploaderName, "A")}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 14, color: "var(--text-primary)" }}>
                          {post.uploaderName || "Team Member"}
                        </strong>
                        {post.departmentName && (
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
                            {post.departmentName}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>
                          · {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Bookmark + Delete) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BookmarkButton
                      contentType={post.source}
                      contentId={post.id}
                      initialBookmarked={(data.bookmarks || []).some(
                        (b) => b.contentType === post.source && b.contentId === post.id
                      )}
                    />

                    {(isAdmin || hasPermission(session, "knowledge_base_delete")) && (
                      <button
                        type="button"
                        onClick={() => {
                          const reason = window.prompt(
                            `Delete this ${post.source}? Enter an optional reason for the employee:`,
                            "Content removed by admin"
                          );
                          if (reason === null) return;
                          const endpoint =
                            post.source === "knowledge"
                              ? `/knowledge/${post.id}`
                              : `/${post.source}s/${post.id}`;
                          request(endpoint, { method: "DELETE", body: JSON.stringify({ reason }) })
                            .then(() => {
                              setToast?.(`${post.source === "knowledge" ? "Knowledge post" : "Task"} deleted.`);
                              onChange?.();
                            })
                            .catch((err) => setToast?.(err.message || "Delete failed."));
                        }}
                        title={`Delete ${post.source}`}
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: 8,
                          padding: "6px 8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Title */}
                <h3
                  onClick={() => onViewItem(post.id, post.source)}
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 8px",
                    cursor: "pointer",
                    lineHeight: 1.4
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                >
                  {post.title}
                </h3>

                {/* Description Snippet */}
                {post.description && (
                  <div style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        color: "var(--text-secondary, #475569)",
                        lineHeight: 1.6,
                        display: expandedDescriptions[post.id] ? "block" : "-webkit-box",
                        WebkitLineClamp: expandedDescriptions[post.id] ? "unset" : 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      <LinkifiedText text={post.description} />
                    </p>
                    {post.description.length > 180 && (
                      <button
                        type="button"
                        onClick={() => toggleDescription(post.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: "4px 0",
                          marginTop: 2
                        }}
                      >
                        {expandedDescriptions[post.id] ? "Show Less" : "Read More..."}
                      </button>
                    )}
                  </div>
                )}

                {/* Media / Carousel Preview */}
                {hasFiles && (() => {
                  const visibleFiles = (post.files || []).filter((file) => file.approvalStatus === "approved");
                  const fallbackFile = post.fileUrl ? { fileUrl: post.fileUrl, fileExtension: post.fileExtension } : null;
                  const carouselFiles = visibleFiles.length > 0 ? visibleFiles : fallbackFile ? [fallbackFile] : [];
                  return carouselFiles.length ? (
                    <FileCarousel files={carouselFiles} contentType={post.contentType} title={post.title} />
                  ) : null;
                })()}

                {/* Footer Metadata & CTA */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(0,0,0,0.05)",
                    flexWrap: "wrap"
                  }}
                >
                  {/* Category & Tags */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {post.categoryName && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: "rgba(37, 99, 235, 0.08)",
                          color: "var(--primary, #1d4ed8)",
                          border: "1px solid rgba(37, 99, 235, 0.18)"
                        }}
                      >
                        {post.categoryName}
                      </span>
                    )}
                  </div>

                  {/* View Details CTA */}
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onViewItem(post.id, post.source)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8
                    }}
                  >
                    View Post <ChevronRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 26, paddingBottom: 10 }}>
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