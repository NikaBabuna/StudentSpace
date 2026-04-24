"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

const nav = [
  { label: "Overview", href: "/employer" },
  { label: "Analytics", href: "/employer/analytics" },
  { label: "Inbox", href: "/employer/inbox" },
];

const settingsNav = [
  { label: "Settings", href: "/employer/settings" },
];

export default function EmployerLayout({ fullName, userInitials, userId, children }: {
  fullName: string;
  userInitials: string;
  userId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-ss-bg)" }}>
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col"
        style={{ background: "var(--color-ss-sidebar)", borderRight: "0.5px solid var(--color-ss-border)" }}>

        {/* Logo */}
        <Link href="/employer" className="px-5 py-5 hover:opacity-75 transition-opacity"
          style={{ borderBottom: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}>
          <div className="text-[15px] font-medium" style={{ color: "var(--color-ss-text-primary)" }}>
            StudentSpace
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex flex-col gap-0 px-3 flex-1 pt-3">
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest px-2 mb-1" style={{ color: "#5a5248" }}>Main</div>
            {nav.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[13px]"
                  style={{
                    background: active ? "#2a2318" : "transparent",
                    color: active ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
                    textDecoration: "none",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: active ? "var(--color-ss-amber-light)" : "#5a5248" }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest px-2 mb-1" style={{ color: "#5a5248" }}>Settings</div>
            {settingsNav.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2 px-2.5 py-[7px] rounded-md text-[13px]"
                  style={{
                    background: active ? "#2a2318" : "transparent",
                    color: active ? "var(--color-ss-amber-light)" : "var(--color-ss-text-muted)",
                    textDecoration: "none",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: active ? "var(--color-ss-amber-light)" : "#5a5248" }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "0.5px solid var(--color-ss-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-medium shrink-0"
              style={{ background: "#3a2e1a", border: "1px solid #6a5530", color: "var(--color-ss-amber-light)" }}>
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: "#b0a080" }}>{fullName}</div>
            </div>
          </div>
          <button onClick={handleSignOut} disabled={signingOut}
            className="w-full text-[11px] py-1.5 rounded-md"
            style={{
              background: "#2a2820", color: "var(--color-ss-text-faint)",
              border: "0.5px solid var(--color-ss-border)",
              opacity: signingOut ? 0.6 : 1, cursor: "pointer",
            }}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}