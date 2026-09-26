const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { name, email, password, departmentId } = req.body;

  if (!email.endsWith("@abmindia.com")) {
    return res.status(400).json({ message: "Use your ABM company email." });
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const userId = await db.createUser(name, email, passwordHash, "employee", Number(departmentId), "Employee");

  const user = await db.getUserById(userId);
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user });
});

router.post("/login", async (req, res) => {
  const user = await db.getUserByEmail(req.body.email);

  if (!user || !bcrypt.compareSync(req.body.password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign(db.sanitizeUser(user), JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: db.sanitizeUser(user) });
});

router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
