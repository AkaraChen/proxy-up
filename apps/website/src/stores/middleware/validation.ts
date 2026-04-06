import { ProxyGatewayOptionsSchema } from "@proxy-up/proxy/browser";
import type { UIConfig } from "../types";
import { transformUIProvidersToOptions } from "../transform";

/**
 * 验证配置，直接返回 Zod 的 SafeParseResult
 */
export function validateConfig(config: UIConfig) {
  const providers = transformUIProvidersToOptions(config.providers);

  return ProxyGatewayOptionsSchema.safeParse({
    providers,
    ports: config.ports,
    gatewayHost: config.gatewayHost,
    logLevel: config.logLevel,
    modelAliases: config.modelAliases,
  });
}
