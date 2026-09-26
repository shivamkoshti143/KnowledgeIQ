const express = require("express");
const { auth, adminOnly } = require("../middleware/auth.middleware");
const db = require("../utils/db");
const { chat, buildPortalAnswer } = require("../services/ai.service");

const router = express.Router();

router.post("/chat", auth, async (req, res) => {
  const userMessage = String(req.body.message || "").trim();
  if (!userMessage) return res.status(400).json({ message: "Message is required" });

  const previous = await db.getAiChatsByUser(req.user.id);
  const history = previous.slice(0, 20).reverse().map((item) => ({
    role: "user",
    content: item.message
  }));

  let reply = "";
  let references = [];
  try {
    const portalResult = await buildPortalAnswer(userMessage, db);
    if (portalResult.reply !== "I couldn't find that in our portal.") {
      reply = portalResult.reply;
      references = portalResult.references;
    } else {
      const result = await chat({
        messages: [...history, { role: "user", content: userMessage }],
        model: req.body.model || "meta-llama/llama-4-maverick:free"
      });
      reply = result.reply;
    }
  } catch (error) {
    return res.status(502).json({ message: error.message || "AI service unavailable" });
  }

  await db.createAiChat({
    userId: req.user.id,
    message: userMessage,
    response: reply,
    model: req.body.model || "meta-llama/llama-4-maverick:free"
  });

  res.json({ reply, references });
});

router.get("/chats", auth, async (req, res) => {
  const chats = await db.getAiChatsByUser(req.user.id);
  res.json(chats);
});

router.get("/users/:id/ai-chats", auth, adminOnly, async (req, res) => {
  const chats = await db.getAiChatsByUser(Number(req.params.id));
  res.json(chats);
});

module.exports = router;
