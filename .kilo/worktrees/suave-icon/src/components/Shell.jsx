import { useState } from "react";
import {
  Bell,
  BookOpen,
  BookmarkCheck,
  ChevronDown,
  FileText,
  FileVideo,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Star,
  Tags,
  UploadCloud,
  UserCog,
  X
} from "lucide-react";

export function Shell({ children, session, data, route, setRoute, logout, unread }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const admin = session.role === "admin";
  const departmentName = data.departments.find((item) => item.id === session.departmentId)?.name || "All Teams";
  const siteSettings = data.siteSettings || {};
  const portalName = siteSettings.portalName || "ABM TaskIQ";
  const logoUrl = siteSettings.logoUrl || "";
  const nav = admin
    ? [
      ["admin", LayoutDashboard, "Dashboard"],
      ["site-settings", Settings, "Site Settings"],
      ["tasks", FileText, "Knowledge"],
      ["manage", Tags, "Manage Taxonomy"],
      ["create-knowledge", Plus, "Add Knowledge Post"],
      ["knowledge-feed", BookOpen, "Knowledge Base"],
      ["recommended", Star, "Recommended"],
      ["bookmarks", BookmarkCheck, "Bookmarks"],
      ["users", UserCog, "Users"],
      ["notifications", Bell, "Notifications"]
    ]
    : [
      ["home", Home, "Home"],
      ["tasks", FileText, "My Knowledge"],
      ["browse", Search, "Browse"],
      ["create-task", Plus, "Submit Knowledge"],
      ["knowledge-feed", BookOpen, "Knowledge Base"],
      ["recommended", Star, "Recommended"],
      ["bookmarks", BookmarkCheck, "Bookmarks"],
      ["notifications", Bell, "Notifications"]
    ];

  return (
    <div className="app-shell">
      <div className={`sidebar-backdrop ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand">{logoUrl ? <img src={logoUrl} alt="Logo" className="brand-logo" /> : <span>KP</span>} {portalName}</div>
          {/* <p className="sidebar-subtitle">Learning, task guidance, and peer knowledge in one place.</p> */}
          <div className="user-card">
            <div className="profile-dot">{session.name.slice(0, 1)}</div>
            <div className="user-info">
              <strong>{session.name}</strong>
              <span>{session.role} ({departmentName})</span>
            </div>
          </div>
        </div>
        <nav>
          {nav.map(([key, Icon, label]) => (
            <button
              className={route === key ? "active" : ""}
              key={key}
              onClick={() => {
                setRoute(key);
                setMobileMenuOpen(false);
              }}
            >
              <Icon size={18} /> {label} {key === "notifications" && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout" onClick={() => {
            setMobileMenuOpen(false);
            logout();
          }}><LogOut size={18} /> Logout</button>
        </div>
      </aside>
      <section className="main-area">
        <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen((current) => !current)}>
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="content">{children}</div>
      </section>
    </div>
  );
}
