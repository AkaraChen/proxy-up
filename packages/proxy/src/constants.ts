import os from "node:os";
import path from "node:path";

import type { ProxyProviderInterface } from "./types.js";

export const DEFAULT_PLANO_VERSION = "0.4.17";
export const DEFAULT_ENVOY_VERSION = "v1.37.0";

export const DEFAULT_PLANO_RELEASE_BASE_URL = "https://github.com/katanemo/plano/releases/download";
export const DEFAULT_ENVOY_RELEASE_BASE_URL =
  "https://github.com/tetratelabs/archive-envoy/releases/download";

export const DEFAULT_GATEWAY_HOST = "127.0.0.1";
export const DEFAULT_INTERNAL_HOST = "127.0.0.1";

export const DEFAULT_GATEWAY_PORT = 12000;
export const DEFAULT_INTERNAL_PORT = 12001;
export const DEFAULT_BRIGHTSTAFF_PORT = 9091;
export const DEFAULT_ADMIN_PORT = 9901;

export const DEFAULT_LOG_LEVEL = "info";

export const DEFAULT_CACHE_DIR = path.join(os.homedir(), ".cache", "proxy-up", "proxy");

export interface BuiltinProviderEndpoint {
  host: string;
  port: number;
  protocol: "http" | "https";
}

export const BUILTIN_PROVIDER_ENDPOINTS: Record<
  Exclude<ProxyProviderInterface, "amazon_bedrock" | "azure_openai" | "ollama" | "plano" | "qwen">,
  BuiltinProviderEndpoint
> = {
  anthropic: {
    host: "api.anthropic.com",
    port: 443,
    protocol: "https",
  },
  deepseek: {
    host: "api.deepseek.com",
    port: 443,
    protocol: "https",
  },
  gemini: {
    host: "generativelanguage.googleapis.com",
    port: 443,
    protocol: "https",
  },
  groq: {
    host: "api.groq.com",
    port: 443,
    protocol: "https",
  },
  mistral: {
    host: "api.mistral.ai",
    port: 443,
    protocol: "https",
  },
  moonshotai: {
    host: "api.moonshot.ai",
    port: 443,
    protocol: "https",
  },
  openai: {
    host: "api.openai.com",
    port: 443,
    protocol: "https",
  },
  together_ai: {
    host: "api.together.xyz",
    port: 443,
    protocol: "https",
  },
  xai: {
    host: "api.x.ai",
    port: 443,
    protocol: "https",
  },
  zhipu: {
    host: "open.bigmodel.cn",
    port: 443,
    protocol: "https",
  },
};

export function getDefaultTrustedCaPath() {
  return process.platform === "darwin" ? "/etc/ssl/cert.pem" : "/etc/ssl/certs/ca-certificates.crt";
}
