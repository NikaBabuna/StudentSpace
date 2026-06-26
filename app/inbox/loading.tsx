export default function InboxLoading() {
  return (
    <div className="flex-1 p-6 flex flex-col gap-4 animate-pulse" style={{ background: "var(--color-ss-bg)" }}>
      <div className="h-6 rounded-md w-32" style={{ background: "#2a2820" }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-xl" style={{ background: "#201e18", border: "0.5px solid #3a3630" }} />
      ))}
    </div>
  );
}
