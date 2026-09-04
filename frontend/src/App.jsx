import { useWatchlist } from "./context/WatchlistContext";
import AddSymbolForm from "./components/AddSymbolForm";
import WatchlistRow from "./components/WatchlistRow";
import "./App.css";

const SEVERITY_ORDER = {
  meaningful: 0,
  notable: 1,
  none: 2,
};

function App() {
  const { items, changes, loading, error } = useWatchlist();

  if (loading) return <p className="status-msg">Loading...</p>;
  if (error) return <p className="status-msg error">{error}</p>;

  const sorted = [...items].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity || "none"] -
      SEVERITY_ORDER[b.severity || "none"],
  );

  const meaningfulCount = changes.filter(
    (c) => c.severity === "meaningful",
  ).length;

  return (
    <div className="app">
      <h1>Smart Market Watchlist</h1>

      <p className="header-stat">
        {meaningfulCount > 0
          ? `${meaningfulCount} meaningful change${
              meaningfulCount > 1 ? "s" : ""
            } since you last checked.`
          : "Nothing meaningful since you last checked."}
      </p>

      <AddSymbolForm />

      <div className="watchlist-list">
        {sorted.length === 0 && (
          <p className="status-msg">No symbols yet — add one above.</p>
        )}

        {sorted.map((item) => (
          <WatchlistRow key={item._id} item={item} changeInfo={item} />
        ))}
      </div>
    </div>
  );
}

export default App;
