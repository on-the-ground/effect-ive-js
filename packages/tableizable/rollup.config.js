import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.cjs.js",
        format: "cjs",
        sourcemap: false,
      },
      {
        file: "dist/index.mjs.js",
        format: "esm",
        sourcemap: false,
      },
    ],
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
    external: ["@on-the-ground/effect-context"],
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
