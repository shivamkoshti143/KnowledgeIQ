const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { toMySQLDate } = require("../utils/db");

const router = express.Router();

router.get("/:type/:id/comments", auth, async (req, res) => {
  const id = Number(req.params.id);
  const type = req.params.type;

  if (type === "videos") {
    const comments = await db.getComments({ videoId: id });
    res.json(comments);
  } else if (type === "tasks") {
    const comments = await db.getComments({ taskId: id });
    res.json(comments);
  } else {
    res.status(400).json({ message: "Invalid type" });
  }
});

router.post("/:type/:id/comments", auth, async (req, res) => {
  const id = Number(req.params.id);
  const type = req.params.type;

  let item = null;
  let title = "";
  let uploaderId = null;

  if (type === "videos") {
    item = await db.getVideoById(id);
    if (item) {
      title = item.title;
      uploaderId = item.uploaderId;
    }
  } else if (type === "tasks") {
    item = await db.getTaskById(id);
    if (item) {
      title = item.title;
      uploaderId = item.uploaderId;
    }
  }

  if (!item) return res.status(404).json({ message: "Item not found" });

  const commentId = await db.createComment({
    videoId: type === "videos" ? id : undefined,
    taskId: type === "tasks" ? id : undefined,
    userId: req.user.id,
    parentId: req.body.parentId ? Number(req.body.parentId) : null,
    body: req.body.body,
    createdAt: toMySQLDate()
  });

  const comment = await db.getComments();
  const newComment = comment.find((c) => c.id === commentId);

  const notifyUserId = req.body.parentId
    ? (await db.getComments()).find((item) => item.id === Number(req.body.parentId))?.userId
    : uploaderId;

  if (notifyUserId && notifyUserId !== req.user.id) {
    await db.createNotification({
      userId: notifyUserId,
      type: "reply",
      message: `${req.user.name} added a discussion reply on "${title}".`,
      videoId: type === "videos" ? id : undefined,
      taskId: type === "tasks" ? id : undefined,
      commentId: commentId,
      readAt: null,
      createdAt: toMySQLDate()
    });
  }

  res.status(201).json(newComment);
});

router.get("/comments/:id/replies", auth, async (req, res) => {
  const parent = (await db.getComments()).find((item) => item.id === Number(req.params.id));
  if (!parent) return res.status(404).json({ message: "Comment not found" });
  const replies = await db.getComments();
  res.json(replies.filter((item) => item.parentId === parent.id));
});

module.exports = router;
