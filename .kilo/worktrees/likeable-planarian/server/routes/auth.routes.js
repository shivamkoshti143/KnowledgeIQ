const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, auth } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { sendOtpEmail } = require("../utils/email");
const roleService = require("../services/role.service");

const STATIC_OTP = "123456";

const router = express.Router();

function generateOtp() {
  return STATIC_OTP;
}

router.post("/signup", async (req, res) => {
  const { name, email, departmentId } = req.body;

  const isValidDomain = email && (email.endsWith("@abmindia.com") || email.endsWith("@abm.com"));
  if (!isValidDomain) {
    return res.status(400).json({ message: "Use your ABM company email (@abmindia.com or @abm.com)." });
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ message: "Email already registered." });
  }

  const otp = generateOtp();
  await db.createOtp(email, otp, "signup", { name, departmentId }, 10);

  await sendOtpEmail(email, otp, "signup");

  res.json({ otpSent: true, message: "OTP sent to your email." });
});

router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    const isValidDomain = email && (email.endsWith("@abmindia.com") || email.endsWith("@abm.com"));
    if (!isValidDomain) {
      return res.status(400).json({ message: "Enter a valid ABM company email (@abmindia.com or @abm.com)." });
    }

    const existing = await db.getUserByEmail(email);
    if (!existing) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    if (existing.status === "inactive") {
      return res.status(403).json({ message: "your account is inactive" });
    }

    const otp = generateOtp();
    await db.createOtp(email, otp, "login", null, 10);

    await sendOtpEmail(email, otp, "login");

    res.json({ otpSent: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message || "Something went wrong during login." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, mode } = req.body;

    if (!email || !otp || !mode) {
      return res.status(400).json({ message: "Email, OTP, and mode are required." });
    }

    const record = await db.getValidOtp(email, otp, mode);
    if (!record) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await db.deleteOtp(record.id);

    if (mode === "signup") {
      const metadata = typeof record.metadata === "string" ? JSON.parse(record.metadata) : (record.metadata || {});
      const userId = await db.createUser(
        metadata.name,
        email,
        null,
        "employee",
        Number(metadata.departmentId) || null,
        "Employee"
      );
      const user = await db.getUserById(userId);
      const permissions = await roleService.getUserPermissions(userId);
      const tokenPayload = { ...db.sanitizeUser(user), permissions };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "8h" });
      return res.json({ token, user: tokenPayload });
    }

    if (mode === "login") {
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
      if (user.status === "inactive") {
        return res.status(403).json({ message: "your account is inactive" });
      }
      const permissions = await roleService.getUserPermissions(user.id);
      const tokenPayload = { ...db.sanitizeUser(user), permissions };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "8h" });
      return res.json({ token, user: tokenPayload });
    }

    res.status(400).json({ message: "Invalid mode." });
  } catch (error) {
    console.error("verify-otp error:", error);
    res.status(500).json({ message: error.message || "Failed to verify OTP." });
  }
});

router.get("/me", auth, async (req, res) => {
  const freshUser = (await db.getUserById(req.user.id)) || req.user;
  const permissions = await roleService.getUserPermissions(req.user.id);
  res.json({ user: { ...freshUser, permissions } });
});

module.exports = router;
