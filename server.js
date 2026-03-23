require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const usersRouter = require("./routes/user");
const walletRouter = require("./routes/wallet");
const loansRouter = require("./routes/loans");
const studyRouter = require("./routes/study");
const libraryRouter = require("./routes/library");
const marketRouter = require("./routes/market");
const finGramRouter = require("./routes/fingram");
const eventsRouter = require("./routes/events");
const healthRouter = require("./routes/health");
const mentorshipRouter = require("./routes/mentorship");
const groupsRouter = require("./routes/groups");
const entertainmentRouter = require("./routes/entertainment");
const volunteerRouter = require("./routes/volunteer");
const techRouter = require("./routes/tech");
const aiRouter = require("./routes/ai");
const adminRouter = require("./routes/admin");
const offlineRouter = require("./routes/offline");
const smartStudyRouter = require("./routes/smartstudy");

const app = express();
app.disable("x-powered-by");

const defaultAllowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "https://finbridge-fronted-6ru9.vercel.app",
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
    return res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api", usersRouter);
app.use("/api", walletRouter);
app.use("/api", loansRouter);
app.use("/api", studyRouter);
app.use("/api", libraryRouter);
app.use("/api", marketRouter);
app.use("/api", finGramRouter);
app.use("/api", eventsRouter);
app.use("/api", healthRouter);
app.use("/api", mentorshipRouter);
app.use("/api", groupsRouter);
app.use("/api", entertainmentRouter);
app.use("/api", volunteerRouter);
app.use("/api", techRouter);
app.use("/api", aiRouter);
app.use("/api", adminRouter);
app.use("/api", offlineRouter);
app.use("/api", smartStudyRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Export a request handler for Vercel.
module.exports = app;

// Local dev fallback (optional)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

