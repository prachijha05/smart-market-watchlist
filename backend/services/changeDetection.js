// The core "meaningful change" algorithm — Section 4 of the spec.
// Volatility-relative thresholds, not a flat % rule, because 2% is noise
// for a volatile stock and huge for a stable one.
const { PriceSnapshot, UserLastSeen, ChangeEvent } = require("../models");
const { mean, stdDev } = require("../utils/stats");

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const LOOKBACK = 20; // snapshots used for trailing volatility/volume

async function evaluateItem(userId, watchlistItem) {
  const { symbol, alertPriceHigh, alertPriceLow } = watchlistItem;

  const latest = await PriceSnapshot.findOne({ symbol }).sort({
    fetchedAt: -1,
  });
  if (!latest) {
    // Feed hasn't produced data for this symbol yet
    return {
      symbol,
      price: null,
      severity: "none",
      reason: "no data yet",
      asOf: null,
      stale: true,
    };
  }

  const stale =
    Date.now() - new Date(latest.fetchedAt).getTime() > STALE_THRESHOLD_MS;

  let lastSeen = await UserLastSeen.findOne({ userId, symbol });
  if (!lastSeen) {
    // First time this user has ever seen this symbol — seed the baseline,
    // nothing to diff against yet, so severity is 'none' by definition.
    lastSeen = await UserLastSeen.create({
      userId,
      symbol,
      lastSeenAt: new Date(),
      lastSeenPrice: latest.price,
      lastSeenVolume: latest.volume,
    });
    return {
      symbol,
      price: latest.price,
      changeSinceLastSeen: "+0.0%",
      severity: "none",
      reason: "",
      asOf: latest.fetchedAt,
      stale,
    };
  }

  const pctChange =
    (latest.price - lastSeen.lastSeenPrice) / lastSeen.lastSeenPrice;

  // Trailing stats for this symbol
  const recent = await PriceSnapshot.find({ symbol })
    .sort({ fetchedAt: -1 })
    .limit(LOOKBACK);
  const prices = recent.map((s) => s.price);
  const volumes = recent.map((s) => s.volume);
  const avgPrice = mean(prices);
  const avgVolume = mean(volumes) || 1; // avoid divide-by-zero

  // Floor the volatility so a handful of early snapshots (near-identical
  // prices) can't produce a near-zero stddev that flags every tiny move
  // as "meaningful". 0.15% of price is a reasonable noise floor.
  const rawStdDev = stdDev(prices);
  const volatility = Math.max(rawStdDev / avgPrice, 0.0015);

  const volumeRatio = latest.volume / avgVolume;

  // 52-week high/low, approximated here by all-time high/low of the
  // (short-lived, simulated) snapshot history — documented simplification.
  const allTime = await PriceSnapshot.aggregate([
    { $match: { symbol } },
    { $group: { _id: null, max: { $max: "$price" }, min: { $min: "$price" } } },
  ]);
  const high = allTime[0]?.max;
  const low = allTime[0]?.min;

  const crossedHigh =
    alertPriceHigh != null &&
    latest.price >= alertPriceHigh &&
    lastSeen.lastSeenPrice < alertPriceHigh;
  const crossedLow =
    alertPriceLow != null &&
    latest.price <= alertPriceLow &&
    lastSeen.lastSeenPrice > alertPriceLow;
  const isNewHigh = high != null && latest.price >= high;
  const isNewLow = low != null && latest.price <= low;

  const absPctChange = Math.abs(pctChange);

  let severity = "none";
  let reason = "";

  if (
    absPctChange > 1.5 * volatility ||
    crossedHigh ||
    crossedLow ||
    volumeRatio > 2.5 ||
    isNewHigh ||
    isNewLow
  ) {
    severity = "meaningful";
    if (crossedHigh) reason = `crossed your alert high of ₹${alertPriceHigh}`;
    else if (crossedLow) reason = `crossed your alert low of ₹${alertPriceLow}`;
    else if (isNewHigh) reason = "hit a new high";
    else if (isNewLow) reason = "hit a new low";
    else if (volumeRatio > 2.5)
      reason = `volume ${volumeRatio.toFixed(1)}x average`;
    else
      reason = `moved ${(pctChange * 100).toFixed(1)}%, beyond its normal range`;
  } else if (absPctChange > 0.75 * volatility) {
    severity = "notable";
    reason = `moved ${(pctChange * 100).toFixed(1)}%`;
  }

  if (severity !== "none") {
    await ChangeEvent.create({
      userId,
      symbol,
      severity,
      reason,
      fromPrice: lastSeen.lastSeenPrice,
      toPrice: latest.price,
    });
  }

  return {
    symbol,
    price: latest.price,
    changeSinceLastSeen: `${pctChange >= 0 ? "+" : ""}${(pctChange * 100).toFixed(1)}%`,
    severity,
    reason,
    asOf: latest.fetchedAt,
    stale,
  };
}

module.exports = { evaluateItem };
