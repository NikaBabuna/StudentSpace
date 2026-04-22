import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}
    >
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="text-[32px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
        <div className="text-[14px]" style={{ color: "var(--color-ss-text-faint)" }}>
          A private space for tutors and their students
        </div>
      </div>

      {/* Card */}
      <div
        className="w-[360px] rounded-xl p-8 flex flex-col gap-3"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
      >
        <Link
          href="/login"
          className="w-full text-center text-[14px] font-medium py-2.5 rounded-lg"
          style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
        >
          Log in
        </Link>

        <Link
          href="/signup"
          className="w-full text-center text-[14px] py-2.5 rounded-lg"
          style={{ background: "transparent", color: "var(--color-ss-text-muted)", border: "0.5px solid var(--color-ss-border)" }}
        >
          Request access
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-8 text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>
        Already have an account? Just log in above.
      </div>
    </div>
  );
}