import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  tsconfig: "tsconfig.lib.json",
  clean: true,
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
});