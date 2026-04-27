const express = require("express");
const router  = express.Router();
const { getAIResponse }           = require("../services/aiService");
const { getAllVisitors, saveVisitor } = require("../data/visitors");

// ── Main chat route ──
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await getAIResponse(message);
    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI error" });
  }
});

// ── HR WhatsApp response route ──
router.post("/hr-response", (req, res) => {
  const { status } = req.body;
  let reply = "";
  if (status === "coming")        reply = "The person is on the way to meet you.";
  if (status === "10min")         reply = "The person will be available in 10 minutes.";
  if (status === "not_available") reply = "The person is not available right now.";
  console.log("📩 HR Response:", reply);
  res.json({ success: true, reply });
});

// ── GET all stored visitors ──
router.get("/visitors", (req, res) => {
  res.json(getAllVisitors());
});

// ── Manually add/update a visitor (optional admin use) ──
router.post("/visitors", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const visitor = saveVisitor(name);
  res.json({ success: true, visitor });
});

module.exports = router;