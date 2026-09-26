const express = require("express");
const { auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const notifications = await db.getNotifications(req.user.id);
  res.json(notifications);
});

router.post("/read-all", auth, async (req, res) => {
  await db.query("UPDATE notifications SET readAt = ? WHERE userId = ?", [new Date().toISOString(), req.user.id]);
  res.json({ ok: true });
});

router.post("/:id/read", auth, async (req, res) => {
  const notification = await db.getOne("SELECT * FROM notifications WHERE id = ? AND userId = ?", [Number(req.params.id), req.user.id]);
  if (!notification) return res.status(404).json({ message: "Notification not found" });

  await db.query("UPDATE notifications SET readAt = ? WHERE id = ?", [new Date().toISOString(), notification.id]);
  const updated = await db.getOne("SELECT * FROM notifications WHERE id = ?", [notification.id]);
  res.json(updated);
});

module.exports = router;
