const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, requirePermission } = require("../middleware/auth.middleware");
const db = require("../utils/db");

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `site-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    }
  })
});

router.get("/", async (req, res) => {
  const settings = await db.getSiteSettings();
  res.json(settings);
});

router.post("/", auth, requirePermission("site_settings"), upload.fields([{ name: "logo" }, { name: "favicon" }]), async (req, res) => {
  const portalName = req.body.portalName;
  let logoUrl = req.body.logoUrl || "";
  let faviconUrl = req.body.faviconUrl || "";

  if (req.files?.logo?.[0]) {
    logoUrl = `/uploads/${req.files.logo[0].filename}`;
  }
  if (req.files?.favicon?.[0]) {
    faviconUrl = `/uploads/${req.files.favicon[0].filename}`;
  }

  const settings = await db.updateSiteSettings({
    portalName,
    logoUrl,
    faviconUrl
  });

  res.json(settings);
});

module.exports = router;
