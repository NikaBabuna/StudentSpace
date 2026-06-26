/* =============================================================================
 * features/employer/components/EmployerAnalyticsClient.tsx — employer analytics
 * -----------------------------------------------------------------------------
 * Role: Read-only analytics for employer oversight (classes, hours, spend).
 * Dependencies: Inline styles (legacy)
 * Used by: app/employer/analytics/page.tsx
 * Inputs: Pre-aggregated stats from server loader
 * Outputs: Charts/tables for employer view
 * ========================================================================== */
"use client";

export interface EmployerClassStat {
  id: string;
  title: string;
  subject: string | null;
  tutorName: string;
  completedHours: number;
  completed: number;
  missed: number;
  scheduled: number;
}

export interface EmployerCurrencyTotal {
  currency: string;
  total: number;
  paid: number;
  unpaid: number;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
    >
      <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-ghost)" }}>{label}</div>
      <div className="text-[22px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>{sub}</div>}
    </div>
  );
}

export default function EmployerAnalyticsClient({
  classStats,
  earnings,
  totalCompletedHours,
  totalLessons,
  totalMissed,
}: {
  classStats: EmployerClassStat[];
  earnings: EmployerCurrencyTotal[];
  totalCompletedHours: number;
  totalLessons: number;
  totalMissed: number;
}) {
  const missedRate = totalLessons > 0 ? Math.round((totalMissed / totalLessons) * 100) : 0;
  const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Top stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Classes" value={String(classStats.length)} />
        <StatCard label="Completed hours" value={totalCompletedHours.toLocaleString()} />
        <StatCard label="Lessons" value={String(totalLessons)} sub={`${totalMissed} missed`} />
        <StatCard label="Missed rate" value={`${missedRate}%`} />
      </div>

      {/* Earnings by currency */}
      <div className="mb-6">
        <div className="text-[12px] font-medium mb-2" style={{ color: "var(--color-ss-text-secondary)" }}>
          Earnings by currency
        </div>
        {earnings.length === 0 ? (
          <div className="text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>
            No payment amounts set on any cycle yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {earnings.map((e) => (
              <div
                key={e.currency}
                className="rounded-xl p-4"
                style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
              >
                <div className="text-[11px] mb-1" style={{ color: "var(--color-ss-text-ghost)" }}>{e.currency}</div>
                <div className="text-[20px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
                  {money(e.total)} {e.currency}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "var(--color-ss-text-faint)" }}>
                  <span style={{ color: "var(--color-ss-green)" }}>{money(e.paid)} paid</span>
                  {" · "}
                  <span style={{ color: "var(--color-ss-amber)" }}>{money(e.unpaid)} due</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-class breakdown */}
      <div>
        <div className="text-[12px] font-medium mb-2" style={{ color: "var(--color-ss-text-secondary)" }}>
          Per-class breakdown
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "0.5px solid var(--color-ss-border)" }}
        >
          <div
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-[11px]"
            style={{ background: "var(--color-ss-bg-secondary)", color: "var(--color-ss-text-ghost)" }}
          >
            <div>Class</div><div>Tutor</div><div>Hours</div><div>Completed</div><div>Missed</div>
          </div>
          {classStats.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>
              No classes to report on yet.
            </div>
          ) : (
            classStats.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 text-[12px]"
                style={{ borderTop: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}
              >
                <div className="truncate">
                  {c.title}
                  {c.subject && <span style={{ color: "var(--color-ss-text-ghost)" }}> · {c.subject}</span>}
                </div>
                <div className="truncate" style={{ color: "var(--color-ss-text-faint)" }}>{c.tutorName}</div>
                <div>{c.completedHours}</div>
                <div style={{ color: "var(--color-ss-green)" }}>{c.completed}</div>
                <div style={{ color: c.missed > 0 ? "var(--color-ss-red)" : "var(--color-ss-text-faint)" }}>{c.missed}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
