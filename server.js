require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Load routes with error handling
let usersRouter, walletRouter, loansRouter, studyRouter, libraryRouter, marketRouter;
let finGramRouter, eventsRouter, healthRouter, mentorshipRouter, groupsRouter;
let entertainmentRouter, volunteerRouter, techRouter, aiRouter, adminRouter;
let offlineRouter, smartStudyRouter, campusRouter, skillsRouter, labsRouter;
let arvrRouter, gamificationRouter, notificationsRouter;

try {
  usersRouter = require("./routes/user");
  walletRouter = require("./routes/wallet");
  loansRouter = require("./routes/loans");
  studyRouter = require("./routes/study");
  libraryRouter = require("./routes/library");
  marketRouter = require("./routes/market");
  finGramRouter = require("./routes/fingram");
  eventsRouter = require("./routes/events");
  healthRouter = require("./routes/health");
  mentorshipRouter = require("./routes/mentorship");
  groupsRouter = require("./routes/groups");
  entertainmentRouter = require("./routes/entertainment");
  volunteerRouter = require("./routes/volunteer");
  techRouter = require("./routes/tech");
  aiRouter = require("./routes/ai");
  adminRouter = require("./routes/admin");
  offlineRouter = require("./routes/offline");
  smartStudyRouter = require("./routes/smartstudy");
  campusRouter = require("./routes/campus");
  skillsRouter = require("./routes/skills");
  labsRouter = require("./routes/labs");
  arvrRouter = require("./routes/arvr");
  gamificationRouter = require("./routes/gamification");
  notificationsRouter = require("./routes/notifications");
} catch (error) {
  console.error("Error loading routes:", error.message);
}

const app = express();
app.disable("x-powered-by");

const defaultAllowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://finbridge-fronted-6ru9.vercel.app",
  "https://finbridge-fronted-qi4n.vercel.app",
];

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultAllowedOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

function getMongoUri() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("Database Error: MONGO_URI is not defined");
  return mongoUri;
}

async function ensureMongoConnected() {
  const uri = getMongoUri();
  global.__finbridgeMongo = global.__finbridgeMongo || { conn: null, promise: null };

  if (global.__finbridgeMongo.conn) return global.__finbridgeMongo.conn;

  if (!global.__finbridgeMongo.promise) {
    global.__finbridgeMongo.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 5000 })
      .then((m) => {
        global.__finbridgeMongo.conn = m.connection;
        return global.__finbridgeMongo.conn;
      });
  }

  return global.__finbridgeMongo.promise;
}

// For Vercel serverless, connect lazily per request with caching.
app.use(async (req, res, next) => {
  try {
    await ensureMongoConnected();
    return next();
  } catch (err) {
    console.error("Database connection error:", err.message);
    return res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Handle favicon requests
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Only use routes that loaded successfully
if (usersRouter) app.use("/api", usersRouter);
if (walletRouter) app.use("/api", walletRouter);
if (loansRouter) app.use("/api", loansRouter);
if (studyRouter) app.use("/api", studyRouter);
if (libraryRouter) app.use("/api", libraryRouter);
if (marketRouter) app.use("/api", marketRouter);
if (finGramRouter) app.use("/api", finGramRouter);
if (eventsRouter) app.use("/api", eventsRouter);
if (healthRouter) app.use("/api", healthRouter);
if (mentorshipRouter) app.use("/api", mentorshipRouter);
if (groupsRouter) app.use("/api", groupsRouter);
if (entertainmentRouter) app.use("/api", entertainmentRouter);
if (volunteerRouter) app.use("/api", volunteerRouter);
if (techRouter) app.use("/api", techRouter);
if (aiRouter) app.use("/api", aiRouter);
if (adminRouter) app.use("/api", adminRouter);
if (offlineRouter) app.use("/api", offlineRouter);
if (smartStudyRouter) app.use("/api", smartStudyRouter);
if (campusRouter) app.use("/api", campusRouter);
if (skillsRouter) app.use("/api", skillsRouter);
if (labsRouter) app.use("/api", labsRouter);
if (arvrRouter) app.use("/api", arvrRouter);
if (notificationsRouter) app.use("/api", notificationsRouter);
if (gamificationRouter) app.use("/api", gamificationRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Vercel serverless export and local dev fallback
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`FinBridge backend running on port ${PORT}`));
}

