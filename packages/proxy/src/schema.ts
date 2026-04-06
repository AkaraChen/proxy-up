import { z } from "zod";

/**
 * Provider interface enum - all supported provider types
 */
export const ProxyProviderInterfaceSchema = z.enum([
  "amazon_bedrock",
  "anthropic",
  "azure_openai",
  "deepseek",
  "gemini",
  "groq",
  "mistral",
  "moonshotai",
  "ollama",
  "openai",
  "plano",
  "qwen",
  "together_ai",
  "xai",
  "zhipu",
]);

export type ProxyProviderInterface = z.infer<typeof ProxyProviderInterfaceSchema>;

/**
 * Log level enum
 */
export const ProxyLogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error"]);

export type ProxyLogLevel = z.infer<typeof ProxyLogLevelSchema>;

/**
 * Provider configuration schema
 */
export const ProxyProviderOptionsSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  default: z.boolean().optional(),
  model: z.string().min(1, "Model is required"),
  name: z.string().optional(),
  passthroughAuth: z.boolean().optional(),
  provider: z.string().optional(),
  providerInterface: ProxyProviderInterfaceSchema.optional(),
});

export type ProxyProviderOptions = z.infer<typeof ProxyProviderOptionsSchema>;

/**
 * Port configuration schema
 */
export const ProxyPortsSchema = z
  .object({
    admin: z.number().int().min(1).max(65535).optional(),
    brightstaff: z.number().int().min(1).max(65535).optional(),
    gateway: z.number().int().min(1).max(65535).optional(),
    internal: z.number().int().min(1).max(65535).optional(),
  })
  .refine(
    (data) => {
      const ports = Object.values(data).filter((p): p is number => p !== undefined);
      return new Set(ports).size === ports.length;
    },
    { message: "Ports must be unique" },
  );

export type ProxyPorts = z.infer<typeof ProxyPortsSchema>;

/**
 * Model alias schema
 */
export const ProxyModelAliasSchema = z.object({
  target: z.string().min(1, "Target model is required"),
});

export type ProxyModelAlias = z.infer<typeof ProxyModelAliasSchema>;

export const ProxyModelAliasesSchema = z.record(
  z.string(),
  z.union([z.string(), ProxyModelAliasSchema]),
);

export type ProxyModelAliases = z.infer<typeof ProxyModelAliasesSchema>;

/**
 * Artifact options schema
 */
export const ProxyArtifactOptionsSchema = z.object({
  brightstaffPath: z.string().optional(),
  cacheDir: z.string().optional(),
  envoyPath: z.string().optional(),
  envoyReleaseBaseUrl: z.string().url().optional(),
  envoyVersion: z.string().optional(),
  llmGatewayWasmPath: z.string().optional(),
  planoReleaseBaseUrl: z.string().url().optional(),
  planoVersion: z.string().optional(),
});

export type ProxyArtifactOptions = z.infer<typeof ProxyArtifactOptionsSchema>;

/**
 * Provider metadata
 */
export const PROVIDER_DEFINITIONS: Record<string, { requiresBaseUrl: boolean }> = {
  amazon_bedrock: { requiresBaseUrl: true },
  anthropic: { requiresBaseUrl: false },
  azure_openai: { requiresBaseUrl: true },
  deepseek: { requiresBaseUrl: false },
  gemini: { requiresBaseUrl: false },
  groq: { requiresBaseUrl: false },
  mistral: { requiresBaseUrl: false },
  moonshotai: { requiresBaseUrl: false },
  ollama: { requiresBaseUrl: true },
  openai: { requiresBaseUrl: false },
  plano: { requiresBaseUrl: true },
  qwen: { requiresBaseUrl: true },
  together_ai: { requiresBaseUrl: false },
  xai: { requiresBaseUrl: false },
  zhipu: { requiresBaseUrl: false },
};

/**
 * Full gateway options schema
 */
export const ProxyGatewayOptionsSchema = z
  .object({
    artifacts: ProxyArtifactOptionsSchema.optional(),
    cleanupOnStop: z.boolean().optional(),
    gatewayHost: z.string().optional(),
    logLevel: ProxyLogLevelSchema.optional(),
    modelAliases: ProxyModelAliasesSchema.optional(),
    ports: ProxyPortsSchema.optional(),
    providers: z.array(ProxyProviderOptionsSchema).min(1, "At least one provider is required"),
    workDir: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate default provider count
    const defaultCount = data.providers.filter((p) => p.default).length;
    if (defaultCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one provider can be marked as default",
        path: ["providers"],
      });
    }

    // Validate each provider
    data.providers.forEach((provider, index) => {
      const basePath = ["providers", index];

      // Check provider/model format
      if (!provider.provider && !provider.model.includes("/")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Provider is required for model "${provider.model}". Use { provider, model } or "<provider>/<model>" format.`,
          path: [...basePath, "model"],
        });
      }

      // Resolve provider interface
      const providerInterface = provider.providerInterface ?? provider.provider?.toLowerCase();

      // Check baseUrl requirement for known providers
      if (
        providerInterface &&
        PROVIDER_DEFINITIONS[providerInterface]?.requiresBaseUrl &&
        !provider.baseUrl
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Provider "${providerInterface}" requires baseUrl`,
          path: [...basePath, "baseUrl"],
        });
      }

      // Check baseUrl requirement for unknown providers
      if (providerInterface && !PROVIDER_DEFINITIONS[providerInterface] && !provider.baseUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Custom provider requires baseUrl`,
          path: [...basePath, "baseUrl"],
        });
      }
    });

    // Check provider name uniqueness
    const names = data.providers.map((p) => p.name ?? `${p.provider ?? "unknown"}/${p.model}`);
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider names must be unique",
        path: ["providers"],
      });
    }
  });

export type ProxyGatewayOptions = z.infer<typeof ProxyGatewayOptionsSchema>;

/**
 * Check if a provider requires baseUrl
 */
export function providerRequiresBaseUrl(providerInterface: string): boolean {
  return PROVIDER_DEFINITIONS[providerInterface]?.requiresBaseUrl ?? true;
}
