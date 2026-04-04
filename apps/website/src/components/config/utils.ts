import type {
  GeneratedProxyConfig,
  ProxyGatewayOptions,
  ProxyModelAliases,
  ProxyProviderOptions,
} from "@proxy-up/proxy/browser";

import type { ValidationErrors } from "../../stores/middleware/validation";
import { getProviderMeta } from "./data";
import type { AliasEntry } from "./types";

export function getAliasEntries(aliases?: ProxyModelAliases): AliasEntry[] {
  return Object.entries(aliases ?? {}).map(([name, alias]) => ({
    name,
    target: typeof alias === "string" ? alias : alias.target,
  }));
}

export function toAliasMap(entries: AliasEntry[]): ProxyModelAliases {
  const aliases: ProxyModelAliases = {};

  for (const entry of entries) {
    aliases[entry.name] = entry.target;
  }

  return aliases;
}

export function countValidationIssues(errors: ValidationErrors) {
  let total = errors.global.length + errors.ports.length;

  for (const messages of errors.providers.values()) {
    total += messages.length;
  }

  return total;
}

export function getProviderLabel(provider: ProxyProviderOptions, index: number) {
  if (provider.name?.trim()) {
    return provider.name;
  }

  if (provider.provider?.trim()) {
    return provider.provider;
  }

  if (provider.providerInterface) {
    return getProviderMeta(provider.providerInterface)?.label ?? provider.providerInterface;
  }

  return `Provider ${index + 1}`;
}

export function getProviderSubtitle(provider: ProxyProviderOptions) {
  const identity = provider.provider ?? provider.providerInterface ?? "custom";
  const model = provider.model.trim() || "model pending";
  return `${identity} / ${model}`;
}

export function getProviderIssues(errors: ValidationErrors, index: number) {
  return errors.providers.get(index) ?? [];
}

export function getGatewayPreview(
  config: ProxyGatewayOptions,
  generatedConfig: GeneratedProxyConfig | null,
) {
  if (generatedConfig) {
    return generatedConfig.gatewayUrl;
  }

  const host = config.gatewayHost ?? "127.0.0.1";
  const port = config.ports?.gateway ?? 12000;
  return `http://${host}:${port}`;
}
