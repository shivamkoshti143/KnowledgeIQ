const express = require("express");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const departments = await db.getDepartments();
  res.json(departments);
});

router.post("/", auth, adminOnly, async (req, res) => {
  const id = await db.createDepartment(req.body.name, req.body.description || "");
  const department = await db.getDepartmentById(id);
  res.status(201).json(department);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const department = await db.getDepartmentById(Number(req.params.id));
  if (!department) return res.status(404).json({ message: "Department not found" });
  await db.updateDepartment(department.id, req.body.name, req.body.description || "");
  const updated = await db.getDepartmentById(department.id);
  res.json(updated);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await db.deleteDepartment(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
