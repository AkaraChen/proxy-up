import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  dts: {
    tsgo: true,
  },
  entry: {
    index: "src/index.ts",
  },
  exports: true,
});
