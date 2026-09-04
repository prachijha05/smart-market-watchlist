// Computed + stored audit trail of "what changed and why" — powers /api/watchlist/changes
const mongoose = require("mongoose");

const changeEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  symbol: { type: String, required: true, uppercase: true, trim: true },
  severity: {
    type: String,
    enum: ["none", "notable", "meaningful"],
    required: true,
  },
  reason: { type: String, default: "" },
  fromPrice: { type: Number, required: true },
  toPrice: { type: Number, required: true },
  computedAt: { type: Date, default: Date.now },
});

changeEventSchema.index({ userId: 1, symbol: 1, computedAt: -1 });

module.exports = mongoose.model("ChangeEvent", changeEventSchema);
