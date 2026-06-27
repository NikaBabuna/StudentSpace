// vitest.config.ts — unit test runner configuration
// Role: Runs Vitest on lib/*.test.ts with Node environment and @ alias.
// Used by: npm test
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "features/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
