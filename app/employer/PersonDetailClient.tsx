"use client";

import Link from "next/link";

export default function PersonDetailClient({ person, classes, role, backHref }: {
  person: { id: string; full_name: string; email: string };
  classes: any[];
  role: string;
  backHref: string;
}) {
  const initials = person.full_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 pt-5 pb-4"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <Link href={backHref}
          className="text-[12px] flex items-center gap-1.5 mb-4"
          style={{ color: "#5a5248", textDecoration: "none", opacity: 0.8 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}>
          ← Back
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-medium shrink-0"
            style={{ background: "#2a2318", border: "1px solid #4a3a18", color: "#c8a050" }}>
            {initials}
          </div>
          <div>
            <div className="text-[16px] font-medium" style={{ color: "#d8c8a0" }}>{person.full_name}</div>
            <div className="text-[12px] mt-0.5" style={{ color: "#5a5248" }}>{person.email}</div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded mt-1 inline-block capitalize"
              style={{ background: "#2a2318", color: "#c8a050", border: "0.5px solid #4a3a18" }}>
              {role}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        <div className="text-[11px] uppercase tracking-wider" style={{ color: "#4a4438" }}>
          Shared classes ({classes.length})
        </div>

        {classes.length === 0 ? (
          <div className="text-[13px] text-center py-8" style={{ color: "#4a4438" }}>
            No shared classes.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {classes.map((cls: any) => (
              <Link key={cls.id} href={`/classes/${cls.id}/overview`}
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
                style={{ background: "#201e18", border: "0.5px solid #3a3630", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#6a5530")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#3a3630")}>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: "#d8c8a0" }}>{cls.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>
                    {[cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set"}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded shrink-0"
                  style={{ background: "#17150f", color: "#5a5248", border: "0.5px solid #2a2820" }}>
                  {cls.cycle_hours}h cycle
                </span>
                <span className="text-[13px]" style={{ color: "#4a4438" }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}