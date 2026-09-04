const express = require("express");
const router = express.Router();
const { PriceSnapshot } = require("../models");

// GET /api/market/:symbol/history — recent snapshots for sparkline
router.get("/:symbol/history", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase().trim();
  const limit = Math.min(Number(req.query.limit) || 30, 100); // cap to prevent abuse

  try {
    const snapshots = await PriceSnapshot.find({ symbol })
      .sort({ fetchedAt: -1 })
      .limit(limit);

    // reverse so it's chronological (oldest -> newest) — easier for charting
    res.json(snapshots.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;
