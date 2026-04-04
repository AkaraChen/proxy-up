import { BUILTIN_PROVIDER_ENDPOINTS, type BuiltinProviderEndpoint } from "./constants.js";
import type {
  NormalizedProxyProvider,
  ProxyModelAlias,
  ProxyModelAliases,
  ProxyProviderInterface,
  ProxyProviderOptions,
} from "./types.js";

interface ProviderDefinition {
  providerInterface: ProxyProviderInterface;
  requiresBaseUrl: boolean;
}

const PROVIDER_DEFINITIONS: Record<string, ProviderDefinition> = {
  amazon_bedrock: {
    providerInterface: "amazon_bedrock",
    requiresBaseUrl: true,
  },
  anthropic: {
    providerInterface: "anthropic",
    requiresBaseUrl: false,
  },
  azure_openai: {
    providerInterface: "azure_openai",
    requiresBaseUrl: true,
  },
  deepseek: {
    providerInterface: "deepseek",
    requiresBaseUrl: false,
  },
  gemini: {
    providerInterface: "gemini",
    requiresBaseUrl: false,
  },
  groq: {
    providerInterface: "groq",
    requiresBaseUrl: false,
  },
  mistral: {
    providerInterface: "mistral",
    requiresBaseUrl: false,
  },
  moonshotai: {
    providerInterface: "moonshotai",
    requiresBaseUrl: false,
  },
  ollama: {
    providerInterface: "ollama",
    requiresBaseUrl: true,
  },
  openai: {
    providerInterface: "openai",
    requiresBaseUrl: false,
  },
  plano: {
    providerInterface: "plano",
    requiresBaseUrl: true,
  },
  qwen: {
    providerInterface: "qwen",
    requiresBaseUrl: true,
  },
  together_ai: {
    providerInterface: "together_ai",
    requiresBaseUrl: false,
  },
  xai: {
    providerInterface: "xai",
    requiresBaseUrl: false,
  },
  zhipu: {
    providerInterface: "zhipu",
    requiresBaseUrl: false,
  },
};

function parseProviderAndModel(input: ProxyProviderOptions): { model: string; provider: string } {
  if (input.provider) {
    return {
      model: input.model,
      provider: input.provider.toLowerCase(),
    };
  }

  const [provider, ...modelParts] = input.model.split("/");
  if (!provider || modelParts.length === 0) {
    throw new Error(
      `Provider is required for model "${input.model}". Use { provider, model } or a "<provider>/<model>" model string.`,
    );
  }

  return {
    model: modelParts.join("/"),
    provider: provider.toLowerCase(),
  };
}

function sanitizeBaseUrlPathPrefix(pathname: string) {
  if (!pathname || pathname === "/") {
    return undefined;
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function hashSuffix(input: string) {
  let hash = 2166136261;

  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 8);
}

function createClusterName(
  providerInterface: ProxyProviderInterface,
  hostname: string,
  port: number,
  pathPrefix?: string,
) {
  const safeBase = `${providerInterface}_${hostname}_${port}`.replaceAll(/[^a-zA-Z0-9_]/g, "_");
  const suffix = hashSuffix(`${hostname}:${port}${pathPrefix ?? ""}`);

  return `${safeBase}_${suffix}`;
}

function normalizeOneProvider(input: ProxyProviderOptions): NormalizedProxyProvider {
  const { model, provider } = parseProviderAndModel(input);
  const definition = PROVIDER_DEFINITIONS[provider];

  if (definition && input.providerInterface) {
    if (input.providerInterface !== definition.providerInterface) {
      throw new Error(
        `Provider "${provider}" already maps to providerInterface "${definition.providerInterface}", but "${input.providerInterface}" was supplied.`,
      );
    }
  }

  const providerInterface = input.providerInterface ?? definition?.providerInterface;

  if (!providerInterface) {
    throw new Error(`Custom provider "${provider}" requires providerInterface to be set.`);
  }

  if (definition?.requiresBaseUrl && !input.baseUrl) {
    throw new Error(`Provider "${provider}" requires baseUrl to be set in native proxy mode.`);
  }

  if (!definition && !input.baseUrl) {
    throw new Error(`Custom provider "${provider}" must provide baseUrl so Envoy can route to it.`);
  }

  let endpointHost: string | undefined;
  let endpointPort: number | undefined;
  let endpointProtocol: "http" | "https" | undefined;
  let baseUrlPathPrefix: string | undefined;
  let clusterName: string | undefined;

  if (input.baseUrl) {
    const parsed = new URL(input.baseUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`baseUrl for provider "${provider}" must use http or https.`);
    }

    endpointHost = parsed.hostname;
    endpointProtocol = parsed.protocol === "https:" ? "https" : "http";
    endpointPort =
      parsed.port === "" ? (endpointProtocol === "https" ? 443 : 80) : Number(parsed.port);
    baseUrlPathPrefix = sanitizeBaseUrlPathPrefix(parsed.pathname);
    clusterName = createClusterName(
      providerInterface,
      endpointHost,
      endpointPort,
      baseUrlPathPrefix,
    );
  }

  return {
    accessKey: input.apiKey,
    baseUrl: input.baseUrl,
    baseUrlPathPrefix,
    clusterName,
    default: input.default,
    endpointHost,
    endpointPort,
    endpointProtocol,
    model,
    name: input.name ?? `${provider}/${model}`,
    passthroughAuth: input.passthroughAuth,
    provider,
    providerInterface,
  };
}

export function normalizeProviders(inputs: ProxyProviderOptions[]) {
  if (inputs.length === 0) {
    throw new Error("At least one provider must be configured.");
  }

  const normalized = inputs.map(normalizeOneProvider);
  const seenNames = new Set<string>();
  let defaultCount = 0;

  for (const provider of normalized) {
    if (seenNames.has(provider.name)) {
      throw new Error(`Provider name "${provider.name}" must be unique.`);
    }
    seenNames.add(provider.name);

    if (provider.default) {
      defaultCount += 1;
    }
  }

  if (defaultCount > 1) {
    throw new Error("Only one provider can be marked as default.");
  }

  return normalized;
}

export function normalizeModelAliases(aliases?: ProxyModelAliases) {
  const normalized: Record<string, ProxyModelAlias> = {};
  if (!aliases) {
    return normalized;
  }

  for (const [name, alias] of Object.entries(aliases)) {
    normalized[name] =
      typeof alias === "string"
        ? {
            target: alias,
          }
        : alias;
  }

  return normalized;
}

export function getBuiltinProviderEndpoint(
  providerInterface: ProxyProviderInterface,
): BuiltinProviderEndpoint | undefined {
  return BUILTIN_PROVIDER_ENDPOINTS[providerInterface as keyof typeof BUILTIN_PROVIDER_ENDPOINTS];
}
