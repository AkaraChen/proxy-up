import { expect, test } from "vite-plus/test";

import { DEFAULT_CACHE_DIR, generateGatewayConfig } from "../src/browser";

test("browser entry exports browser-safe defaults", () => {
  expect(DEFAULT_CACHE_DIR).toBe("~/.cache/proxy-up/proxy");
});

test("browser entry generates the same gateway config shape as the node entry", () => {
  const generated = generateGatewayConfig({
    providers: [
      {
        model: "openai/gpt-4.1-mini",
      },
    ],
  });

  expect(generated.gatewayUrl).toBe("http://127.0.0.1:12000");
  expect(generated.planoConfig).toContain("version: v0.4.0");
});
