// Browser-safe exports - Zod schemas and types for frontend

// Zod schemas
export {
  ProxyProviderInterfaceSchema,
  ProxyLogLevelSchema,
  ProxyProviderOptionsSchema,
  ProxyPortsSchema,
  ProxyModelAliasSchema,
  ProxyModelAliasesSchema,
  ProxyArtifactOptionsSchema,
  ProxyGatewayOptionsSchema,
  providerRequiresBaseUrl,
  PROVIDER_DEFINITIONS,
} from "./schema.js";

// Types
export type {
  ProxyProviderInterface,
  ProxyLogLevel,
  ProxyProviderOptions,
  ProxyPorts,
  ProxyModelAlias,
  ProxyModelAliases,
  ProxyArtifactOptions,
  ProxyGatewayOptions,
  NormalizedProxyProvider,
  GeneratedProxyConfig,
} from "./types.js";

// Constants
export {
  BUILTIN_PROVIDER_ENDPOINTS,
  DEFAULT_ADMIN_PORT,
  DEFAULT_BRIGHTSTAFF_PORT,
  DEFAULT_ENVOY_RELEASE_BASE_URL,
  DEFAULT_ENVOY_VERSION,
  DEFAULT_GATEWAY_HOST,
  DEFAULT_GATEWAY_PORT,
  DEFAULT_INTERNAL_HOST,
  DEFAULT_INTERNAL_PORT,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PLANO_RELEASE_BASE_URL,
  DEFAULT_PLANO_VERSION,
} from "./constants.js";
export type { BuiltinProviderEndpoint } from "./constants.js";

// Config generation
export { generateGatewayConfig } from "./config.js";

export const DEFAULT_CACHE_DIR = "~/.cache/proxy-up/proxy";
