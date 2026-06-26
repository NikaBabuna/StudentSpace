/* =============================================================================
 * next.config.ts — Next.js application configuration
 * -----------------------------------------------------------------------------
 * Role: Security headers, image remote patterns (Supabase), Sentry webpack wrap.
 * Dependencies: @sentry/nextjs, NEXT_PUBLIC_SUPABASE_URL
 * Used by: next build / next dev
 * ========================================================================== */
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' ${supabaseUrl} https://*.supabase.co wss://*.supabase.co https://open.er-api.com https://*.sentry.io https://*.ingest.de.sentry.io https://*.ingest.sentry.io`,
      "font-src 'self' data:",
      "frame-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // org/project come from env so source-map upload can be enabled later in
  // Vercel/CI by setting SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN.
  // Without an auth token, upload is skipped and the build still succeeds.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  telemetry: false,
});
