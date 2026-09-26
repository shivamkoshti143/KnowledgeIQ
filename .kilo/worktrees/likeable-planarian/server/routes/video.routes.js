const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, adminOnly, requirePermission } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { query, toMySQLDate } = require("../utils/db");

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
  const { departmentId, categoryId, tag, status = "approved", q = "" } = req.query;
  const videos = await db.getVideos({
    status,
    departmentId,
    categoryId,
    tag,
    q
  });
  res.json(videos);
});

router.post("/", auth, upload.single("file"), async (req, res) => {
  const tags = String(req.body.tags || "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);

  for (const tag of tags) {
    const existing = await query("SELECT id FROM tags WHERE name = ?", [tag]);
    if (!existing.length) {
      await db.createTag(tag);
    }
  }

  const videoId = await db.createVideo({
    title: req.body.title,
    description: req.body.description,
    departmentId: Number(req.body.departmentId),
    categoryId: Number(req.body.categoryId) || null,
    uploaderId: req.user.id,
    tags,
    status: req.body.saveAsDraft === "true" ? "draft" : "pending",
    videoUrl: req.file ? `/uploads/${req.file.filename}` : "",
    fileName: req.file ? req.file.originalname : "",
    fileExtension: req.file ? path.extname(req.file.originalname).replace(".", "").toLowerCase() : "",
    viewCount: 0,
    duration: "00:00",
    thumbnail: "upload"
  });

  const video = await db.getVideoById(videoId);

  const admins = await db.getUsers();
  for (const admin of admins) {
    if (admin.role === "admin") {
      await db.createNotification({
        userId: admin.id,
        type: "approval_queue",
        message: `${video.title} is waiting for review.`,
        videoId: video.id,
        createdAt: toMySQLDate()
      });
    }
  }

  res.status(201).json(video);
});

router.post("/:id/view", auth, async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  await db.updateVideo(video.id, { viewCount: (video.viewCount || 0) + 1 });
  res.json({ viewCount: (video.viewCount || 0) + 1 });
});

router.post("/:id/recommend", auth, requirePermission("knowledge_recommendation"), async (req, res) => {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  await db.updateVideo(video.id, { isRecommended: req.body.isRecommended ? 1 : 0 });
  const updated = await db.getVideoById(video.id);
  res.json(updated);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const video = await db.getVideoById(Number(req.params.id));
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (video.uploaderId) {
      const reasonText = req.body?.reason ? ` Reason: ${req.body.reason}` : "";
      await db.createNotification({
        userId: video.uploaderId,
        type: "content_removed",
        message: `Content is removed by admin: Your video "${video.title}" was removed by an administrator.${reasonText}`,
        taskId: null,
        createdAt: toMySQLDate()
      });
    }

    await db.query("DELETE FROM comments WHERE videoId = ? AND parentId IS NOT NULL", [video.id]);
    await db.query("DELETE FROM comments WHERE videoId = ?", [video.id]);
    await db.query("DELETE FROM bookmarks WHERE contentType = 'video' AND contentId = ?", [video.id]);
    await db.query("DELETE FROM notifications WHERE videoId = ?", [video.id]);
    await db.query("DELETE FROM videos WHERE id = ?", [video.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting video:", err);
    res.status(500).json({ message: err.message || "Failed to delete video" });
  }
});

module.exports = router;
