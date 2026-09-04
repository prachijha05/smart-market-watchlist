const express = require("express");
const router = express.Router();

const { WatchlistItem } = require("../models");
const { evaluateItem } = require("../services/changeDetection");
const { UserLastSeen, PriceSnapshot } = require("../models");

// Allowed symbols from the simulated market feed
const { SEED_PRICES } = require("../cron/marketFeed");

// POST /api/watchlist — add a symbol
router.post("/", async (req, res) => {
  const { symbol, alertPriceHigh, alertPriceLow } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }

  const normalizedSymbol = symbol.toUpperCase().trim();

  // Validate that the symbol exists in our simulated market feed
  if (!Object.prototype.hasOwnProperty.call(SEED_PRICES, normalizedSymbol)) {
    return res.status(400).json({
      error: `Unsupported symbol. Allowed symbols: ${Object.keys(
        SEED_PRICES,
      ).join(", ")}`,
    });
  }

  try {
    const item = await WatchlistItem.create({
      userId: req.user._id,
      symbol: normalizedSymbol,
      alertPriceHigh: alertPriceHigh ?? null,
      alertPriceLow: alertPriceLow ?? null,
    });

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      // duplicate key — the unique (userId, symbol) index caught this
      return res
        .status(409)
        .json({ error: `${normalizedSymbol} is already on your watchlist` });
    }

    res.status(500).json({ error: "Failed to add symbol" });
  }
});

// GET /api/watchlist — list items with current price + severity
router.get("/", async (req, res) => {
  try {
    const items = await WatchlistItem.find({ userId: req.user._id }).sort({
      addedAt: -1,
    });

    const enriched = await Promise.all(
      items.map(async (item) => {
        const evalResult = await evaluateItem(req.user._id, item);

        return {
          ...item.toObject(),
          ...evalResult,
        };
      }),
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// DELETE /api/watchlist/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await WatchlistItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// PATCH /api/watchlist/:id — update alert thresholds
router.patch("/:id", async (req, res) => {
  const { alertPriceHigh, alertPriceLow } = req.body;

  try {
    const updated = await WatchlistItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        ...(alertPriceHigh !== undefined && { alertPriceHigh }),
        ...(alertPriceLow !== undefined && { alertPriceLow }),
      },
      { new: true },
    );

    if (!updated) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

// GET /api/watchlist/changes — only items with severity != "none"
router.get("/changes", async (req, res) => {
  try {
    const items = await WatchlistItem.find({ userId: req.user._id });

    const evaluated = await Promise.all(
      items.map((item) => evaluateItem(req.user._id, item)),
    );

    const changed = evaluated.filter((e) => e.severity !== "none");

    res.json(changed);
  } catch (err) {
    res.status(500).json({ error: "Failed to compute changes" });
  }
});

// POST /api/watchlist/:symbol/seen — explicitly move the diff baseline forward
router.post("/:symbol/seen", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase().trim();

  try {
    const latest = await PriceSnapshot.findOne({ symbol }).sort({
      fetchedAt: -1,
    });

    if (!latest) {
      return res
        .status(404)
        .json({ error: "No price data for this symbol yet" });
    }

    const updated = await UserLastSeen.findOneAndUpdate(
      { userId: req.user._id, symbol },
      {
        lastSeenAt: new Date(),
        lastSeenPrice: latest.price,
        lastSeenVolume: latest.volume,
      },
      { new: true, upsert: true },
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark as seen" });
  }
});

module.exports = router;
