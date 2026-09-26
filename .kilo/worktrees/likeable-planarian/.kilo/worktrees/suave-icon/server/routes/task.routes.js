const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

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

router.post("/", auth, upload.array("files", 10), async (req, res) => {
  const taskId = await db.createTask({
    title: req.body.title,
    description: req.body.description,
    departmentId: Number(req.body.departmentId),
    categoryId: Number(req.body.categoryId) || null,
    uploaderId: req.user.id,
    status: "pending"
  });

  const files = req.files || [];
  for (const file of files) {
    await db.createTaskFile({
      taskId,
      fileUrl: `/uploads/${file.filename}`,
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
        createdAt: new Date().toISOString()
      });
    }
  }

  res.status(201).json(task);
});

router.post("/:id/review", auth, adminOnly, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  await db.query(
    "UPDATE tasks SET status = ?, rejectionRemarks = ?, approvedBy = ?, approvedAt = ? WHERE id = ?",
    [
      req.body.decision === "approved" ? "approved" : "rejected",
      req.body.remarks || null,
      req.user.id,
      req.body.decision === "approved" ? new Date().toISOString() : null,
      task.id
    ]
  );

  const updated = await db.getTaskById(task.id);
  await db.createNotification({
    userId: task.uploaderId,
    type: `task_${updated.status}`,
    message: `Your task "${task.title}" has been ${updated.status}.`,
    taskId: task.id,
    createdAt: new Date().toISOString()
  });

  res.json(updated);
});

router.post("/:id/recommend", auth, adminOnly, async (req, res) => {
  const task = await db.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ message: "Task not found" });

  await db.updateTask(task.id, { isRecommended: req.body.isRecommended ? 1 : 0 });
  const updated = await db.getTaskById(task.id);
  res.json(updated);
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

module.exports = router;
