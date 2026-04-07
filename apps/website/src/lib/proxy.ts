export const DEFAULT_PLANO_VERSION = "0.4.17";
export const DEFAULT_ENVOY_VERSION = "v1.37.0";

export const DEFAULT_GATEWAY_HOST = "127.0.0.1";

export const DEFAULT_GATEWAY_PORT = 12000;
export const DEFAULT_INTERNAL_PORT = 12001;
export const DEFAULT_BRIGHTSTAFF_PORT = 9091;
export const DEFAULT_ADMIN_PORT = 9901;

export const DEFAULT_LOG_LEVEL = "info";
export const DEFAULT_CACHE_DIR = "~/.cache/proxy-up/proxy";

export type ProxyProviderInterface =
  | "amazon_bedrock"
  | "anthropic"
  | "azure_openai"
  | "deepseek"
  | "gemini"
  | "groq"
  | "mistral"
  | "moonshotai"
  | "ollama"
  | "openai"
  | "plano"
  | "qwen"
  | "together_ai"
  | "xai"
  | "zhipu";

export type ProxyLogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface ProxyProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  default?: boolean;
  model: string;
  name?: string;
  passthroughAuth?: boolean;
  provider?: string;
  providerInterface?: ProxyProviderInterface;
}

export interface ProxyPorts {
  admin?: number;
  brightstaff?: number;
  gateway?: number;
  internal?: number;
}

export interface ProxyModelAlias {
  target: string;
}

export type ProxyModelAliases = Record<string, string | ProxyModelAlias>;

export interface ProxyArtifactOptions {
  brightstaffPath?: string;
  cacheDir?: string;
  envoyPath?: string;
  envoyReleaseBaseUrl?: string;
  envoyVersion?: string;
  llmGatewayWasmPath?: string;
  planoReleaseBaseUrl?: string;
  planoVersion?: string;
}

export interface ProxyConfig {
  artifacts?: ProxyArtifactOptions;
  cleanupOnStop?: boolean;
  gatewayHost?: string;
  logLevel?: ProxyLogLevel;
  modelAliases?: ProxyModelAliases;
  ports?: ProxyPorts;
  providers: ProxyProviderOptions[];
  workDir?: string;
}

export interface ProxyStatus {
  gatewayUrl?: string;
  running: boolean;
  workDir?: string;
}
