// server.js — entry point: Express app setup + MongoDB connection
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { startMarketFeed } = require("./cron/marketFeed");
const identifyUser = require("./middleware/identifyUser");
const watchlistRoutes = require("./routes/watchlist");
const marketRoutes = require("./routes/market");
const app = express();

// --- Core middleware ---
app.use(cors()); // allow frontend (different port) to call this API
app.use(express.json()); // parse incoming JSON bodies
app.use("/api/watchlist", identifyUser, watchlistRoutes);
app.use("/api/market", marketRoutes);
// --- Health check route (so you can confirm server is alive before anything else exists) ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- MongoDB connection ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      startMarketFeed();
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
