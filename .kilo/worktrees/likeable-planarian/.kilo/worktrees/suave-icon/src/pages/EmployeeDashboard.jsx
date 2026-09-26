import { Filter } from "lucide-react";
import { PageTitle } from "../components/UI";
import { VideoSection } from "../components/VideoCard";

export function EmployeeDashboard({ data, session, content, departmentFilter, setDepartmentFilter, tagFilter, setTagFilter, openItem }) {
  const videos = (data.videos || [])
    .filter((item) => item.status === "approved")
    .map((item) => ({ ...item, contentType: "video" }));

  const tasks = (data.tasks || [])
    .filter((item) => item.status === "approved")
    .map((item) => ({ ...item, contentType: "task" }));

  const knowledgePosts = (data.knowledgePosts || [])
    .filter((item) => item.status === "published")
    .map((item) => ({ ...item, contentType: "knowledge" }));

  const allContent = [...videos, ...tasks, ...knowledgePosts];

  const recommended = allContent.filter((item) => item.isRecommended);
  const recentlyAdded = [...allContent].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const bookmarkCounts = {};
  (data.bookmarks || []).forEach((bookmark) => {
    const key = `${bookmark.contentType}-${bookmark.contentId}`;
    bookmarkCounts[key] = (bookmarkCounts[key] || 0) + 1;
  });

  const mostlyBookmarked = [...allContent]
    .map((item) => ({ ...item, bookmarkCount: bookmarkCounts[`${item.contentType}-${item.id}`] || 0 }))
    .filter((item) => item.bookmarkCount > 0)
    .sort((a, b) => b.bookmarkCount - a.bookmarkCount);

  return (
    <>
      <PageTitle
        eyebrow="Knowledge Portal"
        title={`Welcome back, ${session.name}`}
        subtitle="Discover approved task guides, reusable know-how, and the latest team knowledge from across ABM."
      />
      <FilterBar data={data} departmentFilter={departmentFilter} setDepartmentFilter={setDepartmentFilter} tagFilter={tagFilter} setTagFilter={setTagFilter} />
      <VideoSection title="Recommended" content={recommended} openItem={openItem} />
      <VideoSection title="Recently Added" content={recentlyAdded.slice(0, 8)} openItem={openItem} />
      <VideoSection title="Mostly Bookmarked" content={mostlyBookmarked.slice(0, 12)} openItem={openItem} />
    </>
  );
}

function FilterBar({ data, departmentFilter, setDepartmentFilter, tagFilter, setTagFilter }) {
  return (
    <div className="filter-row">
      <button className={departmentFilter === "all" ? "active-pill" : ""} onClick={() => setDepartmentFilter("all")}><Filter size={15} /> All Departments</button>
      {data.departments.map((department) => (
        <button className={departmentFilter === String(department.id) ? "active-pill" : ""} key={department.id} onClick={() => setDepartmentFilter(String(department.id))}>{department.name}</button>
      ))}
      <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
        <option value="">All Tags</option>
        {data.tags.map((tag) => <option key={tag.id} value={tag.name}>#{tag.name}</option>)}
      </select>
    </div>
  );
}
