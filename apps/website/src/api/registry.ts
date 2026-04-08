import { useQuery } from "@tanstack/react-query";
import type { ProxyProviderInterface } from "../lib/proxy";
import type { ProviderPreset } from "../components/config/types";
import bundledRegistry from "./bundled-registry.json";

export interface RegistryProvider {
  name: { "zh-CN": string; en: string };
  endpoints: {
    default: {
      anthropic?: string;
      openai?: string;
    };
  };
  models: Record<string, object>;
}

export type Registry = Record<string, RegistryProvider>;

function getTodayTag(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `v${year}.${month}.${day}`;
}

async function fetchTodayRegistry(): Promise<Registry> {
  const tag = getTodayTag();
  const url = `https://raw.githubusercontent.com/AkaraChen/inference-provider-registry/${tag}/v1/registry.json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Registry not available for ${tag}`);
  return response.json() as Promise<Registry>;
}

function inferInterface(endpoints: { anthropic?: string; openai?: string }): {
  providerInterface: ProxyProviderInterface;
  baseUrl: string;
} {
  const { anthropic: anthUrl, openai: openUrl } = endpoints;

  if (!anthUrl || anthUrl === openUrl) {
    return { providerInterface: "openai", baseUrl: openUrl! };
  }

  // Use openai URL only when anthropic URL lacks "/v1" but openai URL has it
  const baseUrl = !anthUrl.includes("/v1") && openUrl?.includes("/v1") ? openUrl : anthUrl;
  return { providerInterface: "anthropic", baseUrl };
}

export function registryToPresets(registry: Registry): ProviderPreset[] {
  return Object.entries(registry).map(([, provider]) => {
    const { providerInterface, baseUrl } = inferInterface(provider.endpoints.default);
    return {
      label: provider.name["zh-CN"],
      providerInterface,
      baseUrl,
      models: Object.keys(provider.models),
    };
  });
}

export function useProviderRegistry() {
  return useQuery({
    queryKey: ["provider-registry", getTodayTag()],
    queryFn: fetchTodayRegistry,
    select: registryToPresets,
    placeholderData: bundledRegistry as Registry,
    staleTime: Infinity,
    retry: false,
  });
}
