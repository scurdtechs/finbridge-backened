const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");

// Lightweight local “AI” responses (no external AI service dependency)
router.post("/ai/study-assistant", requireAuth, async (req, res) => {
  const { courseId, prompt } = req.body;
  const advice = [
    "Summarize the key concepts into 5 bullet points.",
    "Turn each bullet into a question and attempt to answer from memory.",
    "Do a quick spaced-repetition pass tomorrow.",
  ];
  return res.json({
    courseId: courseId || null,
    prompt: prompt || "",
    suggestions: advice,
    nextSteps: ["Start with a 10-minute focus sprint", "Then review answers", "Save weak areas"],
  });
});

router.post("/ai/financial-advisor", requireAuth, async (req, res) => {
  const { prompt } = req.body;
  const balance = req.user.balance;
  const points = req.user.points;

  const risk = balance < 50 ? "high" : balance < 200 ? "medium" : "low";
  const suggestions = [
    balance < 50 ? "Pause non-essential microtransactions until balance improves." : "Consider saving a small portion before spending on marketplace items.",
    "Track your recent deposits/sends and categorize expenses.",
    points < 100 ? "Complete one course quiz to earn points and unlock study rewards." : "Keep momentum: set a weekly goal and check progress.",
  ];

  return res.json({
    prompt: prompt || "",
    riskAssessment: { liquidityRisk: risk },
    suggestions,
  });
});

router.post("/ai/notifications", requireAuth, async (req, res) => {
  const message = "Reminder: log your mood today and do a 10-minute study session.";
  // Optional: push notification to user would require saving User; keep stateless for now.
  return res.json({ message });
});

module.exports = router;

