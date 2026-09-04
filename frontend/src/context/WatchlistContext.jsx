import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getWatchlist,
  getChanges,
  addSymbol,
  removeSymbol,
  updateAlerts,
  markSeen,
} from "../api/watchlist";

const WatchlistContext = createContext(null);

export function WatchlistProvider({ children }) {
  const [items, setItems] = useState([]); // raw WatchlistItem docs
  const [changes, setChanges] = useState([]); // symbol -> price/severity info
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Merge base watchlist items with their live severity/price data.
  // We fetch /watchlist (the list) and /watchlist/changes (severity info)
  // separately because /changes only returns non-"none" items — for the
  // full picture (including "none" severity items) we still need /watchlist's
  // own price data too. For now, /changes doubles as our price source for
  // anything that HAS moved; items with no entry there are treated as calm.
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [rawItems, changeData] = await Promise.all([
        getWatchlist(),
        getChanges(),
      ]);
      setItems(rawItems);
      setChanges(changeData);
    } catch (err) {
      setError("Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 10s to match the backend's simulated feed cadence
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const add = async (symbol, alertPriceHigh, alertPriceLow) => {
    await addSymbol(
      symbol,
      alertPriceHigh || undefined,
      alertPriceLow || undefined,
    );
    await refresh();
  };

  const remove = async (id) => {
    await removeSymbol(id);
    await refresh();
  };

  const updateAlertsFor = async (id, high, low) => {
    await updateAlerts(id, high, low);
    await refresh();
  };

  const dismiss = async (symbol) => {
    await markSeen(symbol);
    await refresh();
  };

  return (
    <WatchlistContext.Provider
      value={{
        items,
        changes,
        loading,
        error,
        add,
        remove,
        updateAlertsFor,
        dismiss,
        refresh,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx)
    throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
}
