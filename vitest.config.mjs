import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["core/**/*.ts", "store/**/*.ts", "lib/**/*.ts", "bin/**/*.ts"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
