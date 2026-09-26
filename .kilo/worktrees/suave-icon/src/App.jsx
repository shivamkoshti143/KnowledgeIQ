import { useEffect, useMemo, useState } from "react";
import { request } from "./api/client";
import { Shell } from "./components/Shell";
import { Toast } from "./components/UI";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AuthScreen } from "./pages/AuthScreen";
import { BookmarkFeed } from "./pages/BookmarkFeed";
import { CreateKnowledge } from "./pages/CreateKnowledge";
import { CreateTask } from "./pages/CreateTask";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { KnowledgeDetail } from "./pages/KnowledgeDetail";
import { KnowledgeFeed } from "./pages/KnowledgeFeed";
import { ManageTaxonomy } from "./pages/ManageTaxonomy";
import { ManageUsers } from "./pages/ManageUsers";
import { MyUploads } from "./pages/MyUploads";
import { Notifications } from "./pages/Notifications";
import { RecommendedFeed } from "./pages/RecommendedFeed";
import { SearchResults } from "./pages/SearchResults";
import { SiteSettings } from "./pages/SiteSettings";
import { Tasks } from "./pages/Tasks";
import { UploadPage } from "./pages/UploadPage";

function readStoredSession() {
  try {
    const raw = localStorage.getItem("taskiq-user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    localStorage.removeItem("taskiq-user");
    localStorage.removeItem("taskiq-token");
    return null;
  }
}

export function App() {
  const [session, setSession] = useState(readStoredSession);
  const [data, setData] = useState(null);
  const [route, setRoute] = useState(session?.role === "admin" ? "admin" : "home");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState("video");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [toast, setToast] = useState("");

  const [loadError, setLoadError] = useState("");

  async function load() {
    if (!session) return;
    setLoadError("");

    try {
      const bootstrap = await request("/bootstrap");
      setData(bootstrap);
    } catch (error) {
      setLoadError(error.message || "Something went wrong");
    }
  }

  useEffect(() => {
    load().catch((error) => setToast(error.message));
  }, [session?.id]);

  function onAuth(nextSession, token) {
    localStorage.setItem("taskiq-user", JSON.stringify(nextSession));
    localStorage.setItem("taskiq-token", token);
    setSession(nextSession);
    setRoute(nextSession.role === "admin" ? "admin" : "home");
  }

  function logout() {
    localStorage.removeItem("taskiq-user");
    localStorage.removeItem("taskiq-token");
    setSession(null);
    setData(null);
  }

  const visibleContent = useMemo(() => {
    if (!data) return [];

    const videos = (data.videos || [])
      .filter((item) => item.status === "approved")
      .map((item) => ({ ...item, contentType: "video" }));

    const tasks = (data.tasks || [])
      .filter((item) => item.status === "approved")
      .map((item) => ({ ...item, contentType: "task" }));

    const all = [...videos, ...tasks];
    return all.filter((item) => {
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).toLowerCase()) : [];
      const matchesDepartment = departmentFilter === "all" || item.departmentId === Number(departmentFilter);
      const matchesTag = !tagFilter || tags.includes(tagFilter.toLowerCase());
      return matchesDepartment && matchesTag;
    });
  }, [data, departmentFilter, tagFilter]);

  useEffect(() => {
    const siteSettings = data?.siteSettings?.portalName;
    if (siteSettings) {
      document.title = siteSettings;
    }
  }, [data?.siteSettings?.portalName]);

  if (!session) return <AuthScreen onAuth={onAuth} />;
  if (!data) return loadError ? <div className="loading"><div style={{color:'#c00'}}>Error: {loadError}</div><button className="primary" onClick={logout} style={{marginTop:16}}>Logout and retry</button></div> : <div className="loading">Loading Knowledge Portal...<br/><small>If this persists, try logging in again.</small></div>;

  const shellProps = {
    session,
    data,
    route,
    setRoute,
    logout,
    unread: data.notifications.filter((note) => !note.readAt).length
  };

  const openItem = (id, type) => {
    setSelectedItemId(id);
    setSelectedItemType(type);
    setRoute("knowledge");
  };

  return (
    <Shell {...shellProps}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      {route === "home" && (
        <EmployeeDashboard
          data={data}
          session={session}
          content={visibleContent}
          departmentFilter={departmentFilter}
          setDepartmentFilter={setDepartmentFilter}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          openItem={openItem}
        />
      )}
      {route === "browse" && <SearchResults data={data} content={visibleContent} openItem={openItem} />}
      {route === "upload" && <UploadPage data={data} onUploaded={load} setToast={setToast} />}
      {route === "uploads" && <MyUploads data={data} session={session} />}
      {route === "knowledge" && (
        <KnowledgeDetail
          data={data}
          session={session}
          contentType={selectedItemType}
          itemId={selectedItemId}
          onChange={load}
          setToast={setToast}
          setRoute={setRoute}
        />
      )}
      {route === "notifications" && <Notifications data={data} onChange={load} />}
      {route === "tasks" && <Tasks data={data} session={session} onChange={load} setToast={setToast} setRoute={setRoute} openTask={(id) => openItem(id, "task")} />}
      {route === "create-task" && <CreateTask data={data} onCreated={load} setToast={setToast} />}
      {route === "admin" && <AdminDashboard data={data} onChange={load} setToast={setToast} openItem={openItem} />}
      {route === "manage" && <ManageTaxonomy data={data} onChange={load} setToast={setToast} />}
      {route === "create-knowledge" && <CreateKnowledge data={data} onCreated={load} setToast={setToast} setRoute={setRoute} />}
      {route === "knowledge-feed" && <KnowledgeFeed data={data} session={session} setRoute={setRoute} onViewItem={openItem} />}
      {route === "recommended" && <RecommendedFeed data={data} session={session} setRoute={setRoute} openItem={openItem} />}
      {route === "bookmarks" && <BookmarkFeed data={data} session={session} setRoute={setRoute} openItem={openItem} />}
      {route === "users" && <ManageUsers data={data} onChange={load} />}
      {route === "site-settings" && <SiteSettings data={data} onSaved={load} setToast={setToast} />}
    </Shell>
  );
}
