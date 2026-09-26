const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-taskiq-secret";

const lastActiveMap = new Map();

async function touchUserActivity(userId) {
  if (!userId) return;
  const now = Date.now();
  const last = lastActiveMap.get(userId) || 0;
  if (now - last > 30000) {
    lastActiveMap.set(userId, now);
    try {
      const { pool } = require("../db");
      await pool.query("UPDATE users SET last_active_at = NOW() WHERE id = ?", [userId]);
    } catch (_) {}
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (req.user && req.user.id) {
      touchUserActivity(req.user.id);
    }
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}

function requirePermission(permKeys) {
  const keys = Array.isArray(permKeys) ? permKeys : [permKeys];
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role === "admin") {
      return next();
    }
    try {
      const roleService = require("../services/role.service");
      const userPerms = await roleService.getUserPermissions(req.user.id);
      req.user.permissions = userPerms;
      const hasAllowedPerm = keys.some((k) => userPerms.includes(k));
      if (!hasAllowedPerm) {
        return res.status(403).json({ message: "Access denied: insufficient permissions" });
      }
      next();
    } catch (err) {
      console.error("requirePermission check error:", err);
      return res.status(500).json({ message: "Error verifying user permissions" });
    }
  };
}

function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  auth,
  adminOnly,
  requirePermission
};
