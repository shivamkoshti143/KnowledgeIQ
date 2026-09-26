const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const departments = await db.getDepartments();
  const tags = await db.getTags();
  const categories = await db.getCategories();
  const isAdmin = req.user?.role === "admin";
  const videos = isAdmin ? await db.getVideos() : await db.getVideos({ status: "approved" });
  const comments = await db.getComments();
  const users = await db.getUsers();
  const notifications = await db.getNotifications(req.user.id);
  const tasks = isAdmin ? await db.getTasks() : await db.getTasks({ status: "approved" });
  const knowledgePosts = isAdmin ? await db.getKnowledgePosts() : await db.getKnowledgePosts({ status: "published" });
  const siteSettings = await db.getSiteSettings();
  const bookmarks = await db.getUserBookmarks(req.user.id);

  res.json({
    currentUser: req.user,
    departments,
    tags,
    categories,
    videos,
    comments,
    users,
    notifications,
    tasks,
    knowledgePosts,
    siteSettings,
    bookmarks
  });
});

module.exports = router;
