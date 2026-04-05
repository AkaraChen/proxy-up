import { expect, test } from "vite-plus/test";
import YAML from "yaml";

import {
  BUILTIN_PROVIDER_ENDPOINTS,
  DEFAULT_CACHE_DIR,
  generateGatewayConfig,
  getDefaultTrustedCaPath,
} from "../src";

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

test("generateGatewayConfig preserves HTTPS upstreams with trusted CA and path trimming", () => {
  const generated = generateGatewayConfig({
    providers: [
      {
        apiKey: "sk-test",
        baseUrl: "https://api.example.com/v1/",
        model: "custom/mock-model",
        providerInterface: "openai",
      },
    ],
  });

  expect(generated.normalizedProviders[0]).toMatchObject({
    baseUrlPathPrefix: "/v1",
    endpointHost: "api.example.com",
    endpointPort: 443,
    endpointProtocol: "https",
    providerInterface: "openai",
  });
  expect(generated.envoyConfig).toContain("envoy.transport_sockets.tls");
  expect(generated.envoyConfig).toContain("sni: api.example.com");
  expect(generated.envoyConfig).toContain(getDefaultTrustedCaPath());
});

test("generateGatewayConfig deduplicates route and cluster entries by cluster name", () => {
  const generated = generateGatewayConfig({
    providers: [
      {
        baseUrl: "http://127.0.0.1:4000/api",
        model: "openai/mock-model",
        providerInterface: "openai",
      },
      {
        baseUrl: "http://127.0.0.1:4000/api",
        model: "openai/second-model",
        providerInterface: "openai",
      },
    ],
  });

  expect(generated.normalizedProviders[0]?.clusterName).toBe(
    generated.normalizedProviders[1]?.clusterName,
  );

  const parsed = YAML.parse(generated.envoyConfig) as {
    static_resources: {
      clusters: Array<{ name: string }>;
      listeners: Array<{
        filter_chains: Array<{
          filters: Array<{
            typed_config?: {
              route_config?: {
                virtual_hosts: Array<{
                  routes: Array<{
                    route?: { cluster: string };
                  }>;
                }>;
              };
            };
          }>;
        }>;
      }>;
    };
  };
  const clusterName = generated.normalizedProviders[0]?.clusterName;

  expect(clusterName).toBeTruthy();
  const internalRoutes =
    parsed.static_resources?.listeners[1]?.filter_chains[0]?.filters[0]?.typed_config?.route_config
      ?.virtual_hosts[0]?.routes ?? [];

  const providerRoutes = internalRoutes.filter((route) => route.route?.cluster === clusterName);

  expect(providerRoutes).toHaveLength(1);
  expect(parsed.static_resources.clusters.map((cluster) => cluster.name)).toContain(clusterName);
});

test("generateGatewayConfig accepts model aliases in both string and object forms", () => {
  const generated = generateGatewayConfig({
    modelAliases: {
      "arch.proxy.default": "openai/gpt-4.1-mini",
      "arch.proxy.preview": {
        target: "anthropic/claude-sonnet-4",
      },
    },
    providers: [
      {
        model: "openai/gpt-4.1-mini",
      },
    ],
  });

  expect(generated.modelAliases).toEqual({
    "arch.proxy.default": {
      target: "openai/gpt-4.1-mini",
    },
    "arch.proxy.preview": {
      target: "anthropic/claude-sonnet-4",
    },
  });
  expect(generated.planoConfig).toContain("model_aliases:");
  expect(generated.planoConfig).toContain("arch.proxy.preview:");
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

test("generateGatewayConfig rejects duplicate provider names", () => {
  expect(() =>
    generateGatewayConfig({
      providers: [
        {
          model: "openai/gpt-4.1-mini",
          name: "shared-name",
        },
        {
          model: "anthropic/claude-sonnet-4",
          name: "shared-name",
        },
      ],
    }),
  ).toThrow(/must be unique/i);
});

test("builtin provider endpoints expose the expected upstreams", () => {
  expect(BUILTIN_PROVIDER_ENDPOINTS.openai).toEqual({
    host: "api.openai.com",
    port: 443,
    protocol: "https",
  });
  expect(BUILTIN_PROVIDER_ENDPOINTS.anthropic).toEqual({
    host: "api.anthropic.com",
    port: 443,
    protocol: "https",
  });
});

test("runtime defaults expose a stable cache path and trusted CA path", () => {
  expect(DEFAULT_CACHE_DIR).toContain(".cache/proxy-up/proxy");
  expect(getDefaultTrustedCaPath()).toMatch(
    /^\/etc\/ssl\/(cert\.pem|certs\/ca-certificates\.crt)$/,
  );
});
