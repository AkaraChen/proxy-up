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

export interface ProxyPorts {
  admin?: number;
  brightstaff?: number;
  gateway?: number;
  internal?: number;
}

export interface ProxyGatewayOptions {
  artifacts?: ProxyArtifactOptions;
  cleanupOnStop?: boolean;
  gatewayHost?: string;
  logLevel?: ProxyLogLevel;
  modelAliases?: ProxyModelAliases;
  ports?: ProxyPorts;
  providers: ProxyProviderOptions[];
  workDir?: string;
}

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
  providerInterface: ProxyProviderInterface;
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
  modelAliases: Record<string, ProxyModelAlias>;
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
