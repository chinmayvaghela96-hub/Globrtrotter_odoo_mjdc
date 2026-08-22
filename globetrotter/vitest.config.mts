import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /**
     * The integration tests share one Postgres database, and each file's
     * `cleanup()` removes every `test_` user. Run files in parallel and one
     * file deletes another file's fixtures mid-run. Sequential files, with
     * the cases inside each file still ordered, is the correct trade here —
     * the whole suite runs in about two seconds either way.
     */
    fileParallelism: false,
  },
})
