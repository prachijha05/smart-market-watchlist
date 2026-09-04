import { useWatchlist } from "./context/WatchlistContext";
import AddSymbolForm from "./components/AddSymbolForm";
import WatchlistRow from "./components/WatchlistRow";
import "./App.css";

const SEVERITY_ORDER = { meaningful: 0, notable: 1, none: 2 };

function App() {
  const { items, changes, loading, error } = useWatchlist();

  if (loading) return <p className="status-msg">Loading...</p>;
  if (error) return <p className="status-msg error">{error}</p>;

  // Merge: for each watchlist item, find its matching /changes entry (if any)
  const changeMap = Object.fromEntries(changes.map((c) => [c.symbol, c]));
  const merged = items.map((item) => ({
    item,
    changeInfo: changeMap[item.symbol],
  }));

  // Meaningful first, then notable, then calm — this IS the "quickly
  // understand what deserves attention" requirement from the brief.
  merged.sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.changeInfo?.severity || "none"];
    const sevB = SEVERITY_ORDER[b.changeInfo?.severity || "none"];
    return sevA - sevB;
  });

  const meaningfulCount = changes.filter(
    (c) => c.severity === "meaningful",
  ).length;

  return (
    <div className="app">
      <h1>Smart Market Watchlist</h1>
      <p className="header-stat">
        {meaningfulCount > 0
          ? `${meaningfulCount} meaningful change${meaningfulCount > 1 ? "s" : ""} since you last checked.`
          : "Nothing meaningful since you last checked."}
      </p>

      <AddSymbolForm />

      <div className="watchlist-list">
        {merged.length === 0 && (
          <p className="status-msg">No symbols yet — add one above.</p>
        )}
        {merged.map(({ item, changeInfo }) => (
          <WatchlistRow key={item._id} item={item} changeInfo={changeInfo} />
        ))}
      </div>
    </div>
  );
}

export default App;
