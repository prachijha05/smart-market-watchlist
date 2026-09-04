// Minimal user — just tracks a deviceId, no auth/password flow (documented scope decision)
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
