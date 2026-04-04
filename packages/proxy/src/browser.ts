import {
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
import { generateGatewayConfigCore } from "./config-core.js";
import type { BuiltinProviderEndpoint } from "./constants.js";
import type {
  GeneratedProxyConfig,
  NormalizedProxyProvider,
  ProxyArtifactOptions,
  ProxyGatewayOptions,
  ProxyLogLevel,
  ProxyModelAlias,
  ProxyModelAliases,
  ProxyPorts,
  ProxyProviderInterface,
  ProxyProviderOptions,
  ResolvedProxyArtifacts,
  ResolvedProxyPorts,
} from "./types.js";

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
};
export type {
  BuiltinProviderEndpoint,
  GeneratedProxyConfig,
  NormalizedProxyProvider,
  ProxyArtifactOptions,
  ProxyGatewayOptions,
  ProxyLogLevel,
  ProxyModelAlias,
  ProxyModelAliases,
  ProxyPorts,
  ProxyProviderInterface,
  ProxyProviderOptions,
  ResolvedProxyArtifacts,
  ResolvedProxyPorts,
};

export const DEFAULT_CACHE_DIR = "~/.cache/proxy-up/proxy";

const DEFAULT_BROWSER_TRUSTED_CA_PATH = "/etc/ssl/cert.pem";

export function generateGatewayConfig(options: ProxyGatewayOptions) {
  return generateGatewayConfigCore(options, DEFAULT_BROWSER_TRUSTED_CA_PATH);
}
