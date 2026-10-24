import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://whyno:whyno_local_only@127.0.0.1:54329/whyno_test";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DB, TEST_DATABASE_URL: TEST_DB },
    fileParallelism: false,
    testTimeout: 30000,
  },
});
