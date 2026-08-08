import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.vitest.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` est fourni par Next au build ; il n'est pas résoluble
      // sous vitest. On le neutralise pour pouvoir tester les modules
      // serveur (génération des visuels d'impression, file d'attente).
      "server-only": path.resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
});
