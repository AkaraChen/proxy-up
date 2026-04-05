import { expect, test } from "vite-plus/test";

import { DEFAULT_CACHE_DIR, generateGatewayConfig, getDefaultTrustedCaPath } from "../src";

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

test("generateGatewayConfig rejects invalid ports and duplicate port assignments", () => {
  expect(() =>
    generateGatewayConfig({
      ports: {
        gateway: 0,
      },
      providers: [
        {
          model: "openai/gpt-4.1-mini",
        },
      ],
    }),
  ).toThrow(/Port "gateway"/i);

  expect(() =>
    generateGatewayConfig({
      ports: {
        admin: 12080,
        gateway: 12080,
      },
      providers: [
        {
          model: "openai/gpt-4.1-mini",
        },
      ],
    }),
  ).toThrow(/must be unique/i);
});

test("generateGatewayConfig rejects builtin providers that require an explicit baseUrl", () => {
  expect(() =>
    generateGatewayConfig({
      providers: [
        {
          model: "plano/mock-model",
        },
      ],
    }),
  ).toThrow(/requires baseUrl/i);
});

test("generateGatewayConfig rejects unsupported baseUrl protocols", () => {
  expect(() =>
    generateGatewayConfig({
      providers: [
        {
          baseUrl: "ftp://127.0.0.1:4000",
          model: "custom/mock-model",
          providerInterface: "openai",
        },
      ],
    }),
  ).toThrow(/must use http or https/i);
});

test("generateGatewayConfig rejects multiple defaults", () => {
  expect(() =>
    generateGatewayConfig({
      providers: [
        {
          default: true,
          model: "openai/gpt-4.1-mini",
        },
        {
          default: true,
          model: "anthropic/claude-3.5-sonnet",
        },
      ],
    }),
  ).toThrow(/Only one provider can be marked as default/i);
});

test("runtime defaults expose a stable cache path and trusted CA path", () => {
  expect(DEFAULT_CACHE_DIR).toContain(".cache/proxy-up/proxy");
  expect(getDefaultTrustedCaPath()).toMatch(
    /^\/etc\/ssl\/(cert\.pem|certs\/ca-certificates\.crt)$/,
  );
});
