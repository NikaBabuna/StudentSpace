'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

type AccountType = 'personal' | 'business'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [accountType, setAccountType] = useState<AccountType>('personal')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          is_employer: accountType === 'business',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          bio: bio || null,
        },
      },
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
  }

if (success) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}>
      <div className="w-[380px] rounded-xl p-8 text-center"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>
        <div className="text-[20px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
          Account created
        </div>
        <div className="text-[13px] leading-relaxed mb-6" style={{ color: "var(--color-ss-text-faint)" }}>
          Your account is ready. You can log in now with{" "}
          <span style={{ color: "var(--color-ss-text-secondary)" }}>{email}</span>.
        </div>
        <Link href="/login"
          className="inline-block text-[13px] font-medium px-5 py-2 rounded-lg"
          style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", textDecoration: "none" }}>
          Go to login
        </Link>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: "var(--color-ss-bg)" }}>

      {/* Back button */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[12px]"
        style={{ color: "var(--color-ss-text-faint)", textDecoration: "none", opacity: 0.8 }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
      >
        ← Back
      </Link>

      {/* Logo */}
      <Link href="/" className="mb-8 text-center" style={{ textDecoration: "none" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <div className="text-[28px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
        <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
          Create your account
        </div>
      </Link>

      {/* Card */}
      <div className="w-[400px] rounded-xl p-8"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}>

        {/* Account type toggle */}
        <div className="flex rounded-lg p-1 mb-3"
          style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)" }}>
          {(['personal', 'business'] as AccountType[]).map(type => (
            <button key={type} type="button" onClick={() => setAccountType(type)}
              className="flex-1 py-2 rounded-md text-[13px] font-medium capitalize transition-colors"
              style={{
                background: accountType === type ? "var(--color-ss-amber-light)" : "transparent",
                color: accountType === type ? "#1c1a17" : "var(--color-ss-text-faint)",
              }}>
              {type}
            </button>
          ))}
        </div>

        {/* Account type description — plain text, not a field */}
        <div className="text-[12px] mb-5 px-1" style={{ color: "var(--color-ss-text-ghost)" }}>
          {accountType === 'personal'
            ? "For tutors, students, and parents. Join or create classes."
            : "For organizations and employers. Get oversight across your tutors' classes."}
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
          </div>

<div>
  <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>Email</label>
  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
    placeholder="you@example.com"
    className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
    style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
  <div className="text-[11px] mt-1.5 px-1" style={{ color: "#7a5a30" }}>
    ⚠ Email verification is coming soon — make sure this is correct as you won't be able to change it yet.
  </div>
</div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              minLength={6} placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Bio <span style={{ color: "var(--color-ss-text-ghost)" }}>(optional)</span>
            </label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
              placeholder={accountType === 'personal'
                ? "e.g. Math and physics tutor based in Tbilisi"
                : "e.g. Tutoring agency based in Georgia"}
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }} />
          </div>

          {error && (
            <div className="text-[12px] px-3 py-2 rounded-md"
              style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full text-[14px] font-medium py-2.5 rounded-lg mt-1"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ height: "0.5px", background: "#2a2820" }} />
            <span className="text-[10px]" style={{ color: "#3a3630" }}>or</span>
            <div className="flex-1" style={{ height: "0.5px", background: "#2a2820" }} />
          </div>

          <Link href="/login"
            className="w-full text-[13px] font-medium py-2.5 rounded-lg text-center"
            style={{ color: "var(--color-ss-text-muted)", border: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#5a5248")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-ss-border)")}>
            Log in
          </Link>
        </form>
      </div>
    </div>
  )
}