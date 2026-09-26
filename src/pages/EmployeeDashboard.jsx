import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Star,
  Clock,
  Bookmark,
  FileText,
  Video,
  Layers,
  ChevronRight,
  Building2,
  Sparkles,
  ArrowRight,
  BookOpen,
  TrendingUp,
  X
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

export function EmployeeDashboard({
  data,
  session,
  openItem,
  setRoute
}) {
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const isAdmin = session?.role === "admin";
  const isDeptRestricted = Boolean(Number(data?.siteSettings?.restrictByDepartment)) && !isAdmin;
  const userDeptId = session?.departmentId || session?.department_id || data?.currentUser?.departmentId;
  const userDept = (data?.departments || []).find((d) => Number(d.id) === Number(userDeptId));

  // Normalize all content
  const allContent = useMemo(() => {
    const videos = (data?.videos || [])
      .filter((item) => item.status === "approved")
      .map((item) => ({
        ...item,
        contentType: "video",
        typeName: "Video",
        uploaderName: item.uploader?.name || item.uploaderName || "Team Member",
        departmentName: item.department?.name || item.departmentName || "",
        departmentId: item.departmentId || item.department?.id,
        categoryName: item.category?.name || item.categoryName || "",
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    const tasks = (data?.tasks || [])
      .filter((item) => item.status === "approved")
      .map((item) => ({
        ...item,
        contentType: "task",
        typeName: "Task Guide",
        uploaderName: item.uploader?.name || item.uploaderName || "Team Member",
        departmentName: item.department?.name || item.departmentName || "",
        departmentId: item.departmentId || item.department?.id,
        categoryName: item.category?.name || item.categoryName || "",
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    const knowledgePosts = (data?.knowledgePosts || [])
      .filter((item) => item.status === "published" || item.status === "approved")
      .map((item) => ({
        ...item,
        contentType: "knowledge",
        typeName: "Knowledge Post",
        uploaderName: item.uploader?.name || item.uploaderName || "Team Member",
        departmentName: item.department?.name || item.departmentName || "",
        departmentId: item.departmentId || item.department?.id,
        categoryName: item.category?.name || item.categoryName || "",
        tags: Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(",").map((t) => t.trim()).filter(Boolean) : [])
      }));

    let list = [...videos, ...tasks, ...knowledgePosts];
    if (isDeptRestricted && userDeptId) {
      list = list.filter((item) => Number(item.departmentId) === Number(userDeptId) || Number(item.uploaderId) === Number(session?.id));
    }
    return list;
  }, [data, isDeptRestricted, userDeptId, session?.id]);

  // Bookmark counts
  const bookmarkCounts = useMemo(() => {
    const counts = {};
    (data?.bookmarks || []).forEach((b) => {
      const key = `${b.contentType}-${b.contentId}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [data?.bookmarks]);

  // Recommended Content
  const recommended = useMemo(() => {
    return allContent
      .filter((item) => item.isRecommended)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allContent]);

  // Recently Added
  const recentlyAdded = useMemo(() => {
    return [...allContent].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allContent]);

  // Top Bookmarked
  const topBookmarked = useMemo(() => {
    return [...allContent]
      .map((item) => ({
        ...item,
        bookmarkCount: bookmarkCounts[`${item.contentType}-${item.id}`] || 0
      }))
      .filter((item) => item.bookmarkCount > 0)
      .sort((a, b) => b.bookmarkCount - a.bookmarkCount);
  }, [allContent, bookmarkCounts]);

  // User saved bookmarks count
  const myBookmarkCount = (data?.bookmarks || []).length;

  // Filtered view if search or filter is active
  const isFiltering = search.trim() !== "" || selectedDepartment !== "all" || selectedType !== "all";

  const searchResults = useMemo(() => {
    if (!isFiltering) return [];
    return allContent.filter((item) => {
      if (selectedType !== "all" && item.contentType !== selectedType) return false;
      if (selectedDepartment !== "all" && String(item.departmentId) !== selectedDepartment) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${item.title} ${item.description || ""} ${item.uploaderName} ${item.departmentName} ${item.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allContent, isFiltering, search, selectedDepartment, selectedType]);

  function renderContentCard(item) {
    const isVideo = item.contentType === "video";
    const isBookmarked = (data?.bookmarks || []).some(
      (b) => b.contentType === item.contentType && b.contentId === item.id
    );

    return (
      <article
        key={`${item.contentType}-${item.id}`}
        className="table-card"
        style={{
          padding: "20px 22px",
          borderRadius: 14,
          border: "1px solid rgba(0, 0, 0, 0.08)",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "all 0.15s ease",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)"
        }}
      >
        <div>
          {/* Card Header: Author, Type, Bookmark */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: isVideo
                    ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                    : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0
                }}
              >
                {getInitials(item.uploaderName, "A")}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                  {item.uploaderName}
                </div>
                <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                  {item.departmentName ? `${item.departmentName} · ` : ""}{formatRelativeTime(item.createdAt)}
                </div>
              </div>
            </div>

            <BookmarkButton
              contentType={item.contentType}
              contentId={item.id}
              initialBookmarked={isBookmarked}
            />
          </div>

          {/* Title */}
          <h3
            onClick={() => openItem(item.id, item.contentType)}
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: "0 0 8px",
              cursor: "pointer",
              lineHeight: 1.4
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          >
            {item.title}
          </h3>

          {/* Description */}
          {item.description && (
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                color: "#64748b",
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
        </div>

        {/* Footer: Badges & CTA */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: 12, marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 6,
                background: isVideo ? "rgba(14, 165, 233, 0.1)" : "rgba(37, 99, 235, 0.1)",
                color: isVideo ? "#0284c7" : "#2563eb"
              }}
            >
              {isVideo ? <Video size={12} /> : <FileText size={12} />}
              <span>{item.typeName}</span>
            </span>

            {item.categoryName && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "#f1f5f9", color: "#475569" }}>
                {item.categoryName}
              </span>
            )}
          </div>

          <button
            type="button"
            className="primary"
            onClick={() => openItem(item.id, item.contentType)}
            style={{
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4
            }}
          >
            {isVideo ? "Watch" : "View"} <ChevronRight size={13} />
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="employee-home-page">
      {/* Hero Welcome Banner */}
      <div
        className="table-card"
        style={{
          padding: "28px 32px",
          borderRadius: 18,
          marginBottom: 24,
          border: "1px solid rgba(37, 99, 235, 0.15)",
          background: "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(37, 99, 235, 0.1)", color: "#1d4ed8", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            <Sparkles size={14} /> KnowledgeIQ Learning Portal
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", lineHeight: 1.3 }}>
            Welcome back, {session?.name} 👋
          </h1>
          <p style={{ fontSize: 14.5, color: "#475569", margin: "0 0 20px", lineHeight: 1.6 }}>
            Discover approved walkthroughs, share operational know-how, and keep team learning moving without scattered documents.
          </p>

          {/* Quick Metrics Bar */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", color: "#2563eb", display: "grid", placeItems: "center" }}>
                <BookOpen size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>{allContent.length}</strong>
                <span style={{ fontSize: 11.5, color: "#64748b" }}>Total Resources</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", color: "#475569", display: "grid", placeItems: "center" }}>
                <Bookmark size={16} />
              </div>
              <div>
                <strong style={{ fontSize: 15, color: "#0f172a", display: "block" }}>{myBookmarkCount}</strong>
                <span style={{ fontSize: 11.5, color: "#64748b" }}>My Bookmarks</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="table-card" style={{ padding: "18px 24px", marginBottom: 26 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
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
              placeholder="Search across all guides, videos, and documentation..."
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
              <option value="all">All Content Types</option>
              <option value="video">Videos</option>
              <option value="knowledge">Knowledge Posts</option>
              <option value="task">Task Guides</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtered Search Results View */}
      {isFiltering ? (
        <div style={{ marginBottom: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Search Results ({searchResults.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedDepartment("all");
                setSelectedType("all");
              }}
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Clear filters
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="table-card" style={{ padding: 40, textAlign: "center" }}>
              <EmptyState title="No resources match your search criteria." />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
              {searchResults.map((item) => renderContentCard(item))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Section 1: Recently Added Knowledge */}
          {recentlyAdded.length > 0 && (
            <section style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={18} style={{ color: "#2563eb" }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Recently Added
                  </h2>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#eff6ff", color: "#2563eb" }}>
                    {recentlyAdded.length}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                {recentlyAdded.slice(0, 6).map((item) => renderContentCard(item))}
              </div>
            </section>
          )}

          {/* Section 3: Most Popular / Top Bookmarked */}
          {topBookmarked.length > 0 && (
            <section style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={18} style={{ color: "#16a34a" }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Most Popular & Bookmarked
                  </h2>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f0fdf4", color: "#16a34a" }}>
                    {topBookmarked.length}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
                {topBookmarked.slice(0, 6).map((item) => renderContentCard(item))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}