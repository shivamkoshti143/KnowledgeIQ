const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const roleService = require("../services/role.service");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const departments = await db.getDepartments();
  const tags = await db.getTags();
  const categories = await db.getCategories();
  const comments = await db.getComments();
  const users = await db.getUsers();
  const notifications = await db.getNotifications(req.user.id);
  const bookmarks = await db.getUserBookmarks(req.user.id);
  const aiChats = await db.getAiChatsByUser(req.user.id);
  const freshUser = (await db.getUserById(req.user.id)) || req.user;
  const permissions = await roleService.getUserPermissions(req.user.id);

  const siteSettings = await db.getSiteSettings();
  const isRestricted = Boolean(siteSettings.restrictByDepartment);
  const isAdmin = freshUser.role === "admin";
  const userDeptId = freshUser.departmentId || null;

  let tasks, knowledgePosts, videos;
  if (isRestricted && !isAdmin) {
    if (userDeptId) {
      tasks = await db.getTasks({ departmentId: userDeptId });
      const userTasks = await db.getTasks({ uploaderId: req.user.id });
      const tIds = new Set(tasks.map(t => t.id));
      for (const ut of userTasks) {
        if (!tIds.has(ut.id)) tasks.push(ut);
      }

      knowledgePosts = await db.getKnowledgePosts({ departmentId: userDeptId });
      const allK = await db.getKnowledgePosts();
      const userK = allK.filter(k => k.uploaderId === req.user.id);
      const kIds = new Set(knowledgePosts.map(k => k.id));
      for (const uk of userK) {
        if (!kIds.has(uk.id)) knowledgePosts.push(uk);
      }

      videos = await db.getVideos({ departmentId: userDeptId });
      const userV = await db.getVideos({ uploaderId: req.user.id });
      const vIds = new Set(videos.map(v => v.id));
      for (const uv of userV) {
        if (!vIds.has(uv.id)) videos.push(uv);
      }
    } else {
      tasks = await db.getTasks({ uploaderId: req.user.id });
      const allK = await db.getKnowledgePosts();
      knowledgePosts = allK.filter(k => k.uploaderId === req.user.id);
      videos = await db.getVideos({ uploaderId: req.user.id });
    }
  } else {
    videos = await db.getVideos();
    tasks = await db.getTasks();
    knowledgePosts = await db.getKnowledgePosts();
  }

  const myVideos = (await db.getVideos({ uploaderId: req.user.id })).filter((video) => video.uploaderId === req.user.id);
  const myTasks = (await db.getTasks({ uploaderId: req.user.id })).filter((task) => task.uploaderId === req.user.id);
  const myKnowledgePosts = (await db.getKnowledgePosts()).filter((post) => post.uploaderId === req.user.id);

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
