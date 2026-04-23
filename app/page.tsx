import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}
    >
      {/* Logo mark */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-[22px] font-medium"
        style={{
          background: "var(--color-ss-amber-dim)",
          border: "0.5px solid var(--color-ss-amber-border)",
          color: "var(--color-ss-amber-light)",
        }}
      >
        S
      </div>

      {/* Name + tagline */}
      <div className="text-center mb-10">
        <div className="text-[32px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
        <div className="text-[15px]" style={{ color: "var(--color-ss-text-faint)" }}>
          A structured space for tutors, students, and the people around them.
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-[280px]">
        <Link
          href="/signup"
          className="w-full text-center text-[14px] font-medium py-2.5 rounded-lg"
          style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="w-full text-center text-[14px] py-2.5 rounded-lg"
          style={{
            background: "transparent",
            color: "var(--color-ss-text-muted)",
            border: "0.5px solid var(--color-ss-border)",
          }}
        >
          Log in
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-12 text-[11px]" style={{ color: "var(--color-ss-text-ghost)" }}>
        By signing up you agree to our terms of service.
      </div>
    </div>
  );
}