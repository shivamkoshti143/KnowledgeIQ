const express = require("express");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const categories = await db.getCategories();
  res.json(categories);
});

router.post("/", auth, adminOnly, async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Category name is required" });

  const id = await db.query("INSERT INTO categories (name) VALUES (?)", [name]);
  const category = await db.getOne("SELECT * FROM categories WHERE id = ?", [id.insertId]);
  res.status(201).json(category);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const category = await db.getOne("SELECT * FROM categories WHERE id = ?", [req.params.id]);
  if (!category) return res.status(404).json({ message: "Category not found" });
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Category name is required" });
  await db.query("UPDATE categories SET name = ? WHERE id = ?", [name, category.id]);
  const updated = await db.getOne("SELECT * FROM categories WHERE id = ?", [category.id]);
  res.json(updated);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await db.deleteCategory(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
