import YAML from "yaml";

import {
  DEFAULT_ADMIN_PORT,
  DEFAULT_BRIGHTSTAFF_PORT,
  DEFAULT_GATEWAY_HOST,
  DEFAULT_GATEWAY_PORT,
  DEFAULT_INTERNAL_HOST,
  DEFAULT_INTERNAL_PORT,
  getDefaultTrustedCaPath,
} from "./constants.js";
import {
  getBuiltinProviderEndpoint,
  normalizeModelAliases,
  normalizeProviders,
} from "./providers.js";
import type {
  GeneratedProxyConfig,
  NormalizedProxyProvider,
  ProxyGatewayOptions,
  ProxyProviderInterface,
  ResolvedProxyPorts,
} from "./types.js";

interface EnvoyConfigBuildOptions {
  brightstaffHost: string;
  gatewayHost: string;
  llmGatewayWasmPath: string;
  ports: ResolvedProxyPorts;
  providers: NormalizedProxyProvider[];
}

function normalizePort(port: number | undefined, fallback: number, label: string) {
  const resolved = port ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0 || resolved > 65535) {
    throw new Error(`Port "${label}" must be an integer between 1 and 65535.`);
  }
  return resolved;
}

function resolvePorts(options: ProxyGatewayOptions["ports"]): ResolvedProxyPorts {
  const ports = {
    admin: normalizePort(options?.admin, DEFAULT_ADMIN_PORT, "admin"),
    brightstaff: normalizePort(options?.brightstaff, DEFAULT_BRIGHTSTAFF_PORT, "brightstaff"),
    gateway: normalizePort(options?.gateway, DEFAULT_GATEWAY_PORT, "gateway"),
    internal: normalizePort(options?.internal, DEFAULT_INTERNAL_PORT, "internal"),
  };

  const unique = new Set(Object.values(ports));
  if (unique.size !== Object.keys(ports).length) {
    throw new Error("Gateway, internal, brightstaff, and admin ports must be unique.");
  }

  return ports;
}

function toConnectUrl(host: string, port: number) {
  const resolvedHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${resolvedHost}:${port}`;
}

function buildRenderedPlanoConfig(
  providers: NormalizedProxyProvider[],
  ports: ResolvedProxyPorts,
  modelAliases: Record<string, { target: string }>,
) {
  const config = {
    listeners: [
      {
        name: "model_listener",
        port: ports.gateway,
        type: "model",
      },
    ],
    mode: "llm",
    model_providers: providers.map((provider) => ({
      ...(provider.accessKey
        ? {
            access_key: provider.accessKey,
          }
        : {}),
      ...(provider.baseUrlPathPrefix
        ? {
            base_url_path_prefix: provider.baseUrlPathPrefix,
          }
        : {}),
      ...(provider.clusterName
        ? {
            cluster_name: provider.clusterName,
          }
        : {}),
      ...(provider.default
        ? {
            default: true,
          }
        : {}),
      ...(provider.endpointHost
        ? {
            endpoint: provider.endpointHost,
          }
        : {}),
      ...(provider.endpointPort
        ? {
            port: provider.endpointPort,
          }
        : {}),
      model: provider.model,
      name: provider.name,
      ...(provider.passthroughAuth
        ? {
            passthrough_auth: true,
          }
        : {}),
      provider_interface: provider.providerInterface,
    })),
    ...(Object.keys(modelAliases).length > 0
      ? {
          model_aliases: modelAliases,
        }
      : {}),
    version: "v0.4.0",
  };

  return YAML.stringify(config, {
    lineWidth: 0,
  });
}

function buildTlsContext(host: string) {
  return {
    name: "envoy.transport_sockets.tls",
    typed_config: {
      "@type": "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext",
      common_tls_context: {
        validation_context: {
          trusted_ca: {
            filename: getDefaultTrustedCaPath(),
          },
        },
      },
      sni: host,
    },
  };
}

function buildCluster(
  name: string,
  endpoint: { host: string; port: number; protocol: "http" | "https" },
) {
  return {
    ...(endpoint.protocol === "https"
      ? {
          transport_socket: buildTlsContext(endpoint.host),
        }
      : {}),
    connect_timeout: "5s",
    dns_lookup_family: "V4_ONLY",
    lb_policy: "ROUND_ROBIN",
    load_assignment: {
      cluster_name: name,
      endpoints: [
        {
          lb_endpoints: [
            {
              endpoint: {
                address: {
                  socket_address: {
                    address: endpoint.host,
                    port_value: endpoint.port,
                  },
                },
                hostname: endpoint.host,
              },
            },
          ],
        },
      ],
    },
    name,
    type: "LOGICAL_DNS",
  };
}

function buildProviderRoutes(providers: NormalizedProxyProvider[]) {
  const seen = new Set<string>();
  const routes: Array<Record<string, unknown>> = [];

  for (const provider of providers) {
    const clusterName = provider.clusterName ?? provider.providerInterface;
    if (seen.has(clusterName)) {
      continue;
    }
    seen.add(clusterName);

    routes.push({
      match: {
        headers: [
          {
            name: "x-arch-llm-provider",
            string_match: {
              exact: clusterName,
            },
          },
        ],
        prefix: "/",
      },
      route: {
        auto_host_rewrite: true,
        cluster: clusterName,
        timeout: "300s",
      },
    });
  }

  routes.push({
    direct_response: {
      body: {
        inline_string: "x-arch-llm-provider header not set, llm gateway cannot perform routing\n",
      },
      status: 400,
    },
    match: {
      prefix: "/",
    },
  });

  return routes;
}

function buildProviderClusters(providers: NormalizedProxyProvider[]) {
  const seen = new Set<string>();
  const clusters: Array<Record<string, unknown>> = [];

  for (const provider of providers) {
    const clusterName = provider.clusterName ?? provider.providerInterface;
    if (seen.has(clusterName)) {
      continue;
    }
    seen.add(clusterName);

    const endpoint =
      provider.endpointHost && provider.endpointPort && provider.endpointProtocol
        ? {
            host: provider.endpointHost,
            port: provider.endpointPort,
            protocol: provider.endpointProtocol,
          }
        : getBuiltinProviderEndpoint(provider.providerInterface as ProxyProviderInterface);

    if (!endpoint) {
      throw new Error(
        `Provider "${provider.name}" requires baseUrl because no builtin upstream endpoint exists for "${provider.providerInterface}".`,
      );
    }

    clusters.push(buildCluster(clusterName, endpoint));
  }

  return clusters;
}

function buildRouterHttpFilter() {
  return {
    name: "envoy.filters.http.router",
    typed_config: {
      "@type": "type.googleapis.com/envoy.extensions.filters.http.router.v3.Router",
    },
  };
}

function buildLlmWasmHttpFilter(llmGatewayWasmPath: string, renderedPlanoConfig: string) {
  return {
    name: "envoy.filters.http.wasm",
    typed_config: {
      "@type": "type.googleapis.com/udpa.type.v1.TypedStruct",
      type_url: "type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm",
      value: {
        config: {
          configuration: {
            "@type": "type.googleapis.com/google.protobuf.StringValue",
            value: renderedPlanoConfig,
          },
          name: "proxy_llm_gateway",
          root_id: "llm_gateway",
          vm_config: {
            code: {
              local: {
                filename: llmGatewayWasmPath,
              },
            },
            runtime: "envoy.wasm.runtime.v8",
          },
        },
      },
    },
  };
}

function buildEnvoyConfig(renderedPlanoConfig: string, options: EnvoyConfigBuildOptions) {
  return {
    admin: {
      address: {
        socket_address: {
          address: DEFAULT_INTERNAL_HOST,
          port_value: options.ports.admin,
        },
      },
    },
    static_resources: {
      clusters: [
        buildCluster("bright_staff", {
          host: options.brightstaffHost,
          port: options.ports.brightstaff,
          protocol: "http",
        }),
        ...buildProviderClusters(options.providers),
      ],
      listeners: [
        {
          address: {
            socket_address: {
              address: options.gatewayHost,
              port_value: options.ports.gateway,
            },
          },
          filter_chains: [
            {
              filters: [
                {
                  name: "envoy.filters.network.http_connection_manager",
                  typed_config: {
                    "@type":
                      "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
                    codec_type: "AUTO",
                    http_filters: [buildRouterHttpFilter()],
                    route_config: {
                      name: "proxy_gateway_routes",
                      virtual_hosts: [
                        {
                          domains: ["*"],
                          name: "proxy_gateway",
                          routes: [
                            {
                              direct_response: {
                                body: {
                                  inline_string: "ok\n",
                                },
                                status: 200,
                              },
                              match: {
                                prefix: "/healthz",
                              },
                            },
                            {
                              match: {
                                prefix: "/",
                              },
                              route: {
                                cluster: "bright_staff",
                                timeout: "300s",
                              },
                            },
                          ],
                        },
                      ],
                    },
                    stat_prefix: "proxy_gateway",
                  },
                },
              ],
            },
          ],
          name: "proxy_gateway",
        },
        {
          address: {
            socket_address: {
              address: DEFAULT_INTERNAL_HOST,
              port_value: options.ports.internal,
            },
          },
          filter_chains: [
            {
              filters: [
                {
                  name: "envoy.filters.network.http_connection_manager",
                  typed_config: {
                    "@type":
                      "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
                    codec_type: "AUTO",
                    http_filters: [
                      buildLlmWasmHttpFilter(options.llmGatewayWasmPath, renderedPlanoConfig),
                      buildRouterHttpFilter(),
                    ],
                    route_config: {
                      name: "proxy_internal_routes",
                      virtual_hosts: [
                        {
                          domains: ["*"],
                          name: "proxy_internal",
                          routes: [
                            {
                              direct_response: {
                                body: {
                                  inline_string: "ok\n",
                                },
                                status: 200,
                              },
                              match: {
                                prefix: "/healthz",
                              },
                            },
                            ...buildProviderRoutes(options.providers),
                          ],
                        },
                      ],
                    },
                    stat_prefix: "proxy_internal",
                  },
                },
              ],
            },
          ],
          name: "proxy_internal",
        },
      ],
    },
  };
}

export function generateGatewayConfig(options: ProxyGatewayOptions) {
  const ports = resolvePorts(options.ports);
  const normalizedProviders = normalizeProviders(options.providers);
  const modelAliases = normalizeModelAliases(options.modelAliases);
  const gatewayHost = options.gatewayHost ?? DEFAULT_GATEWAY_HOST;
  const renderedPlanoConfig = buildRenderedPlanoConfig(normalizedProviders, ports, modelAliases);
  const envoyConfig = YAML.stringify(
    buildEnvoyConfig(renderedPlanoConfig, {
      brightstaffHost: DEFAULT_INTERNAL_HOST,
      gatewayHost,
      llmGatewayWasmPath: options.artifacts?.llmGatewayWasmPath ?? "./llm_gateway.wasm",
      ports,
      providers: normalizedProviders,
    }),
    {
      lineWidth: 0,
    },
  );

  const generated: GeneratedProxyConfig = {
    adminUrl: toConnectUrl(DEFAULT_INTERNAL_HOST, ports.admin),
    brightstaffUrl: toConnectUrl(DEFAULT_INTERNAL_HOST, ports.brightstaff),
    envoyConfig,
    gatewayUrl: toConnectUrl(gatewayHost, ports.gateway),
    internalUrl: toConnectUrl(DEFAULT_INTERNAL_HOST, ports.internal),
    modelAliases,
    normalizedProviders,
    planoConfig: renderedPlanoConfig,
    ports,
  };

  return generated;
}
