const jwt = require("jsonwebtoken");
const User = require("../models/user");

function getTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2) return null;
  return parts[0] === "Bearer" ? parts[1] : null;
}

async function requireAuth(req, res, next) {
  const authHeader = req.header("Authorization");
  const token = getTokenFromHeader(authHeader);
  if (!token) return res.status(401).json({ message: "Unauthorized. Missing token." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Invalid token" });
    if (user.isSuspended) return res.status(403).json({ message: "Account suspended" });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin only" });
  return next();
}

module.exports = { requireAuth, requireAdmin };