export default function SettingsLoading() {
  return (
    <div className="flex-1 p-6 flex flex-col gap-4 animate-pulse" style={{ background: "var(--color-ss-bg)" }}>
      <div className="h-6 rounded-md w-48" style={{ background: "#2a2820" }} />
      <div className="h-32 rounded-xl" style={{ background: "#201e18", border: "0.5px solid #3a3630" }} />
      <div className="h-32 rounded-xl" style={{ background: "#201e18", border: "0.5px solid #3a3630" }} />
    </div>
  );
}
