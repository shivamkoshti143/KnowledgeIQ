import { useEffect, useMemo, useState } from "react";
import { request } from "./api/client";
import { Shell } from "./components/Shell";
import { Toast } from "./components/UI";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Approvals } from "./pages/Approvals";
import { AIChat } from "./pages/AIChat";
import { AuthScreen } from "./pages/AuthScreen";
import { BookmarkFeed } from "./pages/BookmarkFeed";
import { CreateKnowledge } from "./pages/CreateKnowledge";
import { CreateTask } from "./pages/CreateTask";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { KnowledgeDetail } from "./pages/KnowledgeDetail";
import { KnowledgeFeed } from "./pages/KnowledgeFeed";
import { ManageTaxonomy } from "./pages/ManageTaxonomy";
import { ManageUsers } from "./pages/ManageUsers";
import { RoleManagement } from "./pages/RoleManagement";
import { RoleAssign } from "./pages/RoleAssign";
import { Notifications } from "./pages/Notifications";
import { RecommendedFeed } from "./pages/RecommendedFeed";
import { SearchResults } from "./pages/SearchResults";
import { SiteSettings } from "./pages/SiteSettings";
import { Tasks } from "./pages/Tasks";
import { canAccessRoute, getDefaultAllowedRoute } from "./utils/permissions";

const VALID_ROUTES = new Set([
  "home",
  "browse",
  "knowledge",
  "notifications",
  "tasks",
  "create-task",
  "admin",
  "manage",
  "create-knowledge",
  "knowledge-feed",
  "recommended",
  "bookmarks",
  "users",
  "role-management",
  "role-assign",
  "site-settings",
  "ai-assistant"
]);

function parseLocation() {
  try {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (hash) {
      const [pathPart, queryString] = hash.split("?");
      const params = new URLSearchParams(queryString || "");
      const path = pathPart.trim();

      const segments = path.split("/");
      if (segments[0] === "knowledge" && segments.length >= 3) {
        return {
          route: "knowledge",
          itemType: segments[1],
          itemId: isNaN(segments[2]) ? segments[2] : Number(segments[2])
        };
      }

      if (VALID_ROUTES.has(path)) {
        return {
          route: path,
          itemId: params.get("id") ? (isNaN(params.get("id")) ? params.get("id") : Number(params.get("id"))) : null,
          itemType: params.get("type") || "video"
        };
      }
    }

    const savedRoute = localStorage.getItem("taskiq-route");
    if (savedRoute && VALID_ROUTES.has(savedRoute)) {
      const savedId = localStorage.getItem("taskiq-selected-item-id");
      const savedType = localStorage.getItem("taskiq-selected-item-type");
      return {
        route: savedRoute,
        itemId: savedId ? (isNaN(savedId) ? savedId : Number(savedId)) : null,
        itemType: savedType || "video"
      };
    }
  } catch (_) {}
  return null;
}

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
  const initialLoc = parseLocation();
  const [session, setSession] = useState(readStoredSession);
  const [data, setData] = useState(null);
  const [route, setRoute] = useState(() => {
    const s = readStoredSession();
    const defaultRoute = s?.role === "admin" ? "admin" : "home";
    if (initialLoc?.route) {
      return initialLoc.route;
    }
    return defaultRoute;
  });
  const [selectedItemId, setSelectedItemId] = useState(() => initialLoc?.itemId || null);
  const [selectedItemType, setSelectedItemType] = useState(() => initialLoc?.itemType || "video");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [toast, setToast] = useState("");

  const [loadError, setLoadError] = useState("");

  const [impersonatedSession, setImpersonatedSession] = useState(null);

  useEffect(() => {
    if (!session) return;
    let targetHash = route;
    if (route === "knowledge" && selectedItemId) {
      targetHash = `knowledge?id=${selectedItemId}&type=${selectedItemType || "video"}`;
    }
    const currentHash = window.location.hash.replace(/^#\/?/, "");
    if (currentHash !== targetHash) {
      window.location.hash = targetHash;
    }
    localStorage.setItem("taskiq-route", route);
    if (route === "knowledge" && selectedItemId) {
      localStorage.setItem("taskiq-selected-item-id", String(selectedItemId));
      localStorage.setItem("taskiq-selected-item-type", selectedItemType || "video");
    } else {
      localStorage.removeItem("taskiq-selected-item-id");
      localStorage.removeItem("taskiq-selected-item-type");
    }
  }, [route, selectedItemId, selectedItemType, session]);

  useEffect(() => {
    const siteSettings = data?.siteSettings || {};
    const portalName = siteSettings.portalName || "TaskIQ";
    document.title = portalName;

    const faviconUrl = siteSettings.faviconUrl || "/favicon.png";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [data?.siteSettings]);

  useEffect(() => {
    function handleHashChange() {
      const loc = parseLocation();
      if (loc && loc.route) {
        setRoute(loc.route);
        if (loc.itemId !== undefined && loc.itemId !== null) {
          setSelectedItemId(loc.itemId);
        } else if (loc.route !== "knowledge") {
          setSelectedItemId(null);
        }
        if (loc.itemType) {
          setSelectedItemType(loc.itemType);
        }
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [session]);

  async function load() {
    if (!session && !impersonatedSession) return;
    setLoadError("");

    try {
      const bootstrap = await request("/bootstrap");
      setData(bootstrap);
      if (bootstrap?.currentUser) {
        const merged = { ...session, ...bootstrap.currentUser };
        localStorage.setItem("taskiq-user", JSON.stringify(merged));
        setSession(merged);
        if (impersonatedSession) {
          const mergedImpersonated = { ...impersonatedSession, ...bootstrap.currentUser };
          setImpersonatedSession(mergedImpersonated);
        }
      }
    } catch (error) {
      setLoadError(error.message || "Something went wrong");
    }
  }

  useEffect(() => {
    load().catch((error) => setToast(error.message));
  }, [session?.id, impersonatedSession?.id]);


  function onAuth(nextSession, token) {
    localStorage.setItem("taskiq-user", JSON.stringify(nextSession));
    localStorage.setItem("taskiq-token", token);
    localStorage.removeItem("taskiq-admin-token");
    setSession(nextSession);
    setImpersonatedSession(null);
    const loc = parseLocation();
    const defaultRoute = nextSession.role === "admin" ? "admin" : "home";
    const targetRoute = loc?.route || defaultRoute;
    setRoute(targetRoute);
  }

  function startImpersonation(user, token) {
    const adminToken = localStorage.getItem("taskiq-token");
    const adminSession = readStoredSession();
    localStorage.setItem("taskiq-admin-token", JSON.stringify({ session: adminSession, token: adminToken }));
    localStorage.setItem("taskiq-user", JSON.stringify(user));
    localStorage.setItem("taskiq-token", token);
    setSession(user);
    setImpersonatedSession(user);
    setRoute("home");
  }

  function switchBackToAdmin() {
    const stored = localStorage.getItem("taskiq-admin-token");
    if (!stored) return;
    const { session: adminSession, token: adminToken } = JSON.parse(stored);
    localStorage.setItem("taskiq-user", JSON.stringify(adminSession));
    localStorage.setItem("taskiq-token", adminToken);
    localStorage.removeItem("taskiq-admin-token");
    setSession(adminSession);
    setImpersonatedSession(null);
    setRoute("admin");
  }

  function logout() {
    localStorage.removeItem("taskiq-user");
    localStorage.removeItem("taskiq-token");
    localStorage.removeItem("taskiq-admin-token");
    localStorage.removeItem("taskiq-route");
    localStorage.removeItem("taskiq-selected-item-id");
    localStorage.removeItem("taskiq-selected-item-type");
    if (window.location.hash) {
      try {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (_) {}
    }
    setSession(null);
    setImpersonatedSession(null);
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

  useEffect(() => {
    if (!session) return;
    if (!canAccessRoute(session, route)) {
      const fallback = getDefaultAllowedRoute(session);
      if (fallback !== route) {
        setRoute(fallback);
      }
    }
  }, [session, route]);

  if (!session) return <AuthScreen onAuth={onAuth} />;
  if (!data) return loadError ? <div className="loading"><div style={{color:'#c00'}}>Error: {loadError}</div><button className="primary" onClick={logout} style={{marginTop:16}}>Logout and retry</button></div> : <div className="loading">Loading Knowledge Portal...<br/><small>If this persists, try logging in again.</small></div>;

  const shellProps = {
    session,
    data,
    route,
    setRoute,
    logout,
    unread: route === "notifications" ? 0 : data.notifications?.filter((note) => !note.readAt).length || 0,
    uploadsUnread: data.notifications?.filter((note) => !note.readAt && ["file_rejected", "file_replaced", "task_approved", "task_rejected", "knowledge_approved", "knowledge_rejected"].includes(note.type)).length || 0,
    impersonating: Boolean(impersonatedSession),
    switchBackToAdmin
  };

  const openItem = (id, type) => {
    setSelectedItemId(id);
    setSelectedItemType(type);
    setRoute("knowledge");
  };

  const hasRouteAccess = canAccessRoute(session, route);

  return (
    <Shell {...shellProps}>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
      {!hasRouteAccess && (
        <div className="panel" style={{ textAlign: "center", padding: "48px 24px", maxWidth: 500, margin: "40px auto" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--danger, #dc2626)" }}>Access Restricted</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 20 }}>You do not have permission to access this feature.</p>
          <button className="primary" onClick={() => setRoute(getDefaultAllowedRoute(session))}>Go to Permitted Dashboard</button>
        </div>
      )}
      {hasRouteAccess && route === "home" && (
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
      {hasRouteAccess && route === "browse" && <SearchResults data={data} content={visibleContent} openItem={openItem} />}

      {hasRouteAccess && route === "knowledge" && (
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
      {hasRouteAccess && route === "notifications" && <Notifications data={data} onChange={load} openItem={openItem} setRoute={setRoute} session={session} />}
      {hasRouteAccess && route === "tasks" && <Tasks data={data} session={session} onChange={load} setToast={setToast} setRoute={setRoute} openTask={(id) => openItem(id, "task")} />}
      {hasRouteAccess && route === "approvals" && <Approvals data={data} onChange={load} setToast={setToast} openItem={openItem} session={session} />}
      {hasRouteAccess && route === "create-task" && <CreateTask data={data} onCreated={load} setToast={setToast} setRoute={setRoute} />}
      {hasRouteAccess && route === "admin" && <AdminDashboard data={data} onChange={load} setToast={setToast} openItem={openItem} session={session} />}
      {hasRouteAccess && route === "manage" && <ManageTaxonomy data={data} onChange={load} setToast={setToast} session={session} />}
      {hasRouteAccess && route === "create-knowledge" && <CreateKnowledge data={data} onCreated={load} setToast={setToast} setRoute={setRoute} />}
      {hasRouteAccess && route === "knowledge-feed" && <KnowledgeFeed data={data} session={session} setRoute={setRoute} onViewItem={openItem} onChange={load} setToast={setToast} />}
      {hasRouteAccess && route === "recommended" && <RecommendedFeed data={data} session={session} setRoute={setRoute} openItem={openItem} />}
      {hasRouteAccess && route === "bookmarks" && <BookmarkFeed data={data} session={session} setRoute={setRoute} openItem={openItem} />}
      {hasRouteAccess && route === "users" && <ManageUsers data={data} onChange={load} session={session} onImpersonate={startImpersonation} setToast={setToast} />}
      {hasRouteAccess && route === "role-management" && session.role === "admin" && <RoleManagement setToast={setToast} onChange={load} />}
      {hasRouteAccess && route === "role-assign" && session.role === "admin" && <RoleAssign setToast={setToast} onChange={load} />}
      {hasRouteAccess && route === "site-settings" && <SiteSettings data={data} onSaved={load} setToast={setToast} />}
      {hasRouteAccess && route === "ai-assistant" && <AIChat data={data} session={session} setRoute={setRoute} openItem={openItem} />}
    </Shell>
  );
}
