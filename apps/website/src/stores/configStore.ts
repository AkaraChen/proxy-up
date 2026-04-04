import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ProxyGatewayOptions,
  ProxyProviderOptions,
  ProxyPorts,
  ProxyLogLevel,
  ProxyModelAliases,
  ProxyArtifactOptions,
} from "@proxy-up/proxy";
import {
  DEFAULT_GATEWAY_HOST,
  DEFAULT_GATEWAY_PORT,
  DEFAULT_INTERNAL_PORT,
  DEFAULT_BRIGHTSTAFF_PORT,
  DEFAULT_ADMIN_PORT,
  DEFAULT_LOG_LEVEL,
  DEFAULT_PLANO_VERSION,
  DEFAULT_ENVOY_VERSION,
  DEFAULT_CACHE_DIR,
} from "@proxy-up/proxy";

interface ProxyConfigState {
  config: {
    providers: ProxyProviderOptions[];
    ports?: ProxyPorts;
    gatewayHost?: string;
    logLevel?: ProxyLogLevel;
    modelAliases?: ProxyModelAliases;
    artifacts?: ProxyArtifactOptions;
    cleanupOnStop?: boolean;
    workDir?: string;
  };

  setConfig: (config: ProxyGatewayOptions) => void;
  updateProviders: (providers: ProxyProviderOptions[]) => void;
  updatePorts: (ports: ProxyPorts) => void;
  updateLogLevel: (level: ProxyLogLevel) => void;
  updateModelAliases: (aliases: ProxyModelAliases) => void;
  updateArtifacts: (artifacts: ProxyArtifactOptions) => void;
  addProvider: (provider: ProxyProviderOptions) => void;
  removeProvider: (index: number) => void;
  updateProvider: (index: number, provider: Partial<ProxyProviderOptions>) => void;
  resetConfig: () => void;
}

const initialConfig = {
  providers: [],
  ports: {
    gateway: DEFAULT_GATEWAY_PORT,
    internal: DEFAULT_INTERNAL_PORT,
    brightstaff: DEFAULT_BRIGHTSTAFF_PORT,
    admin: DEFAULT_ADMIN_PORT,
  },
  gatewayHost: DEFAULT_GATEWAY_HOST,
  logLevel: DEFAULT_LOG_LEVEL as ProxyLogLevel,
  modelAliases: {},
  artifacts: {
    planoVersion: DEFAULT_PLANO_VERSION,
    envoyVersion: DEFAULT_ENVOY_VERSION,
    cacheDir: DEFAULT_CACHE_DIR,
  },
  cleanupOnStop: true,
  workDir: undefined,
};

export const useProxyConfigStore = create(
  persist<ProxyConfigState>(
    (set) => ({
      config: initialConfig,

      setConfig: (config) => set({ config }),

      updateProviders: (providers) =>
        set((state) => ({
          config: { ...state.config, providers },
        })),

      updatePorts: (ports) =>
        set((state) => ({
          config: { ...state.config, ports },
        })),

      updateLogLevel: (logLevel) =>
        set((state) => ({
          config: { ...state.config, logLevel },
        })),

      updateModelAliases: (modelAliases) =>
        set((state) => ({
          config: { ...state.config, modelAliases },
        })),

      updateArtifacts: (artifacts) =>
        set((state) => ({
          config: { ...state.config, artifacts },
        })),

      addProvider: (provider) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: [...state.config.providers, provider],
          },
        })),

      removeProvider: (index) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.filter((_, i) => i !== index),
          },
        })),

      updateProvider: (index, providerUpdate) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.map((provider, i) =>
              i === index ? { ...provider, ...providerUpdate } : provider,
            ),
          },
        })),

      resetConfig: () => set({ config: initialConfig }),
    }),
    {
      name: "proxy-config-storage",
      version: 1,
    },
  ),
);
