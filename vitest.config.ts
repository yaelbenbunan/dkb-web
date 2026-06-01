import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" is a runtime guard that only matters in the client
      // bundle; stub it so server-only modules can be unit tested.
      "server-only": path.resolve(__dirname, "./vitest.stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
