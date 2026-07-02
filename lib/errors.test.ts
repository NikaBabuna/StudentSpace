/* =============================================================================
 * lib/errors.test.ts — unit tests for lib/errors.ts
 * -----------------------------------------------------------------------------
 * Role: Enforces catalog invariants (code format, friendly messages) and keeps
 *       docs/ERRORS.md in sync with the catalog: adding a code without
 *       documenting it — or documenting a code that doesn't exist — fails CI.
 * Dependencies: vitest, lib/errors, docs/ERRORS.md (read from disk)
 * Used by: npm test / CI
 * ========================================================================== */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CATALOG, userMessage, type ErrorCode } from "./errors";

const codes = Object.keys(ERROR_CATALOG) as ErrorCode[];

describe("ERROR_CATALOG invariants", () => {
  it("has at least one code", () => {
    expect(codes.length).toBeGreaterThan(0);
  });

  it("every code matches SS-<DOMAIN>-<NN>", () => {
    for (const code of codes) {
      expect(code).toMatch(/^SS-[A-Z]+-\d{2}$/);
    }
  });

  it("every message is user-friendly (non-empty, ends with punctuation, no internals)", () => {
    for (const code of codes) {
      const { message } = ERROR_CATALOG[code];
      expect(message.length, code).toBeGreaterThan(10);
      expect(message, code).toMatch(/[.!]$/);
      // Never leak implementation vocabulary to users.
      for (const banned of ["supabase", "postgres", "sql", "rls", "constraint", "null value"]) {
        expect(message.toLowerCase(), `${code} leaks "${banned}"`).not.toContain(banned);
      }
    }
  });

  it("every code has a valid severity", () => {
    for (const code of codes) {
      expect(["warn", "error"], code).toContain(ERROR_CATALOG[code].severity);
    }
  });

  it("userMessage returns the catalogued message", () => {
    expect(userMessage("SS-AUTH-01")).toBe(ERROR_CATALOG["SS-AUTH-01"].message);
  });
});

describe("docs/ERRORS.md stays in sync with the catalog", () => {
  const doc = readFileSync(join(__dirname, "..", "docs", "ERRORS.md"), "utf-8");

  it("documents every catalogued code", () => {
    const missing = codes.filter((code) => !doc.includes(code));
    expect(missing, `Add these codes to docs/ERRORS.md: ${missing.join(", ")}`).toEqual([]);
  });

  it("does not document codes that no longer exist", () => {
    const documented = [...new Set(doc.match(/SS-[A-Z]+-\d{2}/g) ?? [])];
    const stale = documented.filter((code) => !(code in ERROR_CATALOG));
    expect(stale, `Remove these stale codes from docs/ERRORS.md: ${stale.join(", ")}`).toEqual([]);
  });
});
