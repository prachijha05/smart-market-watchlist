// One per user per symbol — the baseline the diff engine compares against.
// This does NOT update on every page load — only on explicit "mark as seen".
const mongoose = require("mongoose");

const userLastSeenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
  lastSeenAt: { type: Date, default: Date.now },
  lastSeenPrice: { type: Number, required: true },
  lastSeenVolume: { type: Number, required: true },
});

userLastSeenSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("UserLastSeen", userLastSeenSchema);
