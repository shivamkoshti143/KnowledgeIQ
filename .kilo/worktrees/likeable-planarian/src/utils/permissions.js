export function hasPermission(session, requiredPerm) {
  if (!session) return false;
  if (session.role === "admin") return true;

  const userPerms = session.permissions || [];
  if (!Array.isArray(userPerms) || userPerms.length === 0) {
    return false;
  }

  if (Array.isArray(requiredPerm)) {
    return requiredPerm.some((perm) => userPerms.includes(perm));
  }

  return userPerms.includes(requiredPerm);
}

export const ROUTE_PERMISSION_MAP = {
  "home": "home",
  "tasks": ["tasks", "task_approval", "task_reapproval"],
  "browse": "browse",
  "create-task": "create-task",
  "knowledge-feed": "knowledge-feed",
  "recommended": "recommended",
  "bookmarks": "bookmarks",
  "ai-assistant": "ai-assistant",
  "notifications": "notifications",
  "knowledge": ["knowledge-feed", "home", "browse", "recommended", "bookmarks", "tasks"],
  "approvals": ["approvals_parent", "task_approval", "task_reapproval"],
  "admin": "dashboard",
  "manage": ["manage_taxonomy", "taxonomy_departments", "taxonomy_categories"],
  "create-knowledge": "add_knowledge_post_admin",
  "users": "users_full",
  "site-settings": "site_settings",
  "role-management": "__admin_only__",
  "role-assign": "__admin_only__"
};

export function canAccessRoute(session, routeName) {
  if (!session) return false;
  if (session.role === "admin") return true;

  const perm = ROUTE_PERMISSION_MAP[routeName];
  if (!perm) return true; // Default allow for unspecified subroutes
  if (perm === "__admin_only__") return false;

  return hasPermission(session, perm);
}

export function getDefaultAllowedRoute(session) {
  if (!session) return "home";
  if (session.role === "admin") return "admin";

  const priorityRoutes = [
    "home",
    "knowledge-feed",
    "tasks",
    "browse",
    "create-task",
    "recommended",
    "bookmarks",
    "ai-assistant",
    "admin",
    "manage",
    "create-knowledge",
    "users",
    "notifications"
  ];

  for (const route of priorityRoutes) {
    if (canAccessRoute(session, route)) {
      return route;
    }
  }

  return "knowledge-feed";
}
