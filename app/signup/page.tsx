'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
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
          role: 'tutor',
          timezone: 'Asia/Tbilisi',
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "var(--color-ss-bg)" }}
      >
        <div
          className="w-[360px] rounded-xl p-8 text-center"
          style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
        >
          <div className="text-[20px] font-medium mb-2" style={{ color: "var(--color-ss-text-primary)" }}>
            Check your email
          </div>
          <div className="text-[13px] leading-relaxed" style={{ color: "var(--color-ss-text-faint)" }}>
            We've sent a confirmation link to <span style={{ color: "var(--color-ss-text-secondary)" }}>{email}</span>.
            Click it to activate your account, then log in.
          </div>
          <Link
            href="/login"
            className="inline-block mt-6 text-[13px] font-medium px-5 py-2 rounded-lg"
            style={{ background: "var(--color-ss-amber-light)", color: "#1c1a17" }}
          >
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "var(--color-ss-bg)" }}
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="text-[28px] font-medium mb-1" style={{ color: "var(--color-ss-text-primary)" }}>
          StudentSpace
        </div>
        <div className="text-[13px]" style={{ color: "var(--color-ss-text-faint)" }}>
          Create your account
        </div>
      </div>

      {/* Card */}
      <div
        className="w-[360px] rounded-xl p-8"
        style={{ background: "var(--color-ss-bg-secondary)", border: "0.5px solid var(--color-ss-border)" }}
      >
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{
                background: "#17150f",
                border: "0.5px solid var(--color-ss-border)",
                color: "var(--color-ss-text-secondary)",
              }}
            />
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{
                background: "#17150f",
                border: "0.5px solid var(--color-ss-border)",
                color: "var(--color-ss-text-secondary)",
              }}
            />
          </div>

          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: "var(--color-ss-text-faint)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md text-[13px] outline-none"
              style={{
                background: "#17150f",
                border: "0.5px solid var(--color-ss-border)",
                color: "var(--color-ss-text-secondary)",
              }}
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-6 text-[12px]" style={{ color: "var(--color-ss-text-ghost)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--color-ss-text-muted)" }}>
          Log in
        </Link>
      </div>
    </div>
  )
}