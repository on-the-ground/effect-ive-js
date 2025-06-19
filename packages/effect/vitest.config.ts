import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.ts"],
    pool: "threads",
    poolOptions: {
      vmThreads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
  },
});
