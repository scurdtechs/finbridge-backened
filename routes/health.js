const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const MoodLog = require("../models/moodlog");
const Habit = require("../models/habit");
const FitnessLog = require("../models/fitnesslog");
const HealthResource = require("../models/healthresource");
const Reminder = require("../models/reminder");

// ----------------- MOOD LOGS -----------------
router.post("/health/moodlogs", requireAuth, async (req, res) => {
  try {
    const { mood, date, notes } = req.body;
    if (!mood) return res.status(400).json({ message: "mood is required" });

    const entry = await MoodLog.create({
      userId: req.user._id,
      mood: String(mood).trim(),
      date: date ? new Date(date) : new Date(),
      notes: notes ? String(notes) : "",
    });

    return res.status(201).json({ message: "Mood logged", entry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/health/moodlogs", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const entries = await MoodLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(Math.max(1, limit));
  return res.json({ entries });
});

// ----------------- FITNESS LOGS -----------------
router.post("/health/fitness", requireAuth, async (req, res) => {
  try {
    const { activityType, steps, calories, durationMinutes, notes, date } = req.body;
    const entry = await FitnessLog.create({
      userId: req.user._id,
      activityType: activityType ? String(activityType) : "fitness",
      steps: steps !== undefined ? Number(steps) : 0,
      calories: calories !== undefined ? Number(calories) : 0,
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : 0,
      notes: notes ? String(notes) : "",
      date: date ? new Date(date) : new Date(),
    });
    return res.status(201).json({ message: "Fitness logged", entry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/health/fitness", requireAuth, async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const entries = await FitnessLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(Math.max(1, limit));
  return res.json({ entries });
});

// ----------------- HABITS -----------------
router.post("/health/habits", requireAuth, async (req, res) => {
  try {
    const { task, progress, remindAt } = req.body;
    if (!task) return res.status(400).json({ message: "task is required" });

    const habit = await Habit.create({
      userId: req.user._id,
      task: String(task).trim(),
      progress: progress !== undefined ? Number(progress) : 0,
      remindAt: remindAt ? new Date(remindAt) : undefined,
    });

    return res.status(201).json({ message: "Habit created", habit });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/health/habits", requireAuth, async (req, res) => {
  const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.json({ habits });
});

router.put("/health/habits/:habitId/progress", requireAuth, async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });
    if (String(habit.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    if (req.body.progress !== undefined) habit.progress = Number(req.body.progress);
    if (req.body.remindAt !== undefined) habit.remindAt = req.body.remindAt ? new Date(req.body.remindAt) : undefined;
    habit.lastUpdatedAt = new Date();

    await habit.save();
    return res.json({ message: "Habit updated", habit });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------- MENTAL HEALTH RESOURCES (DB) -----------------
router.get("/health/resources", requireAuth, async (req, res) => {
  const category = req.query.category ? String(req.query.category) : undefined;
  const filter = category ? { category } : {};
  const resources = await HealthResource.find(filter).sort({ createdAt: -1 });
  return res.json({ resources });
});

// ----------------- REMINDERS -----------------
router.post("/health/reminders", requireAuth, async (req, res) => {
  try {
    const { task, remindAt, message } = req.body;
    if (!task || !remindAt) return res.status(400).json({ message: "task and remindAt are required" });

    const reminder = await Reminder.create({
      userId: req.user._id,
      task: String(task).trim(),
      remindAt: new Date(remindAt),
      message: message ? String(message) : "",
    });

    return res.status(201).json({ message: "Reminder created", reminder });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/health/reminders", requireAuth, async (req, res) => {
  const reminders = await Reminder.find({ userId: req.user._id }).sort({ remindAt: 1 }).limit(50);
  return res.json({ reminders });
});

router.post("/health/reminders/:id/mark-delivered", requireAuth, async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ message: "Reminder not found" });
    if (String(reminder.userId) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    reminder.delivered = true;
    await reminder.save();
    return res.json({ message: "Marked delivered", reminder });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

