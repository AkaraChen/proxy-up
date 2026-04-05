import type { ProxyGatewayOptions } from "@proxy-up/proxy/browser";
import i18n from "../../i18n";

export interface ValidationErrors {
  providers: Map<number, string[]>;
  ports: string[];
  global: string[];
}

export function validateConfig(config: ProxyGatewayOptions): ValidationErrors {
  const errors: ValidationErrors = {
    providers: new Map<number, string[]>(),
    ports: [],
    global: [],
  };

  // Validate providers
  if (config.providers.length === 0) {
    errors.global.push(i18n.t("validation:providers.minOne"));
  }

  // Check provider name uniqueness
  const providerNames = new Set<string>();
  const defaultProviders: number[] = [];

  config.providers.forEach((provider, index) => {
    const providerErrors: string[] = [];

    const name = provider.name ?? provider.providerInterface ?? "custom";
    if (providerNames.has(name)) {
      providerErrors.push(i18n.t("validation:providers.nameUnique", { name }));
    }
    providerNames.add(name);

    if (provider.default) {
      defaultProviders.push(index);
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
      errors.providers.set(index, providerErrors);
    }
  });

  // Check only one default provider
  if (defaultProviders.length > 1) {
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
