import type { ProxyGatewayOptions } from "@proxy-up/proxy/browser";

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
    errors.global.push("At least one provider must be configured");
  }

  // Check provider name uniqueness
  const providerNames = new Set<string>();
  const defaultProviders: number[] = [];

  config.providers.forEach((provider, index) => {
    const providerErrors: string[] = [];

    const name = provider.name ?? provider.providerInterface ?? "custom";
    if (providerNames.has(name)) {
      providerErrors.push(`Provider name "${name}" must be unique`);
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
      providerErrors.push(`Provider "${provider.providerInterface}" requires baseUrl`);
    }

    if (providerErrors.length > 0) {
      errors.providers.set(index, providerErrors);
    }
  });

  // Check only one default provider
  if (defaultProviders.length > 1) {
    errors.global.push("Only one provider can be marked as default");
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
      errors.ports.push("All ports must be unique");
    }

    ports.forEach((port) => {
      if (port < 1 || port > 65535) {
        errors.ports.push(`Port ${port} must be between 1 and 65535`);
      }
    });
  }

  return errors;
}
