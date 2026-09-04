import { useState, useEffect } from "react";
import SeverityBadge from "./SeverityBadge";
import Sparkline from "./Sparkline";
import { useWatchlist } from "../context/WatchlistContext";
import { getHistory } from "../api/watchlist";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

function WatchlistRow({ item, changeInfo }) {
  const { remove, dismiss } = useWatchlist();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const severity = changeInfo?.severity || "none";
  const price = changeInfo?.price;
  const reason = changeInfo?.reason || "";
  const asOf = changeInfo?.asOf;
  const stale = changeInfo?.stale;

  // Fetch history only when the row is expanded — no point loading data
  // for rows nobody's looking at (this is the "lazy compute on read"
  // principle from Section 7 applied on the frontend side).
  useEffect(() => {
    if (!expanded) return;
    setHistoryLoading(true);
    getHistory(item.symbol)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [expanded, item.symbol]);

  return (
    <div className={`watchlist-row severity-${severity}`}>
      <div className="row-main" onClick={() => setExpanded((v) => !v)}>
        <span className="symbol">{item.symbol}</span>
        <span className="price">
          {price != null ? `₹${price.toFixed(2)}` : "—"}
        </span>
        <SeverityBadge severity={severity} />
        <span className="reason">{reason}</span>
        <span className="as-of">
          {stale && <span className="stale-badge">STALE</span>}
          {timeAgo(asOf)}
        </span>
      </div>

      {expanded && (
        <div className="row-expanded">
          <div className="row-expanded-top">
            <p>
              Alert high: {item.alertPriceHigh ?? "none"} · Alert low:{" "}
              {item.alertPriceLow ?? "none"}
            </p>
            {historyLoading ? (
              <span className="sparkline-empty">Loading history...</span>
            ) : (
              <Sparkline data={history} />
            )}
          </div>
          <div className="row-expanded-actions">
            <button onClick={() => dismiss(item.symbol)}>Mark as seen</button>
            <button onClick={() => remove(item._id)} className="danger">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchlistRow;
