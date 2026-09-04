// Simulated market feed — deterministic, offline-safe random walk per symbol.
// Deliberate scope decision: no live paid API dependency during judging.
const cron = require("node-cron");
const { PriceSnapshot } = require("../models");

// Starter symbols with realistic seed prices (NSE-style, in ₹)
// In a fuller version this list would be derived from distinct symbols
// across all WatchlistItem docs — kept static here to keep the demo simple.
const SEED_PRICES = {
  RELIANCE: 2950,
  TCS: 4120,
  INFY: 1850,
  HDFCBANK: 1650,
  TATAMOTORS: 980,
};

// In-memory state: last known price + volume per symbol.
// This is intentionally NOT persisted separately — PriceSnapshot IS the
// persisted history; this object just tracks "where the walk currently is."
const state = {};
for (const [symbol, price] of Object.entries(SEED_PRICES)) {
  state[symbol] = { price, volume: 100000 };
}

function randomWalkStep(symbol) {
  const current = state[symbol];

  // Normal tick: small drift, ~±0.3% typical move
  let pctChange = (Math.random() - 0.5) * 0.006; // -0.3% to +0.3%
  let volumeMultiplier = 0.8 + Math.random() * 0.6; // 0.8x–1.4x normal volume

  // ~8% of ticks are a "spike" tick — bigger move + volume surge.
  // This exists purely so severity classification (Step 4) has real
  // "meaningful" events to detect during a demo, not just noise.
  const isSpike = Math.random() < 0.08;
  if (isSpike) {
    pctChange = (Math.random() - 0.5) * 0.04; // -2% to +2%
    volumeMultiplier = 2.5 + Math.random() * 2; // 2.5x–4.5x volume spike
  }

  const newPrice = +(current.price * (1 + pctChange)).toFixed(2);
  const newVolume = Math.round(current.volume * volumeMultiplier);

  state[symbol] = { price: newPrice, volume: newVolume };
  return state[symbol];
}
// Track symbols currently in a simulated failure state, so the failure
// persists for a few ticks instead of resolving on the very next one.
const failedUntil = {};

async function tick() {
  const symbols = Object.keys(SEED_PRICES);
  const now = Date.now();

  // Maybe start a new failure (only if nothing's currently failing)
  const anyCurrentlyFailing = Object.values(failedUntil).some((t) => t > now);
  if (!anyCurrentlyFailing && Math.random() < 0.1) {
    const target = symbols[Math.floor(Math.random() * symbols.length)];
    failedUntil[target] = now + 30 * 1000; // stays "failed" for 30s (~3 ticks)
    console.warn(`⚠️ Simulated feed failure for ${target} (30s)`);
  }

  const snapshots = symbols.map((symbol) => {
    const isFailing = failedUntil[symbol] && failedUntil[symbol] > now;

    if (isFailing) {
      const { price, volume } = state[symbol];
      return {
        symbol,
        price,
        volume,
        fetchedAt: new Date(now - 3 * 60 * 1000), // still backdated past stale threshold
        source: 'cache-stale',
      };
    }

    const { price, volume } = randomWalkStep(symbol);
    return { symbol, price, volume, fetchedAt: new Date(), source: 'simulated' };
  });

  try {
    await PriceSnapshot.insertMany(snapshots);
    console.log(`📈 Tick: wrote ${snapshots.length} snapshots`);
  } catch (err) {
    console.error('❌ Market feed tick failed:', err.message);
  }
}


function startMarketFeed() {
  // Every 10 seconds — frequent enough to feel "live" in a demo,
  // sparse enough not to flood Mongo. Tune freely.
  cron.schedule("*/10 * * * * *", tick);
  console.log("🟢 Simulated market feed started (every 10s)");

  // Run one tick immediately on boot so there's data right away,
  // instead of waiting up to 10s for the first cron fire.
  tick();
}

module.exports = { startMarketFeed, SEED_PRICES };
