import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      vmThreads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
  },
});
