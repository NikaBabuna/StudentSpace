/* =============================================================================
 * app/layout.tsx — root layout for every route
 * -----------------------------------------------------------------------------
 * Responsibilities:
 *   • Load the three typefaces as CSS variables (consumed by globals.css):
 *       - Geist        → --font-geist-sans  (body / UI)
 *       - Geist Mono   → --font-geist-mono  (labels, metadata, code)
 *       - Newsreader    → --font-newsreader  (serif display: headings, numerals)
 *   • Set the default theme to DARK and apply the saved theme before first
 *     paint to avoid a flash of the wrong theme (FOUC). See `themeInitScript`.
 *
 * Theme model: the active theme lives in a `data-theme` attribute on <html>
 * ("dark" | "light"). globals.css reads it; toggling the attribute re-themes
 * the app instantly with no React re-render. The toggle (components/shell/
 * theme-toggle.tsx) writes the choice to localStorage under `theme`.
 * ========================================================================== */
import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif display face used for headings and the large dashboard numerals.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "StudentSpace",
  description:
    "A structured platform for tutors, students, parents, and employers to manage classes, track progress, and handle payments.",
};

/*
 * Runs synchronously in <body> before any visible content is parsed, so the
 * correct theme is in place on the very first paint. Reads the persisted choice
 * and falls back to "dark" (our default). Wrapped in try/catch because
 * localStorage can throw in private-mode / sandboxed contexts.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `data-theme="dark"` is the server-rendered default; the init script may
    // change it to "light" before hydration, so suppress the attribute-mismatch
    // warning that would otherwise fire on <html>.
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  );
}
