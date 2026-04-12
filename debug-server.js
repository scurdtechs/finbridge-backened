require("dotenv").config();

const express = require("express");
const cors = require("cors");

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

// Basic test endpoints
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "FinBridge backend is running",
    timestamp: new Date().toISOString(),
    env: {
      hasMongoUri: !!process.env.MONGO_URI,
      hasJwtSecret: !!process.env.JWT_SECRET,
      clientOrigins: process.env.CLIENT_ORIGINS || "not set"
    }
  });
});

app.get("/", (req, res) => {
  res.json({ message: "FinBridge API Server" });
});

// Test route loading
app.get("/api/test", (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if required directories exist
    const utilsPath = path.join(__dirname, 'utils');
    const modelsPath = path.join(__dirname, 'models');
    const routesPath = path.join(__dirname, 'routes');
    
    const checks = {
      utils: fs.existsSync(utilsPath),
      models: fs.existsSync(modelsPath),
      routes: fs.existsSync(routesPath),
      utilsGamification: fs.existsSync(path.join(utilsPath, 'gamification.js')),
      routesUser: fs.existsSync(path.join(routesPath, 'user.js')),
    };
    
    res.json({ 
      message: "File system checks",
      checks,
      cwd: __dirname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Debug server running on port ${PORT}`));
}
