// vitest.config.ts — unit test runner configuration
// Role: Runs Vitest on lib/**/*.test.ts and features/**/*.test.ts (Node env,
//       @ alias). Coverage is enforced (see docs/TESTING.md): the `include`
//       list below is the contract of pure domain modules that MUST stay
//       covered — add every new pure module to it along with its tests.
// Used by: npm test / npm run test:coverage / CI
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "features/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Only pure domain logic is unit-covered. I/O modules (Supabase loaders,
      // auth guards, storage) are exercised by the build + smoke test instead.
      include: [
        "lib/payments.ts",
        "lib/homework.ts",
        "lib/time.ts",
        "lib/rate-limit.ts",
        "lib/errors.ts",
        "lib/validation.ts",
        "lib/dashboard-stats.ts",
        "features/dashboard/lib/analytics-aggregation.ts",
        "features/dashboard/lib/homework-stats.ts",
        "features/dashboard/lib/lesson-activity-aggregation.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 90,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
