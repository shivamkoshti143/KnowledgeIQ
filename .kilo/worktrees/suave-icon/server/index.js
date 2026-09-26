const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const db = require("./utils/db");

const authRoutes = require("./routes/auth.routes");
const bootstrapRoutes = require("./routes/bootstrap.routes");
const videoRoutes = require("./routes/video.routes");
const adminRoutes = require("./routes/admin.routes");
const commentRoutes = require("./routes/comment.routes");
const departmentRoutes = require("./routes/department.routes");
const tagRoutes = require("./routes/tag.routes");
const notificationRoutes = require("./routes/notification.routes");
const taskRoutes = require("./routes/task.routes");
const siteSettingsRoutes = require("./routes/site-settings.routes");
const categoryRoutes = require("./routes/category.routes");
const knowledgeRoutes = require("./routes/knowledge.routes");
const bookmarkRoutes = require("./routes/bookmark.routes");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.use("/api/auth", authRoutes);
app.use("/api/bootstrap", bootstrapRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", commentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

app.post("/api/videos/:id/review", require("./middleware/auth.middleware").auth, require("./middleware/auth.middleware").adminOnly, async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  await db.updateVideo(video.id, {
    status: req.body.decision === "approved" ? "approved" : "rejected",
    rejectionRemarks: req.body.remarks || null,
    approvedBy: req.user.id,
    approvedAt: req.body.decision === "approved" ? new Date().toISOString() : null
  });

  const updated = await db.getVideoById(video.id);
  await db.createNotification({
    userId: video.uploaderId,
    type: `video_${updated.status}`,
    message: `Your video "${video.title}" has been ${updated.status}.${updated.rejectionRemarks ? ` Remarks: ${updated.rejectionRemarks}` : ""}`,
    videoId: video.id,
    createdAt: new Date().toISOString()
  });

  res.json(updated);
});

app.post("/api/tasks/:id/review", require("./middleware/auth.middleware").auth, require("./middleware/auth.middleware").adminOnly, async (req, res) => {
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

app.get("/api/recommended", require("./middleware/auth.middleware").auth, async (req, res) => {
  const recommended = await db.getRecommendedContent();
  res.json(recommended);
});

app.put("/api/users/:id", require("./middleware/auth.middleware").auth, require("./middleware/auth.middleware").adminOnly, async (req, res) => {
  const user = await db.updateUser(Number(req.params.id), req.body);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

app.post("/api/notifications/read", require("./middleware/auth.middleware").auth, async (req, res) => {
  await db.query("UPDATE notifications SET readAt = ? WHERE userId = ?", [new Date().toISOString(), req.user.id]);
  res.json({ ok: true });
});

app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "..", "dist", "index.html");
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send("Frontend build not found. Run npm run client during development.");
});

app.listen(PORT, () => {
  console.log(`ABM TaskIQ API running on http://localhost:${PORT}`);
});
