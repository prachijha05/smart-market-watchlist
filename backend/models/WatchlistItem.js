const mongoose = require("mongoose");

const watchlistItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
  addedAt: { type: Date, default: Date.now },
  alertPriceHigh: { type: Number, default: null },
  alertPriceLow: { type: Number, default: null },
});

// A user shouldn't be able to add the same symbol twice
watchlistItemSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("WatchlistItem", watchlistItemSchema);
