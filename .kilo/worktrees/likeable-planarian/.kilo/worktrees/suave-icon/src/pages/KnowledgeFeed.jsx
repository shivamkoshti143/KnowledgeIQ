import { BookmarkCheck, BookmarkPlus, Download, Play, Search } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "../components/UI";
import { BookmarkButton } from "../components/BookmarkButton";

function normalizeKnowledgePost(post) {
  const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(",").map((t) => t.trim()).filter(Boolean) : []);
  return {
    id: post.id,
    title: post.title,
    description: post.description || "",
    contentType: post.contentType || "text",
    fileUrl: post.fileUrl || "",
    fileExtension: post.fileExtension || "",
    files: post.files || [],
    departmentId: post.departmentId,
    departmentName: post.department?.name || post.departmentName || "",
    categoryId: post.categoryId,
    categoryName: post.category?.name || post.categoryName || "",
    uploaderName: post.uploader?.name || post.uploaderName || "",
    tags,
    status: post.status || "",
    createdAt: post.createdAt,
    source: "knowledge"
  };
}

function normalizeTask(task) {
  const tags = typeof task.tags === "string" ? task.tags.split(",").map((t) => t.trim()).filter(Boolean) : (Array.isArray(task.tags) ? task.tags : []);
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    contentType: "task",
    fileUrl: task.fileUrl || "",
    fileExtension: task.fileExtension || "",
    files: task.files || [],
    departmentId: task.departmentId,
    departmentName: task.department?.name || task.departmentName || "",
    categoryId: task.categoryId,
    categoryName: task.category?.name || task.categoryName || "",
    uploaderName: task.uploader?.name || task.uploaderName || "",
    tags,
    status: task.status || "",
    createdAt: task.createdAt,
    source: "task"
  };
}

function FilterSection({ title, children }) {
  return (
    <div className="kb-filter-section">
      <strong>{title}</strong>
      <div className="kb-filter-options">{children}</div>
    </div>
  );
}

function CheckboxFilter({ label, checked, onChange }) {
  return (
    <label className="kb-checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export function FileCarousel({ files, contentType, title }) {
  const [index, setIndex] = useState(0);
  const list = files?.length ? files : [];
  const current = list[index] || null;

  if (!list.length) return null;

  function go(dir) {
    setIndex((current) => (current + dir + list.length) % list.length);
  }

  function renderFile(file) {
    const ext = file.fileExtension || "";
    if (ext === "pdf") {
      return (
        <iframe src={file.fileUrl} title={`${title} ${index + 1}`}>
          <a href={file.fileUrl} target="_blank" rel="noreferrer" className="knowledge-file-link">
            <Download size={18} />
            <span>Open PDF</span>
          </a>
        </iframe>
      );
    }
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return <img src={file.fileUrl} alt={`${title} ${index + 1}`} />;
    }
    if (contentType === "video" || ["mp4", "mov", "webm"].includes(ext)) {
      return (
        <video controls controlsList="nodownload" preload="metadata">
          <source src={file.fileUrl} type={`video/${ext || "mp4"}`} />
          Your browser does not support the video tag.
        </video>
      );
    }
    return (
      <a href={file.fileUrl} target="_blank" rel="noreferrer" className="knowledge-file-link">
        <Download size={18} />
        <span>Download{ext ? ` .${ext}` : ""}</span>
      </a>
    );
  }

  return (
    <div className="knowledge-card-media">
      {renderFile(current)}
      {list.length > 1 && (
        <>
          <button type="button" className="carousel-arrow carousel-prev" onClick={() => go(-1)} aria-label="Previous file">
            ‹
          </button>
          <button type="button" className="carousel-arrow carousel-next" onClick={() => go(1)} aria-label="Next file">
            ›
          </button>
          <div className="carousel-dots">
            {list.map((file, idx) => (
              <button type="button" key={idx} className={`carousel-dot ${idx === index ? "active" : ""}`} onClick={() => setIndex(idx)} aria-label={`File ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function KnowledgeFeed({ data, session, setRoute, onViewItem }) {
  const isAdmin = session.role === "admin";
  const knowledgePosts = (data.knowledgePosts || []).map(normalizeKnowledgePost);
  const tasks = (data.tasks || [])
    .filter((task) => isAdmin || task.status === "approved")
    .map(normalizeTask);

  const items = [...knowledgePosts, ...tasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const allDepartmentIds = items.map((item) => item.departmentId).filter(Boolean);
  const allCategoryIds = items.map((item) => item.categoryId).filter(Boolean);

  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const filtered = items.filter((item) => {
    if (selectedDepartments.length && !selectedDepartments.includes(String(item.departmentId))) return false;
    if (selectedCategories.length && !selectedCategories.includes(String(item.categoryId))) return false;
    if (fromDate) {
      const itemDate = new Date(item.createdAt).toISOString().split("T")[0];
      if (itemDate < fromDate) return false;
    }
    if (toDate) {
      const itemDate = new Date(item.createdAt).toISOString().split("T")[0];
      if (itemDate > toDate) return false;
    }
    if (tagFilter) {
      const tagLower = tagFilter.toLowerCase();
      if (!item.tags.some((t) => t.toLowerCase() === tagLower)) return false;
    }
    if (search) {
      const term = search.toLowerCase();
      const haystack = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  function toggleFilter(setSelected) {
    return (id) => {
      setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
      setPage(1);
    };
  }

  function clearFilters() {
    setSelectedDepartments([]);
    setSelectedCategories([]);
    setFromDate("");
    setToDate("");
    setTagFilter("");
    setPage(1);
  }

  const hasFilters = selectedDepartments.length || selectedCategories.length || fromDate || toDate || tagFilter;

  if (!items.length) {
    return (
      <>
        <PageTitle title="Knowledge Base" subtitle={isAdmin ? "Manage and view published posts." : "Latest posts from your admins."} />
        <div className="empty-state">No knowledge posts or tasks yet.</div>
      </>
    );
  }

  return (
    <>
      <div className="kb-layout">
        <aside className={`kb-sidebar ${showFilters ? "open" : ""}`}>
          <div className="kb-sidebar-header">
            <strong>Filters</strong>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
          <FilterSection title="Department">
            {data.departments.map((item) => (
              <CheckboxFilter key={`dept-${item.id}`} label={item.name} checked={selectedDepartments.includes(String(item.id))} onChange={() => toggleFilter(setSelectedDepartments)(String(item.id))} />
            ))}
          </FilterSection>
          <FilterSection title="Category">
            {(data.categories || []).map((item) => (
              <CheckboxFilter key={`cat-${item.id}`} label={item.name} checked={selectedCategories.includes(String(item.id))} onChange={() => toggleFilter(setSelectedCategories)(String(item.id))} />
            ))}
          </FilterSection>
          <FilterSection title="Date">
            <label className="kb-date">
              From <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} />
            </label>
            <label className="kb-date">
              To <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} />
            </label>
          </FilterSection>
          <FilterSection title="Tag">
            <select value={tagFilter} onChange={(event) => { setTagFilter(event.target.value); setPage(1); }}>
              <option value="">All Tags</option>
              {(data.tags || []).map((item) => (
                <option key={item.id} value={item.name}>
                  #{item.name}
                </option>
              ))}
            </select>
          </FilterSection>
        </aside>

        <main className="kb-main">
          <div className="searchbar wide">
            <Search size={17} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search knowledge base by title or description" />
          </div>
          <div className={`knowledge-feed`}>
            {paginated.map((post) => (
              <article className="knowledge-card" key={`${post.source}-${post.id}`}>
                <header className="knowledge-card-header">
                  <div className="knowledge-card-author">
                    <div className="profile-dot">{post.uploaderName?.slice(0, 1) || "A"}</div>
                    <div>
                      <strong>{post.uploaderName}</strong>
                      <span>
                        {formatDate(post.createdAt)} {post.departmentName ? ` · ${post.departmentName}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="knowledge-card-actions">
                    <BookmarkButton contentType={post.source} contentId={post.id} initialBookmarked={(data.bookmarks || []).some((b) => b.contentType === post.source && b.contentId === post.id)} />
                    <button type="button" className="primary" onClick={() => onViewItem(post.id, post.source)}>View</button>
                  </div>
                </header>
                <div className="knowledge-card-body">
                  <h3>
                    {/* {post.source === "task" ? "[Task] " : ""} */}
                    {post.title}
                  </h3>
                  {post.description && <p>{post.description}</p>}
                  {(post.categoryName || post.tags?.length) ? (
                    <div className="knowledge-card-meta">
                      {post.categoryName && <span className="meta-chip" style={{ background: "var(--sidebar-active)" }}>{post.categoryName}</span>}
                      {post.tags?.map((tag) => (
                        <span className="meta-chip" key={tag}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {(post.files?.length || post.fileUrl) && (
                  <FileCarousel files={post.files?.length ? post.files : [{ fileUrl: post.fileUrl, fileExtension: post.fileExtension }]} contentType={post.contentType} title={post.title} />
                )}
              </article>
            ))}
            {!paginated.length && <div className="empty-state">No matching posts found.</div>}
          </div>
          {totalPages > 1 && (
            <div className="kb-pagination">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {safePage} of {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          )}
        </main >
      </div >
    </>
  );
}