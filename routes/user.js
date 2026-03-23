const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/user");
const { requireAuth } = require("../middleware/auth");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signJwt(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ================= REGISTER =================
router.post("/users/register", async (req, res) => {
  try {
    const { name, fullName, email, phone, password } = req.body;
    const resolvedName = (name || fullName || "").trim();

    if (!resolvedName || !phone || !password) {
      return res.status(400).json({ message: "Name, phone, and password are required" });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ message: "Phone already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: resolvedName,
      email: email || undefined,
      phone,
      password: hashedPassword,
      balance: 0,
      role: "user",
      isAdmin: false,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, phone: user.phone, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= LOGIN =================
router.post("/users/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ message: "Phone and password are required" });

    const user = await User.findOne({ phone }).select("+password");
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

    const token = signJwt(user);
    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, phone: user.phone, name: user.name, isAdmin: user.isAdmin, balance: user.balance, points: user.points },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= FORGOT PASSWORD (CONSOLE TOKEN) =================
router.post("/users/forgot-password", async (req, res) => {
  try {
    const { phone, email } = req.body;
    const query = phone ? { phone } : email ? { email } : null;
    if (!query) return res.status(400).json({ message: "Provide phone or email" });

    const user = await User.findOne(query);
    // Avoid leaking whether a user exists
    if (!user) return res.json({ message: "If an account exists, a reset token has been generated." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(resetToken);

    user.resetPasswordTokenHash = resetTokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Console-token approach (no SMTP dependency)
    console.log(`[FinBridge] Password reset token for ${user.phone}: ${resetToken}`);

    return res.json({ message: "Reset token generated. Check server console for the token." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= RESET PASSWORD =================
router.post("/users/reset-password", async (req, res) => {
  try {
    const { phone, email, token, newPassword } = req.body;
    const query = phone ? { phone } : email ? { email } : null;
    if (!query) return res.status(400).json({ message: "Provide phone or email" });

    if (!token || !newPassword) return res.status(400).json({ message: "Token and newPassword are required" });

    const user = await User.findOne(query);
    if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpires) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const isExpired = user.resetPasswordExpires.getTime() < Date.now();
    if (isExpired) return res.status(400).json({ message: "Token expired" });

    const providedHash = hashToken(token);
    if (providedHash !== user.resetPasswordTokenHash) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= ME =================
router.get("/users/me", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      points: user.points,
      isAdmin: user.isAdmin,
      deviceHealth: user.deviceHealth,
      interests: user.interests,
      avatar: user.avatar,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= UPDATE PROFILE =================
router.put("/users/profile", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { name, email, interests } = req.body;

    if (name !== undefined) user.name = String(name).trim();
    if (email !== undefined) user.email = email ? String(email).trim().toLowerCase() : undefined;
    if (interests !== undefined) user.interests = Array.isArray(interests) ? interests : [];

    await user.save();
    return res.json({ message: "Profile updated", user: { id: user._id, name: user.name, email: user.email, interests: user.interests } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= AVATAR =================
router.post("/users/avatar", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { avatar } = req.body;
    if (avatar === undefined) return res.status(400).json({ message: "avatar is required" });
    user.avatar = String(avatar);
    await user.save();
    return res.json({ message: "Avatar updated", avatar: user.avatar });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= DEVICE HEALTH REPORT =================
router.post("/users/device-health", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { battery, storage, cpu, memory } = req.body;

    if ([battery, storage, cpu, memory].every((v) => v === undefined)) {
      return res.status(400).json({ message: "Provide battery/storage/cpu/memory" });
    }

    if (battery !== undefined) user.deviceHealth.battery = Number(battery);
    if (storage !== undefined) user.deviceHealth.storage = Number(storage);
    if (cpu !== undefined) user.deviceHealth.cpu = Number(cpu);
    if (memory !== undefined) user.deviceHealth.memory = Number(memory);
    user.deviceHealth.lastReportedAt = new Date();

    await user.save();
    return res.json({ message: "Device health updated", deviceHealth: user.deviceHealth });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;