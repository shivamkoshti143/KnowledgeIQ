const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const roleService = require("../services/role.service");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const departments = await db.getDepartments();
  const tags = await db.getTags();
  const categories = await db.getCategories();
  const videos = await db.getVideos();
  const comments = await db.getComments();
  const users = await db.getUsers();
  const notifications = await db.getNotifications(req.user.id);
  const tasks = await db.getTasks();
  const knowledgePosts = await db.getKnowledgePosts();
  const siteSettings = await db.getSiteSettings();
  const bookmarks = await db.getUserBookmarks(req.user.id);
  const aiChats = await db.getAiChatsByUser(req.user.id);

  const myVideos = videos.filter((video) => video.uploaderId === req.user.id);
  const myTasks = tasks.filter((task) => task.uploaderId === req.user.id);
  const myKnowledgePosts = knowledgePosts.filter((post) => post.uploaderId === req.user.id);

  const freshUser = (await db.getUserById(req.user.id)) || req.user;
  const permissions = await roleService.getUserPermissions(req.user.id);

  res.json({
    currentUser: {
      ...freshUser,
      permissions
    },
    departments,
    tags,
    categories,
    videos,
    comments,
    users,
    notifications,
    tasks,
    myTasks,
    knowledgePosts,
    myKnowledgePosts,
    myVideos,
    siteSettings,
    bookmarks,
    aiChats
  });
});

module.exports = router;
