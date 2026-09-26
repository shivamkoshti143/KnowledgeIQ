const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, adminOnly, requirePermission } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { toMySQLDate } = require("../utils/db");

const router = express.Router();
const knowledgeUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "..", "uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, name);
    }
  })
});

router.get("/", auth, async (req, res) => {
  const { departmentId, categoryId, q = "" } = req.query;
  const isAdmin = req.user?.role === "admin";
  const siteSettings = await db.getSiteSettings();
  let deptFilter = departmentId;
  if (siteSettings.restrictByDepartment && !isAdmin) {
    const freshUser = (await db.getUserById(req.user.id)) || req.user;
    deptFilter = freshUser.departmentId || -1;
  }
  const posts = await db.getKnowledgePosts({
    status: isAdmin ? undefined : "published",
    departmentId: deptFilter,
    categoryId,
    q
  });
  res.json(posts);
});

router.post("/", auth, knowledgeUpload.array("files", 10), async (req, res) => {
  try {
    const postId = await db.createKnowledgePost({
      title: req.body.title,
      description: req.body.description || "",
      contentType: req.body.contentType || "text",
      categoryId: req.body.categoryId || null,
      departmentId: req.body.departmentId || null,
      uploaderId: req.user.id,
      status: req.body.status || "published",
      tags: req.body.tags || ""
    });

    const files = req.files || [];
    for (const file of files) {
      await db.createKnowledgePostFile({
        knowledgePostId: postId,
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileExtension: path.extname(file.originalname).replace(".", "").toLowerCase()
      });
    }

    const post = await db.getKnowledgePostById(postId);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create knowledge post" });
  }
});

router.post("/:id/files/:fileId/approve", auth, requirePermission(["approvals_parent", "task_reapproval"]), async (req, res) => {
  const fileId = Number(req.params.fileId);
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });

  const file = (await db.getKnowledgePostFiles(post.id)).find((f) => f.id === fileId);
  if (!file) return res.status(404).json({ message: "File not found" });

  const decision = req.body.decision || "approved";
  await db.updateKnowledgePostFile(fileId, {
    approvalStatus: decision,
    adminRemarks: req.body.remarks || null
  });

  if (decision === "rejected") {
    await db.createNotification({
      userId: post.uploaderId,
      type: "file_rejected",
      message: `Your file "${file.fileExtension?.toUpperCase() || "FILE"}" for knowledge post "${post.title}" was rejected. Reason: ${req.body.remarks || "No reason provided"}`,
      taskId: post.id,
      createdAt: toMySQLDate()
    });
  }

  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.put("/:id/files/:fileId/replace", auth, knowledgeUpload.single("file"), async (req, res) => {
  const fileId = Number(req.params.fileId);
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });

  const existingFile = (await db.getKnowledgePostFiles(post.id)).find((f) => f.id === fileId);
  if (!existingFile) return res.status(404).json({ message: "File not found" });

  if (req.user.id !== post.uploaderId) {
    return res.status(403).json({ message: "Only the original uploader can replace this file." });
  }

  const newFile = req.file;
  if (!newFile) return res.status(400).json({ message: "No file uploaded." });

  const newFileUrl = `/uploads/${newFile.filename}`;
  const newFileExtension = path.extname(newFile.originalname).replace(".", "").toLowerCase();

  await db.updateKnowledgePostFile(fileId, {
    fileUrl: newFileUrl,
    fileName: newFile.originalname,
    fileExtension: newFileExtension,
    approvalStatus: "pending",
    adminRemarks: null
  });

  const admins = await db.getUsers();
  for (const admin of admins) {
    if (admin.role === "admin") {
      await db.createNotification({
        userId: admin.id,
        type: "file_replaced",
        message: `A file was replaced for knowledge post "${post.title}" and is awaiting re-approval.`,
        taskId: post.id,
        createdAt: toMySQLDate()
      });
    }
  }

  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.post("/:id/review", auth, requirePermission(["approvals_parent", "task_approval"]), async (req, res) => {
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });

  await db.updateKnowledgePost(post.id, {
    status: req.body.decision === "published" ? "published" : "draft",
    rejectionRemarks: req.body.remarks || null
  });

  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.put("/:id", auth, requirePermission("add_knowledge_post_admin"), async (req, res) => {
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });

  await db.updateKnowledgePost(post.id, req.body);
  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.post("/:id/recommend", auth, requirePermission("knowledge_recommendation"), async (req, res) => {
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Knowledge post not found" });

  await db.updateKnowledgePost(post.id, { isRecommended: req.body.isRecommended ? 1 : 0 });
  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await db.getKnowledgePostById(Number(req.params.id));
    if (!post) return res.status(404).json({ message: "Knowledge post not found" });

    const isOwner = post.uploaderId === req.user.id;
    const roleService = require("../services/role.service");
    const userPerms = await roleService.getUserPermissions(req.user.id);
    const hasDeletePerm = req.user.role === "admin" || (Array.isArray(userPerms) && userPerms.includes("knowledge_base_delete"));

    if (!hasDeletePerm && !isOwner) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }

    if (isOwner && !hasDeletePerm && !["draft", "pending"].includes(post.status)) {
      return res.status(400).json({ message: "Only unpublished posts can be deleted by the owner" });
    }

    if (post.uploaderId && hasDeletePerm && !isOwner) {
      const reasonText = req.body?.reason ? ` Reason: ${req.body.reason}` : "";
      await db.createNotification({
        userId: post.uploaderId,
        type: "content_removed",
        message: `Content is removed: Your knowledge post "${post.title}" was removed.${reasonText}`,
        taskId: null,
        createdAt: toMySQLDate()
      });
    }

    await db.deleteKnowledgePost(post.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting knowledge post:", err);
    res.status(500).json({ message: err.message || "Failed to delete knowledge post" });
  }
});

module.exports = router;
