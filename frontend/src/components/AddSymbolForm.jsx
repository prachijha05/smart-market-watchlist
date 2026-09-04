import { useState } from "react";
import { useWatchlist } from "../context/WatchlistContext";

function AddSymbolForm() {
  const { add } = useWatchlist();
  const [symbol, setSymbol] = useState("");
  const [alertHigh, setAlertHigh] = useState("");
  const [alertLow, setAlertLow] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      await add(
        symbol.trim(),
        alertHigh ? Number(alertHigh) : undefined,
        alertLow ? Number(alertLow) : undefined,
      );
      setSymbol("");
      setAlertHigh("");
      setAlertLow("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add symbol");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-symbol-form">
      <input
        type="text"
        placeholder="Symbol (e.g. TCS)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        required
      />
      <input
        type="number"
        placeholder="Alert above (optional)"
        value={alertHigh}
        onChange={(e) => setAlertHigh(e.target.value)}
      />
      <input
        type="number"
        placeholder="Alert below (optional)"
        value={alertLow}
        onChange={(e) => setAlertLow(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add to watchlist"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

export default AddSymbolForm;
