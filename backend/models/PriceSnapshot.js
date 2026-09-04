// Append-only — one doc per symbol per poll interval. This is your price history.
const mongoose = require("mongoose");

const priceSnapshotSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true, trim: true },
  price: { type: Number, required: true },
  volume: { type: Number, required: true },
  fetchedAt: { type: Date, default: Date.now },
  source: {
    type: String,
    enum: ["live", "simulated", "cache-stale"],
    default: "simulated",
  },
});

// Fast lookup: "give me the last N snapshots for symbol X, newest first"
priceSnapshotSchema.index({ symbol: 1, fetchedAt: -1 });

module.exports = mongoose.model("PriceSnapshot", priceSnapshotSchema);
