const express = require("express");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const tags = await db.getTags();
  res.json(tags);
});

router.post("/", auth, adminOnly, async (req, res) => {
  const name = String(req.body.name || "").replace(/^#/, "").toLowerCase();
  const id = await db.createTag(name);
  const tag = await db.getOne("SELECT * FROM tags WHERE id = ?", [id]);
  res.status(201).json(tag);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await db.deleteTag(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
