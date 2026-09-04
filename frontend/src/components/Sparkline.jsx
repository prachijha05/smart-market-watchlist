function Sparkline({ data, width = 200, height = 40 }) {
  if (!data || data.length < 2) {
    return <span className="sparkline-empty">Not enough data yet</span>;
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1; // avoid divide-by-zero if price is flat

  const points = prices
    .map((price, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const trendUp = prices[prices.length - 1] >= prices[0];

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={trendUp ? "#43a047" : "#e53935"}
        strokeWidth="2"
      />
    </svg>
  );
}

export default Sparkline;
