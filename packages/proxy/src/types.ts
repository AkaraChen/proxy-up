// Types are now exported from schema.ts via zod inference
// This file re-exports types for backward compatibility

export type {
  ProxyProviderInterface,
  ProxyLogLevel,
  ProxyProviderOptions,
  ProxyPorts,
  ProxyModelAlias,
  ProxyModelAliases,
  ProxyArtifactOptions,
  ProxyGatewayOptions,
} from "./schema.js";

// Runtime-specific types not covered by zod schemas
export interface NormalizedProxyProvider {
  accessKey?: string;
  baseUrl?: string;
  baseUrlPathPrefix?: string;
  clusterName?: string;
  default?: boolean;
  endpointHost?: string;
  endpointPort?: number;
  endpointProtocol?: "http" | "https";
  model: string;
  name: string;
  passthroughAuth?: boolean;
  provider: string;
  providerInterface: import("./schema.js").ProxyProviderInterface;
}

export interface ResolvedProxyArtifacts {
  brightstaffPath: string;
  envoyPath: string;
  envoyVersion: string;
  llmGatewayWasmPath: string;
  planoVersion: string;
}

export interface ResolvedProxyPorts {
  admin: number;
  brightstaff: number;
  gateway: number;
  internal: number;
}

export interface GeneratedProxyConfig {
  adminUrl: string;
  brightstaffUrl: string;
  envoyConfig: string;
  gatewayUrl: string;
  internalUrl: string;
  modelAliases: Record<string, import("./schema.js").ProxyModelAlias>;
  normalizedProviders: NormalizedProxyProvider[];
  planoConfig: string;
  ports: ResolvedProxyPorts;
}

export interface ProxyGatewayPaths {
  brightstaffLogPath: string;
  envoyConfigPath: string;
  envoyLogPath: string;
  logsDir: string;
  planoConfigPath: string;
  workDir: string;
}
