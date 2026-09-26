const express = require("express");
const path = require("path");
const multer = require("multer");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");

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
  const posts = await db.getKnowledgePosts({
    status: isAdmin ? undefined : "published",
    departmentId: isAdmin ? departmentId : undefined,
    categoryId: isAdmin ? categoryId : undefined,
    q: isAdmin ? q : undefined
  });
  res.json(posts);
});

router.post("/", auth, adminOnly, knowledgeUpload.array("files", 10), async (req, res) => {
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
      fileExtension: path.extname(file.originalname).replace(".", "").toLowerCase()
    });
  }

  const post = await db.getKnowledgePostById(postId);
  res.status(201).json(post);
});

router.put("/:id", auth, adminOnly, async (req, res) => {
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Post not found" });

  await db.updateKnowledgePost(post.id, req.body);
  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.post("/:id/recommend", auth, adminOnly, async (req, res) => {
  const post = await db.getKnowledgePostById(Number(req.params.id));
  if (!post) return res.status(404).json({ message: "Knowledge post not found" });

  await db.updateKnowledgePost(post.id, { isRecommended: req.body.isRecommended ? 1 : 0 });
  const updated = await db.getKnowledgePostById(post.id);
  res.json(updated);
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  await db.deleteKnowledgePost(Number(req.params.id));
  res.json({ ok: true });
});

module.exports = router;
