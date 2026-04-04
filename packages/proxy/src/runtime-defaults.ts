import os from "node:os";
import path from "node:path";

export const DEFAULT_CACHE_DIR = path.join(os.homedir(), ".cache", "proxy-up", "proxy");

export function getDefaultTrustedCaPath() {
  return process.platform === "darwin" ? "/etc/ssl/cert.pem" : "/etc/ssl/certs/ca-certificates.crt";
}
