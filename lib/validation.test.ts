/* =============================================================================
 * lib/validation.test.ts — unit tests for lib/validation.ts
 * -----------------------------------------------------------------------------
 * Role: Verifies the Zod schemas that guard signup, class creation, homework,
 *       and lesson forms — the same rules run client- and server-side.
 * Dependencies: vitest, lib/validation
 * Used by: npm test / CI
 * ========================================================================== */
import { describe, expect, it } from "vitest";
import {
  classCreateSchema,
  firstError,
  homeworkSchema,
  lessonSchema,
  signupSchema,
} from "./validation";

describe("signupSchema", () => {
  const valid = { fullName: "Nika B", email: "nika@example.com", password: "secret1" };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(signupSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a short password", () => {
    expect(signupSchema.safeParse({ ...valid, password: "12345" }).success).toBe(false);
  });

  it("rejects a one-character name", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "N" }).success).toBe(false);
  });
});

describe("classCreateSchema", () => {
  const valid = { title: "Math 10th grade", cycleHours: 8 };

  it("accepts a valid class", () => {
    expect(classCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty (whitespace) title", () => {
    expect(classCreateSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejects zero or fractional cycle hours", () => {
    expect(classCreateSchema.safeParse({ ...valid, cycleHours: 0 }).success).toBe(false);
    expect(classCreateSchema.safeParse({ ...valid, cycleHours: 7.5 }).success).toBe(false);
  });
});

describe("homeworkSchema", () => {
  it("requires title and deadline", () => {
    expect(homeworkSchema.safeParse({ title: "HW 1", deadline: "2026-07-10T18:00" }).success).toBe(true);
    expect(homeworkSchema.safeParse({ title: "", deadline: "2026-07-10T18:00" }).success).toBe(false);
    expect(homeworkSchema.safeParse({ title: "HW 1", deadline: "" }).success).toBe(false);
  });
});

describe("lessonSchema", () => {
  it("requires a positive duration", () => {
    expect(lessonSchema.safeParse({ scheduledAt: "2026-07-10T18:00", durationHours: 1.5 }).success).toBe(true);
    expect(lessonSchema.safeParse({ scheduledAt: "2026-07-10T18:00", durationHours: 0 }).success).toBe(false);
    expect(lessonSchema.safeParse({ scheduledAt: "", durationHours: 1 }).success).toBe(false);
  });
});

describe("firstError", () => {
  it("returns the first issue's message", () => {
    const result = signupSchema.safeParse({ fullName: "N", email: "bad", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstError(result.error)).toBe("Enter your full name");
    }
  });
});
