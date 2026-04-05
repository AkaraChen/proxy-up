import { proxyRuntimeInfoSnapshot } from "./runtime-info.js";

export const DEFAULT_CACHE_DIR = `${proxyRuntimeInfoSnapshot.homeDirectory}/.cache/proxy-up/proxy`;

export function getDefaultTrustedCaPath() {
  return proxyRuntimeInfoSnapshot.platform === "darwin"
    ? "/etc/ssl/cert.pem"
    : "/etc/ssl/certs/ca-certificates.crt";
}
