const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const bookmarks = await db.getUserBookmarks(req.user.id);
  res.json(bookmarks);
});

router.post("/", auth, async (req, res) => {
  const { contentType, contentId } = req.body;
  if (!["video", "task", "knowledge"].includes(contentType)) {
    return res.status(400).json({ message: "Invalid content type" });
  }
  const id = await db.createBookmark(req.user.id, contentType, Number(contentId));
  const bookmark = await db.getUserBookmarks(req.user.id);
  res.status(201).json(bookmark.find((b) => b.id === id));
});

router.delete("/", auth, async (req, res) => {
  const { contentType, contentId } = req.body;
  if (!["video", "task", "knowledge"].includes(contentType)) {
    return res.status(400).json({ message: "Invalid content type" });
  }
  await db.deleteBookmark(req.user.id, contentType, Number(contentId));
  res.json({ ok: true });
});

module.exports = router;
