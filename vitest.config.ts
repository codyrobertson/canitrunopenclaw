import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadEnv } from "dotenv";

// Vitest does not automatically load Next.js env files.
// We mirror Next's default dev behavior so DB-backed modules can import safely.
loadEnv({ path: ".env.test", override: true });
loadEnv({ path: ".env.local" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
