const express = require("express");
const router = express.Router();

const { requireAuth, requireAdmin } = require("../middleware/auth");
const MarketItem = require("../models/marketitem");
const MarketMessage = require("../models/marketmessage");
const User = require("../models/user");
const Transaction = require("../models/transaction");

function toMoney(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// ================= LIST ITEMS =================
router.get("/market/items", requireAuth, async (req, res) => {
  const { category } = req.query;
  const filter = {};
  if (category) filter.category = String(category).trim();
  filter.status = "available";

  const items = await MarketItem.find(filter).sort({ createdAt: -1 });
  return res.json({ items });
});

// ================= ADD ITEM (SELL) =================
router.post("/market/items", requireAuth, async (req, res) => {
  try {
    const { title, description, price, category, images } = req.body;
    if (!title || price === undefined) return res.status(400).json({ message: "title and price are required" });

    const item = await MarketItem.create({
      title: String(title).trim(),
      description: description ? String(description) : "",
      price: toMoney(price),
      owner: req.user._id,
      category: category ? String(category).trim() : "",
      images: Array.isArray(images) ? images : [],
      status: "available",
    });

    return res.status(201).json({ message: "Item added", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= MARK ITEM SOLD =================
router.post("/market/items/:id/sell", requireAuth, async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (String(item.owner) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    item.status = "removed";
    await item.save();
    return res.json({ message: "Item removed", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= BUY ITEM =================
router.post("/market/items/:id/buy", requireAuth, async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.status !== "available") return res.status(400).json({ message: "Item not available" });

    if (String(item.owner) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot buy your own item" });
    }

    const amount = Number(item.price);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Invalid item price" });

    const buyer = req.user;
    if (buyer.balance < amount) return res.status(400).json({ message: "Insufficient balance" });

    const seller = await User.findById(item.owner);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    buyer.balance -= amount;
    seller.balance += amount;
    await buyer.save();
    await seller.save();

    item.status = "sold";
    item.buyer = buyer._id;
    item.soldAt = new Date();
    await item.save();

    await Transaction.create({
      type: "send",
      senderPhone: buyer.phone,
      receiverPhone: seller.phone,
      amount,
      meta: { marketItemId: String(item._id) },
    });

    // Start/record a message "system buy" if desired
    await MarketMessage.create({
      buyerId: buyer._id,
      sellerId: seller._id,
      itemId: item._id,
      content: "Purchase completed.",
      readBySeller: false,
      readByBuyer: true,
    });

    return res.json({ message: "Purchase successful", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= WISHLIST (TOGGLE) =================
router.post("/market/wishlist/:itemId", requireAuth, async (req, res) => {
  const { itemId } = req.params;
  const item = await MarketItem.findById(itemId);
  if (!item) return res.status(404).json({ message: "Item not found" });

  const already = req.user.marketWishlist.some((id) => String(id) === String(itemId));
  if (already) {
    req.user.marketWishlist = req.user.marketWishlist.filter((id) => String(id) !== String(itemId));
    await req.user.save();
    return res.json({ message: "Removed from wishlist" });
  }

  req.user.marketWishlist.push(itemId);
  await req.user.save();
  return res.json({ message: "Added to wishlist" });
});

router.get("/market/wishlist", requireAuth, async (req, res) => {
  const items = await MarketItem.find({ _id: { $in: req.user.marketWishlist } }).sort({ createdAt: -1 });
  return res.json({ items });
});

// ================= CHAT (BUYER <-> SELLER) =================
router.post("/market/items/:id/chat", requireAuth, async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const sellerId = item.owner;
    const buyerId = req.user._id;

    if (String(sellerId) === String(buyerId)) return res.status(400).json({ message: "Cannot chat as seller for this item" });
    const content = req.body.content;
    if (!content) return res.status(400).json({ message: "content is required" });

    const msg = await MarketMessage.create({
      buyerId,
      sellerId,
      itemId: item._id,
      content: String(content).trim(),
      readBySeller: false,
      readByBuyer: true,
    });

    return res.status(201).json({ message: "Message sent", msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/market/chats", requireAuth, async (req, res) => {
  const { otherUserId } = req.query;
  const userId = req.user._id;
  let query = {};

  if (otherUserId) {
    query = {
      $or: [
        { buyerId: userId, sellerId: otherUserId },
        { buyerId: otherUserId, sellerId: userId },
      ],
    };
  } else {
    query = { $or: [{ buyerId: userId }, { sellerId: userId }] };
  }

  const messages = await MarketMessage.find(query).sort({ createdAt: -1 }).limit(100);
  return res.json({ messages });
});

// Admin helper: remove sold items if needed
router.post("/market/admin/items/:id/remove", requireAuth, requireAdmin, async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    item.status = "removed";
    await item.save();
    return res.json({ message: "Item removed", item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

