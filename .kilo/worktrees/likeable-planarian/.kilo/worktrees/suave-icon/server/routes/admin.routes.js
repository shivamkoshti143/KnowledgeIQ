const express = require("express");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.use(auth, adminOnly);

router.get("/videos/pending", async (req, res) => {
  const videos = await db.getVideos({ status: "pending" });
  res.json(videos);
});

router.post("/videos/:id/approve", async (req, res) => {
  reviewVideo(req, res, "approved");
});

router.post("/videos/:id/reject", async (req, res) => {
  reviewVideo(req, res, "rejected");
});

router.get("/users", async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

router.put("/users/:id", async (req, res) => {
  const user = await db.updateUser(Number(req.params.id), req.body);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

router.get("/analytics", async (req, res) => {
  const videos = await db.getVideos();
  const departments = await db.getDepartments();
  const approvedVideos = videos.filter((video) => video.status === "approved");
  const departmentActivity = departments.map((department) => ({
    department,
    videoCount: approvedVideos.filter((video) => video.departmentId === department.id).length
  }));

  res.json({
    totalVideos: videos.length,
    pendingApprovals: videos.filter((video) => video.status === "pending").length,
    totalUsers: (await db.getUsers()).length,
    activeDiscussions: (await db.getComments()).length,
    mostViewedVideos: [...approvedVideos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5),
    mostActiveDepartments: departmentActivity.sort((a, b) => b.videoCount - a.videoCount).slice(0, 5)
  });
});

async function reviewVideo(req, res, status) {
  const video = await db.getVideoById(Number(req.params.id));
  if (!video) return res.status(404).json({ message: "Video not found" });

  await db.updateVideo(video.id, {
    status,
    rejectionRemarks: status === "rejected" ? req.body.remarks || null : null,
    approvedBy: req.user.id,
    approvedAt: status === "approved" ? new Date().toISOString() : null
  });

  const updated = await db.getVideoById(video.id);
  await db.createNotification({
    userId: video.uploaderId,
    type: `video_${status}`,
    message: `Your video "${video.title}" has been ${status}.${updated.rejectionRemarks ? ` Remarks: ${updated.rejectionRemarks}` : ""}`,
    videoId: video.id,
    createdAt: new Date().toISOString()
  });

  res.json(updated);
}

module.exports = router;
