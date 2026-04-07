import type { ProxyProviderInterface } from "../../lib/proxy";

export type AliasEntry = {
  name: string;
  target: string;
};

export interface ProviderMeta {
  baseUrlExample?: string;
  label: string;
  modelExample: string;
  note: string;
  provider: string;
  providerInterface: ProxyProviderInterface;
  requiresBaseUrl: boolean;
}

export interface ProviderPreset {
  baseUrl: string;
  label: string;
  models: string[];
  providerInterface: ProxyProviderInterface;
}
