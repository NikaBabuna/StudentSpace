"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = {
  id: string;
  full_name: string;
  email: string;
  classes: { id: string; title: string; subject: string | null; level: string | null; cycle_hours: number }[];
};

function PersonCard({ person, type }: { person: Person; type: "tutors" | "students" }) {
  const router = useRouter();
  const initials = person.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      onClick={() => router.push(`/employer/${type}/${person.id}`)}
      className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer"
      style={{ background: "#201e18", border: "0.5px solid #3a3630" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#6a5530")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#3a3630")}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-medium"
        style={{ background: "#2a2318", border: "1px solid #4a3a18", color: "#c8a050" }}>
        {initials}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: "#d8c8a0" }}>{person.full_name}</div>
        <div className="text-[11px] mt-0.5 truncate" style={{ color: "#5a5248" }}>{person.email}</div>
        <div className="text-[10px] mt-1.5" style={{ color: "#4a4438" }}>
          {person.classes.length} {person.classes.length === 1 ? "class" : "classes"}
        </div>
      </div>
    </div>
  );
}

export default function EmployerClient({ firstName, tutors, students, totalClasses }: {
  firstName: string;
  tutors: Person[];
  students: Person[];
  totalClasses: number;
}) {
  const [tab, setTab] = useState<"tutors" | "students">("tutors");
  const [search, setSearch] = useState("");

  const list = tab === "tutors" ? tutors : students;
  const filtered = list.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0" style={{ borderBottom: "0.5px solid var(--color-ss-border)" }}>
        <div className="px-6 pt-5">
          <h1 className="text-[16px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            Hello, {firstName}
          </h1>
          <p className="text-[11px] mt-0.5" style={{ color: "#5a5248" }}>
            {totalClasses === 0
              ? "You haven't been added to any classes yet."
              : `${totalClasses} ${totalClasses === 1 ? "class" : "classes"} · ${tutors.length} ${tutors.length === 1 ? "tutor" : "tutors"} · ${students.length} ${students.length === 1 ? "student" : "students"}`}
          </p>
        </div>
        <div className="flex gap-0 px-6 mt-3">
          {(["tutors", "students"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(""); }}
              className="text-[13px] px-4 py-2.5 capitalize"
              style={{
                color: tab === t ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
                borderBottom: tab === t ? "2px solid var(--color-ss-amber-light)" : "2px solid transparent",
                background: "transparent", fontFamily: "inherit", cursor: "pointer", marginBottom: -1,
              }}>
              {t} ({(t === "tutors" ? tutors : students).length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab} by name or email…`}
          className="w-full max-w-sm px-3 py-2 rounded-md text-[13px] outline-none"
          style={{ background: "#201e18", border: "0.5px solid #3a3630", color: "var(--color-ss-text-secondary)" }}
        />

        {totalClasses === 0 ? (
          <div className="rounded-xl p-10 text-center"
            style={{ background: "#201e18", border: "0.5px solid #3a3630" }}>
            <div className="text-[13px] font-medium mb-1" style={{ color: "#7a7060" }}>No classes yet</div>
            <div className="text-[12px]" style={{ color: "#4a4438" }}>
              Ask a tutor to invite you to their classes as an employer.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-[13px] text-center py-8" style={{ color: "#4a4438" }}>
            No results for "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {filtered.map(person => (
              <PersonCard key={person.id} person={person} type={tab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}