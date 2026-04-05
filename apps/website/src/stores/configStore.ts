import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  ProxyPorts,
  ProxyLogLevel,
  ProxyModelAliases,
  ProxyArtifactOptions,
  ProxyProviderOptions,
} from "@proxy-up/proxy/browser";
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
} from "@proxy-up/proxy/browser";
import type { UIProvider, UIConfig } from "./types";
import { transformUIProvidersToOptions } from "./transform";

interface ProxyConfigState {
  config: UIConfig;

  updateProviders: (providers: UIProvider[]) => void;
  updatePorts: (ports: ProxyPorts) => void;
  updateLogLevel: (level: ProxyLogLevel) => void;
  updateModelAliases: (aliases: ProxyModelAliases) => void;
  updateArtifacts: (artifacts: ProxyArtifactOptions) => void;
  updateGatewayHost: (host: string) => void;
  updateCleanupOnStop: (cleanup: boolean) => void;
  updateWorkDir: (workDir: string | undefined) => void;

  // Provider 操作方法
  addProvider: (provider: UIProvider) => void;
  removeProvider: (providerId: string) => void;
  updateProvider: (providerId: string, provider: Partial<UIProvider>) => void;

  // Model 操作方法
  addModel: (providerId: string, model: string) => void;
  removeModel: (providerId: string, modelIndex: number) => void;
  updateModel: (providerId: string, modelIndex: number, model: string) => void;
  setDefaultModel: (providerId: string, modelIndex: number | undefined) => void;

  resetConfig: () => void;

  // 获取转换后的 ProxyProviderOptions（用于生成配置）
  getProvidersOptions: () => ProxyProviderOptions[];
}

const initialConfig: UIConfig = {
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

export const useProxyConfigStore = create<ProxyConfigState>()(
  immer((set, get) => ({
    config: initialConfig,

    updateProviders: (providers) =>
      set((state) => {
        state.config.providers = providers;
      }),

    updatePorts: (ports) =>
      set((state) => {
        state.config.ports = ports;
      }),

    updateLogLevel: (logLevel) =>
      set((state) => {
        state.config.logLevel = logLevel;
      }),

    updateModelAliases: (modelAliases) =>
      set((state) => {
        state.config.modelAliases = modelAliases;
      }),

    updateArtifacts: (artifacts) =>
      set((state) => {
        state.config.artifacts = artifacts;
      }),

    updateGatewayHost: (gatewayHost) =>
      set((state) => {
        state.config.gatewayHost = gatewayHost;
      }),

    updateCleanupOnStop: (cleanupOnStop) =>
      set((state) => {
        state.config.cleanupOnStop = cleanupOnStop;
      }),

    updateWorkDir: (workDir) =>
      set((state) => {
        state.config.workDir = workDir;
      }),

    // Provider 操作方法
    addProvider: (provider) =>
      set((state) => {
        state.config.providers.push(provider);
      }),

    removeProvider: (providerId) =>
      set((state) => {
        const index = state.config.providers.findIndex((p) => p.id === providerId);
        if (index !== -1) {
          state.config.providers.splice(index, 1);
        }
      }),

    updateProvider: (providerId, providerUpdate) =>
      set((state) => {
        const provider = state.config.providers.find((p) => p.id === providerId);
        if (provider) {
          Object.assign(provider, providerUpdate);
        }
      }),

    // Model 操作方法
    addModel: (providerId, model) =>
      set((state) => {
        const provider = state.config.providers.find((p) => p.id === providerId);
        if (provider) {
          provider.models.push(model);
        }
      }),

    removeModel: (providerId, modelIndex) =>
      set((state) => {
        const provider = state.config.providers.find((p) => p.id === providerId);
        if (provider) {
          provider.models.splice(modelIndex, 1);
          // 如果删除的是 default model，清除 defaultModel
          if (provider.defaultModel === modelIndex) {
            provider.defaultModel = undefined;
          } else if (provider.defaultModel !== undefined && provider.defaultModel > modelIndex) {
            provider.defaultModel -= 1;
          }
        }
      }),

    updateModel: (providerId, modelIndex, model) =>
      set((state) => {
        const provider = state.config.providers.find((p) => p.id === providerId);
        if (provider) {
          provider.models[modelIndex] = model;
        }
      }),

    setDefaultModel: (providerId, modelIndex) =>
      set((state) => {
        const provider = state.config.providers.find((p) => p.id === providerId);
        if (provider) {
          provider.defaultModel = modelIndex;
        }
      }),

    resetConfig: () =>
      set((state) => {
        state.config = initialConfig;
      }),

    // 获取转换后的 ProxyProviderOptions（用于生成配置）
    getProvidersOptions: () => {
      return transformUIProvidersToOptions(get().config.providers);
    },
  })),
);
