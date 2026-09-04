const CONFIG = {
  meaningful: { color: "#e53935", label: "Meaningful" },
  notable: { color: "#fbc02d", label: "Worth a glance" },
  none: { color: "#43a047", label: "Calm" },
};

function SeverityBadge({ severity }) {
  const { color, label } = CONFIG[severity] || CONFIG.none;
  return (
    <span className="severity-badge" style={{ backgroundColor: color }}>
      {label}
    </span>
  );
}

export default SeverityBadge;
