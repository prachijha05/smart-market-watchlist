// Minimal auth: a deviceId sent as a header, no password flow.
// Scope decision — a real deployment would replace this with OAuth.
const { User } = require("../models");

async function identifyUser(req, res, next) {
  const deviceId = req.header("x-device-id");

  if (!deviceId) {
    return res.status(400).json({ error: "Missing x-device-id header" });
  }

  try {
    // upsert: find the user, or create one on first contact
    let user = await User.findOne({ deviceId });
    if (!user) {
      user = await User.create({ deviceId });
    }
    req.user = user; // downstream routes read req.user._id
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to identify user" });
  }
}

module.exports = identifyUser;
