const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, adminOnly, requirePermission } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { toMySQLDate } = require("../utils/db");

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    }
  })
});

router.get("/", auth, async (req, res) => {
  const { status, departmentId, q = "" } = req.query;
  const tasks = await db.getTasks({ status, departmentId, q });
  res.json(tasks);
});

router.get("/:id", auth, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json(task);
});

router.post("/", auth, upload.array("files", 10), async (req, res) => {
  try {
    const taskId = await db.createTask({
      title: req.body.title,
      description: req.body.description,
      departmentId: Number(req.body.departmentId),
      categoryId: Number(req.body.categoryId) || null,
      uploaderId: req.user.id,
      status: "pending",
      tags: req.body.tags || ""
    });

    const files = req.files || [];
    for (const file of files) {
      await db.createTaskFile({
        taskId,
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileExtension: path.extname(file.originalname).replace(".", "").toLowerCase()
      });
    }

    const task = await db.getTaskById(taskId);
    const admins = await db.getUsers();
    for (const admin of admins) {
      if (admin.role === "admin") {
        await db.createNotification({
          userId: admin.id,
          type: "task_approval_queue",
          message: `${task.title} is waiting for review.`,
          taskId: task.id,
          createdAt: toMySQLDate()
        });
      }
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create task" });
  }
});

router.post("/:id/review", auth, requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  await db.query(
    "UPDATE tasks SET status = ?, rejectionRemarks = ?, approvedBy = ?, approvedAt = ? WHERE id = ?",
    [
      req.body.decision === "approved" ? "approved" : "rejected",
      req.body.remarks || null,
      req.user.id,
      req.body.decision === "approved" ? toMySQLDate() : null,
      task.id
    ]
  );

  const updated = await db.getTaskById(task.id);
  await db.createNotification({
    userId: task.uploaderId,
    type: `task_${updated.status}`,
    message: `Your task "${task.title}" has been ${updated.status}.`,
    taskId: task.id,
    createdAt: toMySQLDate()
  });

  res.json(updated);
});

router.post("/:id/files/:fileId/approve", auth, requirePermission(["approvals_parent", "task_reapproval"]), async (req, res) => {
  const fileId = Number(req.params.fileId);
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  const file = (await db.getTaskFiles(task.id)).find((f) => f.id === fileId);
  if (!file) return res.status(404).json({ message: "File not found" });

  const decision = req.body.decision || "approved";
  await db.updateTaskFile(fileId, {
    approvalStatus: decision,
    adminRemarks: req.body.remarks || null
  });

  if (decision === "rejected") {
    await db.createNotification({
      userId: task.uploaderId,
      type: "file_rejected",
      message: `Your file "${file.fileExtension?.toUpperCase() || "FILE"}" for task "${task.title}" was rejected. Reason: ${req.body.remarks || "No reason provided"}`,
      taskId: task.id,
      createdAt: toMySQLDate()
    });
  }

  const updated = await db.getTaskById(task.id);
  res.json(updated);
});

router.put("/:id/files/:fileId/replace", auth, upload.single("file"), async (req, res) => {
  const fileId = Number(req.params.fileId);
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  const existingFile = (await db.getTaskFiles(task.id)).find((f) => f.id === fileId);
  if (!existingFile) return res.status(404).json({ message: "File not found" });

  if (req.user.id !== task.uploaderId) {
    return res.status(403).json({ message: "Only the original uploader can replace this file." });
  }

  const newFile = req.file;
  if (!newFile) return res.status(400).json({ message: "No file uploaded." });

  const newFileUrl = `/uploads/${newFile.filename}`;
  const newFileExtension = path.extname(newFile.originalname).replace(".", "").toLowerCase();

  await db.updateTaskFile(fileId, {
    fileUrl: newFileUrl,
    fileName: newFile.originalname,
    fileExtension: newFileExtension,
    approvalStatus: "pending",
    adminRemarks: null
  });

  const admins = await db.getUsers();
  for (const admin of admins) {
    if (admin.role === "admin") {
      await db.createNotification({
        userId: admin.id,
        type: "file_replaced",
        message: `A file was replaced for task "${task.title}" and is awaiting re-approval.`,
        taskId: task.id,
        createdAt: toMySQLDate()
      });
    }
  }

  const updated = await db.getTaskById(task.id);
  res.json(updated);
});

router.post("/:id/recommend", auth, requirePermission("knowledge_recommendation"), async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  await db.updateTask(task.id, { isRecommended: req.body.isRecommended ? 1 : 0 });
  const updated = await db.getTaskById(task.id);
  res.json(updated);
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await db.getTaskById(Number(req.params.id));
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isOwner = task.uploaderId === req.user.id;
    const roleService = require("../services/role.service");
    const userPerms = await roleService.getUserPermissions(req.user.id);
    const hasDeletePerm = req.user.role === "admin" || (Array.isArray(userPerms) && userPerms.includes("knowledge_base_delete"));

    if (!hasDeletePerm && !isOwner) {
      return res.status(403).json({ message: "You can only delete your own tasks" });
    }

    if (isOwner && !hasDeletePerm && task.status !== "pending") {
      return res.status(400).json({ message: "Only pending tasks can be deleted by the owner" });
    }

    if (task.uploaderId && hasDeletePerm && !isOwner) {
      const reasonText = req.body?.reason ? ` Reason: ${req.body.reason}` : "";
      await db.createNotification({
        userId: task.uploaderId,
        type: "content_removed",
        message: `Content is removed: Your submission "${task.title}" was removed.${reasonText}`,
        taskId: null,
        createdAt: toMySQLDate()
      });
    }

    await db.deleteTask(task.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting task:", err);
    res.status(500).json({ message: err.message || "Failed to delete task" });
  }
});

router.get("/user/me", auth, async (req, res) => {
  const tasks = await db.getTasks();
  const myTasks = tasks.filter((task) => task.uploaderId === req.user.id);
  res.json(myTasks);
});

router.post("/:id/view", auth, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ id: task.id, title: task.title });
});

router.get("/:id/access", auth, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (task.uploaderId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Only owner or admin can view access" });
  const users = await db.getTaskAccessUsers(task.id);
  res.json(users);
});

router.post("/:id/access", auth, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (task.uploaderId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Only owner or admin can grant access" });
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "userId is required" });
  const user = await db.getUserById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  await db.grantTaskAccess(task.id, userId, req.user.id);
  const users = await db.getTaskAccessUsers(task.id);
  res.json(users);
});

router.delete("/:id/access/:userId", auth, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (task.uploaderId !== req.user.id && req.user.role !== "admin") return res.status(403).json({ message: "Only owner or admin can revoke access" });
  const targetUserId = Number(req.params.userId);
  await db.revokeTaskAccess(task.id, targetUserId);
  const users = await db.getTaskAccessUsers(task.id);
  res.json(users);
});

router.get("/accessible", auth, async (req, res) => {
  const allTasks = await db.getTasks({ status: "approved" });
  const accessible = allTasks.filter((task) => {
    if (task.uploaderId === req.user.id) return true;
    if (req.user.role === "admin") return true;
    return false;
  });
  const userAccess = await db.getUserTaskAccess(req.user.id);
  const accessTaskIds = new Set(userAccess.map((a) => a.taskId));
  const extra = allTasks.filter((task) => accessTaskIds.has(task.id) && task.uploaderId !== req.user.id);
  res.json([...accessible, ...extra]);
});

module.exports = router;
