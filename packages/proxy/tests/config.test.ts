import { expect, test } from "vite-plus/test";

import { generateGatewayConfig } from "../src";

test("generateGatewayConfig normalizes provider config into Plano's rendered shape", () => {
  const generated = generateGatewayConfig({
    artifacts: {
      llmGatewayWasmPath: "/tmp/llm_gateway.wasm",
    },
    modelAliases: {
      "arch.proxy.default": "openai/gpt-4.1-mini",
    },
    ports: {
      admin: 19901,
      brightstaff: 19091,
      gateway: 12080,
      internal: 12081,
    },
    providers: [
      {
        apiKey: "sk-test",
        default: true,
        model: "openai/gpt-4.1-mini",
      },
      {
        baseUrl: "http://127.0.0.1:4000/upstream",
        model: "custom/mock-model",
        providerInterface: "openai",
      },
    ],
  });

  expect(generated.gatewayUrl).toBe("http://127.0.0.1:12080");
  expect(generated.planoConfig).toContain("provider_interface: openai");
  expect(generated.planoConfig).toContain("base_url_path_prefix: /upstream");
  expect(generated.planoConfig).toContain("arch.proxy.default:");
  expect(generated.envoyConfig).toContain("/tmp/llm_gateway.wasm");
  expect(generated.envoyConfig).toContain("x-arch-llm-provider");
});

test("generateGatewayConfig rejects custom providers without a provider interface", () => {
  expect(() =>
    generateGatewayConfig({
      providers: [
        {
          baseUrl: "http://127.0.0.1:4000",
          model: "custom/mock-model",
        },
      ],
    }),
  ).toThrow(/providerInterface/i);
});
