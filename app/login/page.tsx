'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_employer")
      .eq("id", (await supabase.auth.getUser()).data.user!.id)
      .single()

    router.push(profile?.is_employer ? '/employer' : '/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: "var(--color-ss-bg)" }}
    >
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
      <Link href="/" className="mb-10 text-center" style={{ textDecoration: "none" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <div className="text-[28px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
        <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
          Log in to your account
        </div>
      </Link>

      {/* Card */}
      <div
        className="w-[360px] rounded-xl p-8"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}
            />
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{ background: "#17150f", border: "0.5px solid var(--color-ss-border)", color: "var(--color-ss-text-secondary)" }}
            />
          </div>

          {error && (
            <div className="text-[12px] px-3 py-2 rounded-md"
              style={{ background: "var(--color-ss-red-bg)", color: "var(--color-ss-red)", border: "0.5px solid var(--color-ss-red-border)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-[14px] font-medium py-2.5 rounded-lg mt-1"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ height: "0.5px", background: "#2a2820" }} />
            <span className="text-[10px]" style={{ color: "#3a3630" }}>or</span>
            <div className="flex-1" style={{ height: "0.5px", background: "#2a2820" }} />
          </div>

          <Link
            href="/signup"
            className="w-full text-[13px] font-medium py-2.5 rounded-lg text-center"
            style={{ color: "var(--color-ss-text-muted)", border: "0.5px solid var(--color-ss-border)", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "#5a5248")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-ss-border)")}
          >
            Register
          </Link>
        </form>
      </div>
    </div>
  )
}
