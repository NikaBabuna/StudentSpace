export default function DashboardLoading() {
  return (
    <div className="flex h-screen animate-pulse" style={{ background: "var(--color-ss-bg)" }}>
      <div className="shrink-0 w-[220px] p-4 flex flex-col gap-4" style={{ background: "var(--color-ss-sidebar)", borderRight: "0.5px solid var(--color-ss-border)" }}>
        <div className="h-8 rounded-md" style={{ background: "#2a2820" }} />
        <div className="h-4 rounded-md w-3/4" style={{ background: "#2a2820" }} />
        <div className="flex-1 flex flex-col gap-2 mt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-lg" style={{ background: "#2a2820" }} />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="h-6 rounded-md w-48" style={{ background: "#2a2820" }} />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-xl" style={{ background: "#201e18", border: "0.5px solid #3a3630" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
