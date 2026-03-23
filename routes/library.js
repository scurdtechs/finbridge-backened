const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const User = require("../models/user");
const LibraryMaterial = require("../models/librarymaterial");

function normalizeText(s) {
  return String(s || "").trim();
}

// ================= LIST =================
router.get("/library/materials", requireAuth, async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category: normalizeText(category) } : {};
  const items = await LibraryMaterial.find(filter).sort({ createdAt: -1 });
  return res.json({ materials: items });
});

// ================= SEARCH =================
router.get("/library/materials/search", requireAuth, async (req, res) => {
  const { q, category, subject } = req.query;
  const query = {};
  if (category) query.category = normalizeText(category);
  if (subject) query.subject = normalizeText(subject);

  const search = q ? normalizeText(q) : "";
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const items = await LibraryMaterial.find(query).sort({ createdAt: -1 });
  return res.json({ materials: items });
});

// ================= RATE =================
router.post("/library/materials/:id/rate", requireAuth, async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "rating must be between 1 and 5" });
  }

  const material = await LibraryMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ message: "Material not found" });

  const existing = material.ratings.find((r) => String(r.userId) === String(req.user._id));
  if (existing) existing.value = rating;
  else material.ratings.push({ userId: req.user._id, value: rating });

  await material.save();
  return res.json({ message: "Rated", ratingsCount: material.ratings.length });
});

// ================= BOOKMARK (USER-LEVEL) =================
router.post("/library/materials/:id/bookmark", requireAuth, async (req, res) => {
  const materialId = req.params.id;
  const user = req.user;

  const already = user.libraryBookmarks.some((id) => String(id) === String(materialId));
  if (already) {
    user.libraryBookmarks = user.libraryBookmarks.filter((id) => String(id) !== String(materialId));
    await user.save();
    return res.json({ message: "Bookmark removed" });
  }

  // Ensure material exists
  const material = await LibraryMaterial.findById(materialId);
  if (!material) return res.status(404).json({ message: "Material not found" });

  user.libraryBookmarks.push(materialId);
  await user.save();
  return res.json({ message: "Bookmarked" });
});

// ================= BOOKMARKS LIST =================
router.get("/library/bookmarks", requireAuth, async (req, res) => {
  const user = req.user;
  const items = await LibraryMaterial.find({ _id: { $in: user.libraryBookmarks } }).sort({ createdAt: -1 });
  return res.json({ materials: items });
});

// ================= OFFLINE CONTENT =================
router.get("/library/materials/:id/offline", requireAuth, async (req, res) => {
  const material = await LibraryMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ message: "Material not found" });
  if (!material.offlineAvailable) return res.status(400).json({ message: "Offline content not available" });
  return res.json({ url: material.url, offlineAvailable: true });
});

// ================= ADMIN UPLOAD =================
router.post("/library/materials/admin/upload", requireAuth, requireAdmin, async (req, res) => {
  const { title, subject, url, category, offlineAvailable } = req.body;
  if (!title || !url) return res.status(400).json({ message: "title and url are required" });

  const material = await LibraryMaterial.create({
    title: String(title).trim(),
    subject: subject ? String(subject).trim() : "",
    url: String(url).trim(),
    category: category ? String(category).trim() : "",
    offlineAvailable: offlineAvailable === true || offlineAvailable === "true",
    uploaderId: req.user._id,
  });

  return res.status(201).json({ message: "Material uploaded", material });
});

module.exports = router;

