"use client";

import { useState } from "react";
import Link from "next/link";

function LangToggle() {
  const [lang, setLang] = useState<"EN" | "GE">("EN");
  return (
    <div className="flex rounded-md overflow-hidden"
      style={{ border: "0.5px solid var(--color-ss-border)" }}>
      {(["EN", "GE"] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          className="text-[11px] px-3 py-1.5"
          style={{
            background: lang === l ? "#2a2318" : "#17150f",
            color: lang === l ? "var(--color-ss-amber-light)" : "var(--color-ss-text-ghost)",
            borderRight: l === "EN" ? "0.5px solid var(--color-ss-border)" : "none",
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function DashboardClient({
  firstName, fullName, allClasses, teaching, attending, observing,
  pendingInvites, avatarColors, roleConfig, analytics,
}: {
  firstName: string;
  fullName: string;
  allClasses: any[];
  teaching: any[];
  attending: any[];
  observing: any[];
  pendingInvites: number;
  avatarColors: any[];
  roleConfig: any;
  analytics: {
    totalHours: number;
    totalMissed: number;
    totalCompleted: number;
    totalScheduled: number;
    pendingFeedback: number;
    classAnalytics: any[];
  };
}) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

{/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div>
          <h1 className="text-[18px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            {firstName ? `Hello, ${firstName}` : "Hello"}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {allClasses.length === 0 ? "No classes yet" : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <LangToggle />

          {pendingInvites > 0 && (
            <Link href="/inbox"
              className="text-[12px] font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5"
              style={{ background: "#2a2040", color: "var(--color-ss-purple)", border: "0.5px solid #4a3a70" }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium"
                style={{ background: "var(--color-ss-purple)", color: "#1c1a17" }}>
                {pendingInvites}
              </span>
              Invites
            </Link>
          )}
          <Link href="/classes/new"
            className="text-[13px] font-medium px-3.5 py-[7px] rounded-md"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}>
            + Create class
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {allClasses.length === 0 && (
          <div className="rounded-xl p-10 text-center"
            style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
            <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-ss-text-muted)" }}>No classes yet</div>
            <div className="text-[12px] mb-5" style={{ color: "var(--color-ss-text-faint)" }}>
              Create your first class or wait for an invite from a tutor.
            </div>
            <Link href="/classes/new"
              className="inline-block text-[13px] font-medium px-4 py-2 rounded-lg"
              style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}>
              + Create class
            </Link>
          </div>
        )}
        <ClassGroup title="Classes I teach"   classes={teaching}  avatarColors={avatarColors} roleConfig={roleConfig} />
        <ClassGroup title="Classes I attend"  classes={attending} avatarColors={avatarColors} roleConfig={roleConfig} />
        <ClassGroup title="Classes I observe" classes={observing} avatarColors={avatarColors} roleConfig={roleConfig} />
      </div>
    </div>
  );
}

function ClassCard({ cls, index, avatarColors, roleConfig }: { cls: any; index: number; avatarColors: any[]; roleConfig: any }) {
  const colors = avatarColors[index % avatarColors.length];
  const initials = cls.title.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const role = roleConfig[cls.role as keyof typeof roleConfig];
  return (
    <Link href={`/classes/${cls.id}/overview`}
      className="rounded-xl p-4 block"
      style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium truncate" style={{ color: "#d8c8a0" }}>{cls.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-ss-text-faint)" }}>
            {[cls.subject, cls.level].filter(Boolean).join(" · ") || "No subject set"}
          </div>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded shrink-0"
          style={{ background: "#2a2318", color: role.color, border: "0.5px solid #4a3a18" }}>
          {role.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded"
          style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}>
          {cls.cycle_hours}h cycle
        </span>
        {cls.member_count > 1 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded"
            style={{ background: "#17150f", color: "var(--color-ss-text-ghost)", border: "0.5px solid var(--color-ss-border)" }}>
            {cls.member_count} members
          </span>
        )}
      </div>
    </Link>
  );
}

function ClassGroup({ title, classes, avatarColors, roleConfig }: { title: string; classes: any[]; avatarColors: any[]; roleConfig: any }) {
  if (classes.length === 0) return null;
  return (
    <div className="mb-8">
      <div className="text-[12px] uppercase tracking-wider mb-3" style={{ color: "var(--color-ss-text-faint)" }}>{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {classes.map((cls, i) => (
          <ClassCard key={cls.id} cls={cls} index={i} avatarColors={avatarColors} roleConfig={roleConfig} />
        ))}
      </div>
    </div>
  );
}