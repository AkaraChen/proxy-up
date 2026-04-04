import { generateGatewayConfigCore } from "./config-core.js";
import { getDefaultTrustedCaPath } from "./runtime-defaults.js";
import type { ProxyGatewayOptions } from "./types.js";

export function generateGatewayConfig(options: ProxyGatewayOptions) {
  return generateGatewayConfigCore(options, getDefaultTrustedCaPath());
}
