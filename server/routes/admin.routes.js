const express = require("express");
const { auth, adminOnly, requirePermission } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { toMySQLDate } = require("../utils/db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../middleware/auth.middleware");
const roleService = require("../services/role.service");

const router = express.Router();

router.use(auth);

router.post("/impersonate/:userId", adminOnly, async (req, res) => {
  const targetUserId = Number(req.params.userId);
  const adminUserId = Number(req.body.adminUserId);

  if (!adminUserId || adminUserId !== req.user.id) {
    return res.status(400).json({ message: "Invalid admin user." });
  }

  const targetUser = await db.getUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (targetUser.role === "admin") {
    return res.status(400).json({ message: "Admin cannot impersonate another admin." });
  }

  const permissions = await roleService.getUserPermissions(targetUserId);
  const payload = { ...db.sanitizeUser(targetUser), permissions };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: payload });
});

router.get("/users/:userId/activity", requirePermission(["dashboard", "users_full"]), async (req, res) => {
  const userId = Number(req.params.userId);
  const logs = await db.getActivityLogsByUser(userId, 200);
  res.json(logs);
});

router.get("/activity/recent", requirePermission("dashboard"), async (req, res) => {
  const logs = await db.getRecentActivityLogs(200);
  res.json(logs);
});

router.get("/videos/pending", requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  const videos = await db.getVideos({ status: "pending" });
  res.json(videos);
});

router.post("/videos/:id/approve", requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  reviewVideo(req, res, "approved");
});

router.post("/videos/:id/reject", requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  reviewVideo(req, res, "rejected");
});

router.get("/videos", requirePermission(["approvals_parent", "task_approval", "dashboard"]), async (req, res) => {
  const videos = await db.getVideos();
  res.json(videos);
});

router.get("/videos/:id", requirePermission(["approvals_parent", "task_approval", "dashboard"]), async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });
  res.json(video);
});

router.put("/videos/:id", requirePermission(["approvals_parent", "task_approval", "dashboard"]), async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });
  const updated = await db.updateVideo(video.id, req.body);
  res.json(updated);
});

router.delete("/videos/:id", requirePermission("knowledge_base_delete"), async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });
  await db.deleteVideo(video.id);
  res.json({ ok: true });
});

router.post("/videos/:id/review", requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  const status = req.body.decision === "approved" ? "approved" : "rejected";
  const updated = await db.updateVideo(video.id, {
    status,
    rejectionRemarks: req.body.remarks || null,
    approvedBy: req.user.id,
    reviewedAt: toMySQLDate()
  });

  await db.createNotification({
    userId: video.uploaderId,
    type: status === "approved" ? "video_approved" : "video_rejected",
    message: `Your video "${video.title}" has been ${status}.${updated.rejectionRemarks ? ` Remarks: ${updated.rejectionRemarks}` : ""}`,
    videoId: video.id,
    createdAt: toMySQLDate()
  });

  res.json(updated);
});

router.get("/analytics", requirePermission("dashboard"), async (req, res) => {
  const videos = await db.getVideos();
  const tasks = await db.getTasks();
  const knowledgePosts = await db.getKnowledgePosts();
  const users = await db.getUsers();
  const departments = await db.getDepartments();
  const comments = await db.getComments();

  const approvedVideos = videos.filter((video) => video.status === "approved");
  const approvedTasks = tasks.filter((task) => task.status === "approved");
  const publishedKnowledge = knowledgePosts.filter((post) => post.status === "published");

  const departmentStats = departments.map((department) => {
    const deptVideos = videos.filter((video) => video.departmentId === department.id);
    const deptTasks = tasks.filter((task) => task.departmentId === department.id);
    const deptKnowledge = knowledgePosts.filter((post) => post.departmentId === department.id);
    return {
      department,
      videos: deptVideos.length,
      tasks: deptTasks.length,
      knowledge: deptKnowledge.length,
      total: deptVideos.length + deptTasks.length + deptKnowledge.length
    };
  }).sort((a, b) => b.total - a.total);

  const userStats = users.map((user) => {
    const userVideos = videos.filter((video) => video.uploaderId === user.id);
    const userTasks = tasks.filter((task) => task.uploaderId === user.id);
    const userKnowledge = knowledgePosts.filter((post) => post.uploaderId === user.id);
    return {
      user,
      videos: userVideos.length,
      tasks: userTasks.length,
      knowledge: userKnowledge.length,
      total: userVideos.length + userTasks.length + userKnowledge.length
    };
  }).filter((stat) => stat.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);

  const statusStats = {
    tasks: {
      pending: tasks.filter((t) => t.status === "pending").length,
      approved: tasks.filter((t) => t.status === "approved").length,
      rejected: tasks.filter((t) => t.status === "rejected").length
    },
    knowledge: {
      published: knowledgePosts.filter((k) => k.status === "published").length,
      draft: knowledgePosts.filter((k) => k.status === "draft").length
    }
  };

  res.json({
    overview: {
      totalVideos: videos.length,
      totalTasks: tasks.length,
      totalKnowledgePosts: knowledgePosts.length,
      totalUsers: users.length,
      totalComments: comments.length,
      pendingApprovals: videos.filter((v) => v.status === "pending").length + tasks.filter((t) => t.status === "pending").length
    },
    statusStats,
    departmentStats: departmentStats.slice(0, 10),
    topContributors: userStats,
    topVideos: [...approvedVideos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
    topTasks: [...approvedTasks].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5),
    topKnowledge: [...publishedKnowledge].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5)
  });
});

async function reviewVideo(req, res, status) {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  await db.updateVideo(video.id, {
    status,
    rejectionRemarks: status === "rejected" ? req.body.remarks || null : null,
    approvedBy: req.user.id,
    approvedAt: status === "approved" ? toMySQLDate() : null
  });

  const updated = await db.getVideoById(video.id);
  await db.createNotification({
    userId: video.uploaderId,
    type: `video_${status}`,
    message: `Your video "${video.title}" has been ${status}.${updated.rejectionRemarks ? ` Remarks: ${updated.rejectionRemarks}` : ""}`,
    videoId: video.id,
    createdAt: toMySQLDate()
  });

  res.json(updated);
}

router.get("/roles", adminOnly, async (req, res) => {
  try {
    const roles = await roleService.getRoles();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch roles" });
  }
});

router.get("/permissions", adminOnly, async (req, res) => {
  try {
    const permissions = await roleService.getPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch permissions" });
  }
});

router.post("/roles", adminOnly, async (req, res) => {
  try {
    const roleName = req.body.role_name || req.body.name || req.body.roleName;
    const permissionIds = req.body.permission_ids || req.body.permissions || [];
    const newRole = await roleService.createRole(roleName, permissionIds, req.user?.id || 1);
    res.status(201).json({ success: true, role: newRole, message: "Role created successfully." });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || "Failed to create role." });
  }
});

router.put("/roles/:id", adminOnly, async (req, res) => {
  try {
    const roleName = req.body.role_name || req.body.name || req.body.roleName;
    const permissionIds = req.body.permission_ids || req.body.permissions || [];
    const updatedRole = await roleService.updateRole(req.params.id, roleName, permissionIds, req.user?.id || 1);
    res.json({ success: true, role: updatedRole, message: "Role updated successfully." });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || "Failed to update role." });
  }
});

router.delete("/roles/:id", adminOnly, async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ success: true, message: "Role deleted successfully." });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || "Failed to delete role." });
  }
});

router.get("/role-assignments", adminOnly, async (req, res) => {
  try {
    const assignments = await roleService.getUserRoleAssignments();
    res.json(assignments);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || "Failed to fetch role assignments." });
  }
});

router.post("/role-assignments", adminOnly, async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const updated = await roleService.assignRoleToUser(userId, roleId);
    res.json({ success: true, user: updated, message: "Role assigned successfully." });
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message || "Failed to assign role." });
  }
});

module.exports = router;
