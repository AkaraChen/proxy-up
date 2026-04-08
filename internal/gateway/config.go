package gateway

import (
	"fmt"

	"gopkg.in/yaml.v3"

	"github.com/akarachen/proxy-up/internal/config"
)

const (
	defaultGatewayHost     = "127.0.0.1"
	defaultInternalHost    = "127.0.0.1"
	defaultGatewayPort     = 12000
	defaultInternalPort    = 12001
	defaultBrightstaffPort = 9091
	defaultAdminPort       = 9901
	trustedCAPath          = "/etc/ssl/cert.pem" // macOS system CA bundle
)

// ResolvedPorts holds the final port assignments for the gateway.
type ResolvedPorts struct {
	Gateway     int
	Internal    int
	Brightstaff int
	Admin       int
}

// GeneratedConfig holds the generated YAML configurations and derived URLs.
type GeneratedConfig struct {
	PlanoConfig    string
	EnvoyConfig    string
	Ports          ResolvedPorts
	GatewayURL     string
	InternalURL    string
	BrightstaffURL string
	AdminURL       string
}

// GenerateGatewayConfig produces Plano and Envoy YAML from a ProxyConfig.
// llmGatewayWasmPath must be the absolute path to the extracted llm_gateway.wasm.
func GenerateGatewayConfig(cfg *config.ProxyConfig, llmGatewayWasmPath string) (*GeneratedConfig, error) {
	ports, err := resolvePorts(cfg.Ports)
	if err != nil {
		return nil, err
	}

	providers, err := NormalizeProviders(cfg.Providers)
	if err != nil {
		return nil, err
	}

	modelAliases := NormalizeModelAliases(cfg.ModelAliases)

	gatewayHost := cfg.GatewayHost
	if gatewayHost == "" {
		gatewayHost = defaultGatewayHost
	}

	planoConfig, err := marshalYAML(buildPlanoConfig(providers, ports, modelAliases))
	if err != nil {
		return nil, fmt.Errorf("failed to generate plano config: %w", err)
	}

	envoyConfig, err := marshalYAML(buildEnvoyConfigMap(planoConfig, envoyBuildOpts{
		brightstaffHost:    defaultInternalHost,
		gatewayHost:        gatewayHost,
		llmGatewayWasmPath: llmGatewayWasmPath,
		ports:              ports,
		providers:          providers,
	}))
	if err != nil {
		return nil, fmt.Errorf("failed to generate envoy config: %w", err)
	}

	resolvedHost := gatewayHost
	if resolvedHost == "0.0.0.0" {
		resolvedHost = "127.0.0.1"
	}

	return &GeneratedConfig{
		PlanoConfig:    planoConfig,
		EnvoyConfig:    envoyConfig,
		Ports:          ports,
		GatewayURL:     fmt.Sprintf("http://%s:%d", resolvedHost, ports.Gateway),
		InternalURL:    fmt.Sprintf("http://%s:%d", defaultInternalHost, ports.Internal),
		BrightstaffURL: fmt.Sprintf("http://%s:%d", defaultInternalHost, ports.Brightstaff),
		AdminURL:       fmt.Sprintf("http://%s:%d", defaultInternalHost, ports.Admin),
	}, nil
}

func resolvePorts(p *config.Ports) (ResolvedPorts, error) {
	r := ResolvedPorts{
		Gateway:     defaultGatewayPort,
		Internal:    defaultInternalPort,
		Brightstaff: defaultBrightstaffPort,
		Admin:       defaultAdminPort,
	}
	if p != nil {
		if p.Gateway != nil {
			r.Gateway = *p.Gateway
		}
		if p.Internal != nil {
			r.Internal = *p.Internal
		}
		if p.Brightstaff != nil {
			r.Brightstaff = *p.Brightstaff
		}
		if p.Admin != nil {
			r.Admin = *p.Admin
		}
	}
	seen := map[int]bool{}
	for _, port := range []int{r.Gateway, r.Internal, r.Brightstaff, r.Admin} {
		if port <= 0 || port > 65535 {
			return ResolvedPorts{}, fmt.Errorf("port %d is out of range (1–65535)", port)
		}
		if seen[port] {
			return ResolvedPorts{}, fmt.Errorf("ports must all be unique; duplicate: %d", port)
		}
		seen[port] = true
	}
	return r, nil
}

func marshalYAML(v any) (string, error) {
	data, err := yaml.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ── Plano config ────────────────────────────────────────────────────────────

func buildPlanoConfig(providers []NormalizedProvider, ports ResolvedPorts, modelAliases map[string]string) map[string]any {
	providerList := make([]map[string]any, 0, len(providers))
	for _, p := range providers {
		entry := map[string]any{
			"model":              p.Model,
			"name":               p.Name,
			"provider_interface": p.ProviderInterface,
		}
		if p.AccessKey != "" {
			entry["access_key"] = p.AccessKey
		}
		if p.BaseURLPathPrefix != "" {
			entry["base_url_path_prefix"] = p.BaseURLPathPrefix
		}
		if p.ClusterName != "" {
			entry["cluster_name"] = p.ClusterName
		}
		if p.Default {
			entry["default"] = true
		}
		if p.EndpointHost != "" {
			entry["endpoint"] = p.EndpointHost
		}
		if p.EndpointPort != 0 {
			entry["port"] = p.EndpointPort
		}
		if p.PassthroughAuth {
			entry["passthrough_auth"] = true
		}
		providerList = append(providerList, entry)
	}

	cfg := map[string]any{
		"listeners": []any{
			map[string]any{"name": "model_listener", "port": ports.Gateway, "type": "model"},
		},
		"mode":            "llm",
		"model_providers": providerList,
		"version":         "v0.4.0",
	}

	if len(modelAliases) > 0 {
		aliases := make(map[string]any, len(modelAliases))
		for k, v := range modelAliases {
			aliases[k] = map[string]any{"target": v}
		}
		cfg["model_aliases"] = aliases
	}

	return cfg
}

// ── Envoy config ─────────────────────────────────────────────────────────────

type envoyBuildOpts struct {
	brightstaffHost    string
	gatewayHost        string
	llmGatewayWasmPath string
	ports              ResolvedPorts
	providers          []NormalizedProvider
}

func buildEnvoyConfigMap(renderedPlanoConfig string, opts envoyBuildOpts) map[string]any {
	return map[string]any{
		"admin": map[string]any{
			"address": sockAddr(defaultInternalHost, opts.ports.Admin),
		},
		"static_resources": map[string]any{
			"clusters":  buildAllClusters(opts),
			"listeners": []any{buildGatewayListener(opts), buildInternalListener(renderedPlanoConfig, opts)},
		},
	}
}

func sockAddr(host string, port int) map[string]any {
	return map[string]any{
		"socket_address": map[string]any{
			"address":    host,
			"port_value": port,
		},
	}
}

func buildTLSContext(sni string) map[string]any {
	return map[string]any{
		"name": "envoy.transport_sockets.tls",
		"typed_config": map[string]any{
			"@type": "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext",
			"common_tls_context": map[string]any{
				"validation_context": map[string]any{
					"trusted_ca": map[string]any{
						"filename": trustedCAPath,
					},
				},
			},
			"sni": sni,
		},
	}
}

func buildCluster(name, host string, port int, protocol string) map[string]any {
	c := map[string]any{
		"connect_timeout":   "5s",
		"dns_lookup_family": "V4_ONLY",
		"lb_policy":         "ROUND_ROBIN",
		"load_assignment": map[string]any{
			"cluster_name": name,
			"endpoints": []any{
				map[string]any{
					"lb_endpoints": []any{
						map[string]any{
							"endpoint": map[string]any{
								"address":  sockAddr(host, port),
								"hostname": host,
							},
						},
					},
				},
			},
		},
		"name": name,
		"type": "LOGICAL_DNS",
	}
	if protocol == "https" {
		c["transport_socket"] = buildTLSContext(host)
	}
	return c
}

func buildAllClusters(opts envoyBuildOpts) []any {
	clusters := []any{
		buildCluster("bright_staff", opts.brightstaffHost, opts.ports.Brightstaff, "http"),
	}
	seen := map[string]bool{}
	for _, p := range opts.providers {
		name := p.GetClusterName()
		if seen[name] {
			continue
		}
		seen[name] = true

		var host string
		var port int
		var proto string
		if p.EndpointHost != "" {
			host, port, proto = p.EndpointHost, p.EndpointPort, p.EndpointProtocol
		} else if ep, ok := builtinEndpoints[p.ProviderInterface]; ok {
			host, port, proto = ep.host, ep.port, ep.protocol
		} else {
			continue
		}
		clusters = append(clusters, buildCluster(name, host, port, proto))
	}
	return clusters
}

func routerFilter() map[string]any {
	return map[string]any{
		"name": "envoy.filters.http.router",
		"typed_config": map[string]any{
			"@type": "type.googleapis.com/envoy.extensions.filters.http.router.v3.Router",
		},
	}
}

func wasmFilter(wasmPath, renderedPlanoConfig string) map[string]any {
	return map[string]any{
		"name": "envoy.filters.http.wasm",
		"typed_config": map[string]any{
			"@type":    "type.googleapis.com/udpa.type.v1.TypedStruct",
			"type_url": "type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm",
			"value": map[string]any{
				"config": map[string]any{
					"configuration": map[string]any{
						"@type": "type.googleapis.com/google.protobuf.StringValue",
						"value": renderedPlanoConfig,
					},
					"name":    "proxy_llm_gateway",
					"root_id": "llm_gateway",
					"vm_config": map[string]any{
						"code": map[string]any{
							"local": map[string]any{
								"filename": wasmPath,
							},
						},
						"runtime": "envoy.wasm.runtime.v8",
					},
				},
			},
		},
	}
}

func providerRoutes(providers []NormalizedProvider) []any {
	routes := []any{}
	seen := map[string]bool{}
	for _, p := range providers {
		name := p.GetClusterName()
		if seen[name] {
			continue
		}
		seen[name] = true
		routes = append(routes, map[string]any{
			"match": map[string]any{
				"headers": []any{
					map[string]any{
						"name":         "x-arch-llm-provider",
						"string_match": map[string]any{"exact": name},
					},
				},
				"prefix": "/",
			},
			"route": map[string]any{
				"auto_host_rewrite": true,
				"cluster":           name,
				"timeout":           "300s",
			},
		})
	}
	// Fallback: 400 if no provider header
	routes = append(routes, map[string]any{
		"direct_response": map[string]any{
			"body":   map[string]any{"inline_string": "x-arch-llm-provider header not set, llm gateway cannot perform routing\n"},
			"status": 400,
		},
		"match": map[string]any{"prefix": "/"},
	})
	return routes
}

func buildGatewayListener(opts envoyBuildOpts) map[string]any {
	return map[string]any{
		"address": sockAddr(opts.gatewayHost, opts.ports.Gateway),
		"filter_chains": []any{
			map[string]any{
				"filters": []any{
					map[string]any{
						"name": "envoy.filters.network.http_connection_manager",
						"typed_config": map[string]any{
							"@type":        "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
							"codec_type":   "AUTO",
							"http_filters": []any{routerFilter()},
							"route_config": map[string]any{
								"name": "proxy_gateway_routes",
								"virtual_hosts": []any{
									map[string]any{
										"domains": []string{"*"},
										"name":    "proxy_gateway",
										"routes": []any{
											map[string]any{
												"direct_response": map[string]any{
													"body":   map[string]any{"inline_string": "ok\n"},
													"status": 200,
												},
												"match": map[string]any{"prefix": "/healthz"},
											},
											map[string]any{
												"match": map[string]any{"prefix": "/"},
												"route": map[string]any{"cluster": "bright_staff", "timeout": "300s"},
											},
										},
									},
								},
							},
							"stat_prefix": "proxy_gateway",
						},
					},
				},
			},
		},
		"name": "proxy_gateway",
	}
}

func buildInternalListener(renderedPlanoConfig string, opts envoyBuildOpts) map[string]any {
	healthzRoute := map[string]any{
		"direct_response": map[string]any{
			"body":   map[string]any{"inline_string": "ok\n"},
			"status": 200,
		},
		"match": map[string]any{"prefix": "/healthz"},
	}
	allRoutes := append([]any{healthzRoute}, providerRoutes(opts.providers)...)

	return map[string]any{
		"address": sockAddr(defaultInternalHost, opts.ports.Internal),
		"filter_chains": []any{
			map[string]any{
				"filters": []any{
					map[string]any{
						"name": "envoy.filters.network.http_connection_manager",
						"typed_config": map[string]any{
							"@type":        "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
							"codec_type":   "AUTO",
							"http_filters": []any{wasmFilter(opts.llmGatewayWasmPath, renderedPlanoConfig), routerFilter()},
							"route_config": map[string]any{
								"name": "proxy_internal_routes",
								"virtual_hosts": []any{
									map[string]any{
										"domains": []string{"*"},
										"name":    "proxy_internal",
										"routes":  allRoutes,
									},
								},
							},
							"stat_prefix": "proxy_internal",
						},
					},
				},
			},
		},
		"name": "proxy_internal",
	}
}
