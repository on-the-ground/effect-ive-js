import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.cjs",
        format: "cjs",
        sourcemap: false,
      },
      {
        file: "dist/index.mjs",
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        noForceEmit: false,
        outputToFilesystem: true,
        compilerOptions: {
          module: "ESNext",
          target: "ES2020",
        },
      }),
    ],
  },

  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];
