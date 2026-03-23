const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const Course = require("../models/course");
const Enrollment = require("../models/enrollment");
const Quiz = require("../models/quiz");
const Certificate = require("../models/certificate");

// ================= COURSES LIST =================
router.get("/study/courses", requireAuth, async (req, res) => {
  const courses = await Course.find({}).sort({ createdAt: -1 });
  return res.json({ courses });
});

// ================= ADMIN CREATE COURSE =================
router.post("/study/courses", requireAuth, requireAdmin, async (req, res) => {
  const { title, description, teacherId, totalLessons, offlineContent } = req.body;
  if (!title) return res.status(400).json({ message: "title is required" });

  const course = await Course.create({
    title: String(title).trim(),
    description: description ? String(description) : "",
    teacherId: teacherId || req.user._id,
    totalLessons: totalLessons !== undefined ? Number(totalLessons) : 0,
    offlineContent: Array.isArray(offlineContent) ? offlineContent : [],
  });

  return res.status(201).json({ message: "Course created", course });
});

// ================= ENROLL =================
router.post("/study/enroll/:courseId", requireAuth, async (req, res) => {
  const courseId = req.params.courseId;
  const course = await Course.findById(courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const existing = await Enrollment.findOne({ userId: req.user._id, courseId });
  if (existing) return res.status(200).json({ message: "Already enrolled", enrollment: existing });

  const enrollment = await Enrollment.create({
    userId: req.user._id,
    courseId,
    completedLessons: 0,
    totalLessons: course.totalLessons || 0,
  });

  return res.status(201).json({ message: "Enrolled successfully", enrollment });
});

// ================= PROGRESS =================
router.get("/study/progress/:courseId", requireAuth, async (req, res) => {
  const courseId = req.params.courseId;
  const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId });
  return res.json({ enrollment: enrollment || null });
});

// ================= QUIZZES LIST =================
router.get("/study/courses/:courseId/quizzes", requireAuth, async (req, res) => {
  const courseId = req.params.courseId;
  const quizzes = await Quiz.find({ courseId }).sort({ createdAt: -1 });

  // Do not expose correct answers to the client.
  const safeQuizzes = quizzes.map((q) => ({
    _id: q._id,
    courseId: q.courseId,
    title: q.title,
    questions: (q.questions || []).map((qu) => ({
      question: qu.question,
      options: qu.options || [],
    })),
    createdAt: q.createdAt,
  }));

  return res.json({ quizzes: safeQuizzes });
});

// ================= ADMIN CREATE QUIZ =================
router.post("/study/courses/:courseId/quizzes", requireAuth, requireAdmin, async (req, res) => {
  const courseId = req.params.courseId;
  const { title, questions } = req.body;
  if (!title) return res.status(400).json({ message: "title is required" });
  if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ message: "questions must be a non-empty array" });

  const normalized = questions.map((q) => ({
    question: q.question ? String(q.question) : "",
    options: Array.isArray(q.options) ? q.options.map((o) => String(o)) : [],
    correctAnswer: q.correctAnswer ? String(q.correctAnswer) : "",
  }));

  const quiz = await Quiz.create({
    courseId,
    title: String(title).trim(),
    questions: normalized,
  });

  return res.status(201).json({ message: "Quiz created", quiz });
});

// ================= QUIZ SUBMIT =================
router.post("/study/quizzes/:quizId/submit", requireAuth, async (req, res) => {
  const quizId = req.params.quizId;
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ message: "Quiz not found" });

  const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: quiz.courseId });
  if (!enrollment) return res.status(400).json({ message: "Enroll first to submit quiz" });

  const { answers } = req.body;
  // `answers` is an array aligned to `quiz.questions[i].options`.
  if (!Array.isArray(answers)) return res.status(400).json({ message: "answers must be an array" });

  const questionCount = quiz.questions.length;
  let correct = 0;
  for (let i = 0; i < Math.min(questionCount, answers.length); i++) {
    const expected = String(quiz.questions[i].correctAnswer || "").trim();
    const provided = String(answers[i] || "").trim();
    if (expected && provided && expected === provided) correct += 1;
  }

  const score = questionCount > 0 ? Math.round((correct / questionCount) * 100) : 0;

  enrollment.quizScores.push({ quizTitle: quiz.title, score });
  // Basic progress bump: treat a quiz submission as 1 lesson completion (if totals are set)
  enrollment.completedLessons += enrollment.totalLessons > 0 ? 1 : 0;
  enrollment.progressUpdatedAt = new Date();
  await enrollment.save();

  // Auto-issue certificate when course is completed
  let certificate = await Certificate.findOne({ userId: req.user._id, courseId: quiz.courseId });
  if (!certificate && enrollment.totalLessons > 0 && enrollment.completedLessons >= enrollment.totalLessons) {
    certificate = await Certificate.create({
      userId: req.user._id,
      courseId: quiz.courseId,
      issuedDate: new Date(),
    });
  }

  return res.json({ message: "Quiz submitted", score, enrollment, certificate: certificate || null });
});

// ================= CERTIFICATE =================
router.get("/study/certificates/:courseId", requireAuth, async (req, res) => {
  const courseId = req.params.courseId;
  const cert = await Certificate.findOne({ userId: req.user._id, courseId });
  return res.json({ certificate: cert || null });
});

// ================= OFFLINE CONTENT =================
router.get("/study/courses/:courseId/offline", requireAuth, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });
  return res.json({ offlineContent: course.offlineContent || [] });
});

// ================= FORUM (EMBEDDED) =================
router.get("/study/courses/:courseId/forum/posts", requireAuth, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });
  return res.json({ posts: course.forumPosts || [] });
});

router.post("/study/courses/:courseId/forum/posts", requireAuth, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const { content, media } = req.body;
  if (!content) return res.status(400).json({ message: "content is required" });

  course.forumPosts.push({
    authorId: req.user._id,
    content: String(content),
    media: Array.isArray(media) ? media : [],
    createdAt: new Date(),
  });

  await course.save();
  return res.status(201).json({ message: "Posted", posts: course.forumPosts });
});

module.exports = router;

