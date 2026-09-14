import { configDefaults, defineConfig } from "vitest/config";
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
    // `.claude/worktrees/` está en .gitignore: son copias de trabajo, no
    // código del proyecto. Vitest las escaneaba igual, así que la suite
    // ejecutaba cada prueba dos veces y daba por rotos ficheros que aquí ya
    // no existen. Los defaults hay que repetirlos porque `exclude` los pisa.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
