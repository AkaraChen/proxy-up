import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  dts: {
    tsgo: true,
  },
  entry: {
    cli: "src/cli.ts",
  },
  exports: true,
});
