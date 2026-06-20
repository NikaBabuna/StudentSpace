export default function ClassLoading() {
  return (
    <div className="flex flex-col gap-4 p-6 animate-pulse">
      <div className="h-4 rounded-md w-64" style={{ background: "#2a2820" }} />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-8 rounded-md flex-1" style={{ background: "#2a2820" }} />
        ))}
      </div>
      <div className="flex-1 min-h-[320px] rounded-xl" style={{ background: "#201e18", border: "0.5px solid #3a3630" }} />
    </div>
  );
}
