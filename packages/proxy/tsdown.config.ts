import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  dts: {
    tsgo: true,
  },
  entry: {
    browser: "src/browser.ts",
    index: "src/index.ts",
  },
  exports: true,
});
