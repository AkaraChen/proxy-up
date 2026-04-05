import type { UIConfig } from "../types";
import i18n from "../../i18n";

export interface ValidationErrors {
  providers: Map<string, string[]>;
  ports: string[];
  global: string[];
}

export function validateConfig(config: UIConfig): ValidationErrors {
  const errors: ValidationErrors = {
    providers: new Map<string, string[]>(),
    ports: [],
    global: [],
  };

  // Validate providers
  if (config.providers.length === 0) {
    errors.global.push(i18n.t("validation:providers.minOne"));
  }

  // Check provider name uniqueness
  const providerNames = new Set<string>();
  const defaultModels: string[] = []; // Track providerId that have defaultModel set

  config.providers.forEach((provider) => {
    const providerErrors: string[] = [];

    // Check name uniqueness
    if (providerNames.has(provider.name)) {
      providerErrors.push(i18n.t("validation:providers.nameUnique", { name: provider.name }));
    }
    providerNames.add(provider.name);

    // Track default models
    if (provider.defaultModel !== undefined) {
      defaultModels.push(provider.id);
    }

    // Check at least one model
    if (provider.models.length === 0) {
      providerErrors.push(i18n.t("validation:providers.minOneModel"));
    }

    // Check required baseUrl for certain providers
    const requiresBaseUrl = ["amazon_bedrock", "azure_openai", "ollama", "plano", "qwen"];
    if (
      provider.providerInterface &&
      requiresBaseUrl.includes(provider.providerInterface) &&
      !provider.baseUrl
    ) {
      providerErrors.push(
        i18n.t("validation:providers.requiresBaseUrl", { provider: provider.providerInterface }),
      );
    }

    if (providerErrors.length > 0) {
      errors.providers.set(provider.id, providerErrors);
    }
  });

  // Check only one default model across all providers
  if (defaultModels.length > 1) {
    errors.global.push(i18n.t("validation:providers.onlyOneDefault"));
  }

  // Validate ports
  if (config.ports) {
    const ports = [
      config.ports.gateway,
      config.ports.internal,
      config.ports.brightstaff,
      config.ports.admin,
    ].filter((p) => p !== undefined);

    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.ports.push(i18n.t("validation:ports.unique"));
    }

    ports.forEach((port) => {
      if (port < 1 || port > 65535) {
        errors.ports.push(i18n.t("validation:ports.range", { port }));
      }
    });
  }

  return errors;
}
