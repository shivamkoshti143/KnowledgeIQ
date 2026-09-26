import { useState } from "react";
import {
  Bell,
  BookOpen,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  UserCheck,
  UserCog,
  ClipboardCheck,
  X
} from "lucide-react";
import { hasPermission } from "../utils/permissions";
import { getInitials } from "../utils/initials";

export function Shell({ children, session, data, route, setRoute, logout, unread, uploadsUnread, impersonating, switchBackToAdmin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [elevatedOpen, setElevatedOpen] = useState(true);
  const admin = session.role === "admin";
  const userDeptId = session?.departmentId || session?.department_id;
  const matchedDept = data?.departments?.find((item) => String(item.id) === String(userDeptId));
  const departmentName = matchedDept?.name || session?.departmentName || "";
  const siteSettings = data.siteSettings || {};
  const portalName = siteSettings.portalName || "TaskIQ";
  const logoUrl = siteSettings.logoUrl || "";

  // Count pending approvals
  const pendingTasks = (data.tasks || []).filter((t) => t.status === "pending");
  const pendingKnowledge = (data.knowledgePosts || []).filter((k) => k.status === "pending");
  const reApprovalTasks = (data.tasks || []).filter((t) => t.status !== "pending" && (t.files || []).some((f) => f.approvalStatus === "pending"));
  const reApprovalKnowledge = (data.knowledgePosts || []).filter((k) => k.status !== "pending" && (k.files || []).some((f) => f.approvalStatus === "pending"));
  const approvalsCount = pendingTasks.length + pendingKnowledge.length + reApprovalTasks.length + reApprovalKnowledge.length;

  const adminNavItems = [
    { key: "admin", icon: LayoutDashboard, label: "Dashboard" },
    { key: "approvals", icon: ClipboardCheck, label: "Approvals" },
    { key: "browse", icon: Search, label: "Browse" },
    { key: "create-knowledge", icon: Plus, label: "Add Knowledge Post" },
    { key: "knowledge-feed", icon: BookOpen, label: "Knowledge Base" },
    { key: "recommended", icon: Star, label: "Recommended" },
    { key: "bookmarks", icon: BookmarkCheck, label: "Bookmarks" },
    { key: "ai-assistant", icon: Sparkles, label: "Knowledge Assistant" },
    { key: "manage", icon: Tags, label: "Manage Taxonomy" },
    { key: "users", icon: UserCog, label: "Users" },
    { key: "role-management", icon: ShieldCheck, label: "Role Management" },
    { key: "role-assign", icon: UserCheck, label: "Role Assign" },
    { key: "site-settings", icon: Settings, label: "Site Settings" },
    { key: "notifications", icon: Bell, label: "Notifications" }
  ];

  const employeeCoreNavItems = [
    { key: "home", icon: Home, label: "Home", perm: "home" },
    { key: "tasks", icon: FileText, label: "My Knowledge", perm: "tasks" },
    { key: "browse", icon: Search, label: "Browse", perm: "browse" },
    { key: "create-task", icon: Plus, label: "Submit Knowledge", perm: "create-task" },
    { key: "knowledge-feed", icon: BookOpen, label: "Knowledge Base", perm: "knowledge-feed" },
    { key: "recommended", icon: Star, label: "Recommended", perm: "recommended" },
    { key: "bookmarks", icon: BookmarkCheck, label: "Bookmarks", perm: "bookmarks" },
    { key: "ai-assistant", icon: Sparkles, label: "Knowledge Assistant", perm: "ai-assistant" },
    { key: "notifications", icon: Bell, label: "Notifications", perm: "notifications" }
  ];

  const employeeElevatedNavItems = [
    { key: "approvals", icon: ClipboardCheck, label: "Approvals", perm: ["approvals_parent", "task_approval", "task_reapproval"] },
    { key: "admin", icon: LayoutDashboard, label: "Dashboard", perm: "dashboard" },
    { key: "site-settings", icon: Settings, label: "Site Settings", perm: "site_settings" },
    { key: "manage", icon: Tags, label: "Manage Taxonomy", perm: ["manage_taxonomy", "taxonomy_departments", "taxonomy_categories"] },
    { key: "create-knowledge", icon: Plus, label: "Add Knowledge Post", perm: "add_knowledge_post_admin" },
    { key: "users", icon: UserCog, label: "Users", perm: "users_full" }
  ];

  const visibleEmployeeCoreNav = employeeCoreNavItems.filter((item) => hasPermission(session, item.perm));
  const visibleEmployeeElevatedNav = employeeElevatedNavItems.filter((item) => hasPermission(session, item.perm));
  const isElevatedActive = visibleEmployeeElevatedNav.some((item) => item.key === route);

  return (
    <div className="app-shell">
      {impersonating && (
        <div className="impersonation-banner">
          <span>Viewing as <strong>{session.name}</strong> ({session.email})</span>
          <button className="primary" onClick={switchBackToAdmin}>Switch back to Admin</button>
        </div>
      )}
      <div className={`sidebar-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""} ${admin ? "sidebar--admin" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo" /> : <span className="brand-placeholder">KP</span>}
            <span className="brand-title">{portalName}</span>
          </div>
          <div className="user-card">
            <div className="profile-dot">{admin ? "A" : getInitials(session.name)}</div>
            <div className="user-info">
              <strong>{admin ? "Admin" : session.name}</strong>
              {!admin && departmentName && <span>{departmentName}</span>}
            </div>
          </div>
        </div>
        <nav>
          {admin ? (
            /* Admin compulsory has all nodes directly visible */
            adminNavItems.map(({ key, icon: Icon, label }) => (
              <button
                className={route === key ? "active" : ""}
                key={key}
                onClick={() => {
                  setRoute(key);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={18} /> {label}
                {key === "approvals" && approvalsCount > 0 && <b>{approvalsCount}</b>}
                {key === "notifications" && route !== "notifications" && unread > 0 && <b>{unread}</b>}
                {key === "tasks" && uploadsUnread > 0 && <b>{uploadsUnread}</b>}
              </button>
            ))
          ) : (
            /* Employee has core features + Extra Features dropdown node if granted extra permissions */
            <>
              {visibleEmployeeCoreNav.map(({ key, icon: Icon, label }) => (
                <button
                  className={route === key ? "active" : ""}
                  key={key}
                  onClick={() => {
                    setRoute(key);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon size={18} /> {label}
                  {key === "approvals" && approvalsCount > 0 && <b>{approvalsCount}</b>}
                  {key === "notifications" && route !== "notifications" && unread > 0 && <b>{unread}</b>}
                  {key === "tasks" && uploadsUnread > 0 && <b>{uploadsUnread}</b>}
                </button>
              ))}

              {/* Extra Features dropdown node ONLY on Employee side */}
              {visibleEmployeeElevatedNav.length > 0 && (
                <div className="sidebar-dropdown-group">
                  <button
                    type="button"
                    className={`sidebar-dropdown-toggle ${isElevatedActive ? "has-active" : ""}`}
                    onClick={() => setElevatedOpen((prev) => !prev)}
                    title="Toggle Extra Features"
                  >
                    <div className="sidebar-dropdown-label">
                      <ShieldCheck size={18} />
                      <span>Extra Features</span>
                    </div>
                    <div className="sidebar-dropdown-meta">
                      {elevatedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                  </button>

                  {elevatedOpen && (
                    <div className="sidebar-dropdown-content">
                      {visibleEmployeeElevatedNav.map(({ key, icon: Icon, label }) => (
                        <button
                          className={`sidebar-dropdown-item ${route === key ? "active" : ""}`}
                          key={key}
                          onClick={() => {
                            setRoute(key);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Icon size={16} /> <span>{label}</span>
                          {key === "approvals" && approvalsCount > 0 && <b>{approvalsCount}</b>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {visibleEmployeeCoreNav.length === 0 && visibleEmployeeElevatedNav.length === 0 && (
                <div style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                  No accessible features assigned.
                </div>
              )}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="logout" onClick={() => {
            if (impersonating) {
              switchBackToAdmin();
            } else {
              logout();
            }
          }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <span>{portalName}</span>
        </header>
        {children}
      </main>
    </div>
  );
}
