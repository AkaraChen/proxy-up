import type { ProxyProviderInterface } from "@proxy-up/proxy/browser";

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
  description: string;
  label: string;
  modelExample: string;
  providerInterface: ProxyProviderInterface;
}
