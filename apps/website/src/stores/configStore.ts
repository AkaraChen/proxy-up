import { create } from "zustand";
import { persist } from "zustand/middleware";
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
import { migrateOldProviderToUIProvider, transformUIProvidersToOptions } from "./transform";

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

export const useProxyConfigStore = create(
  persist<ProxyConfigState>(
    (set, get) => ({
      config: initialConfig,

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

      updateGatewayHost: (gatewayHost) =>
        set((state) => ({
          config: { ...state.config, gatewayHost },
        })),

      updateCleanupOnStop: (cleanupOnStop) =>
        set((state) => ({
          config: { ...state.config, cleanupOnStop },
        })),

      updateWorkDir: (workDir) =>
        set((state) => ({
          config: { ...state.config, workDir },
        })),

      // Provider 操作方法
      addProvider: (provider) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: [...state.config.providers, provider],
          },
        })),

      removeProvider: (providerId) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.filter((p) => p.id !== providerId),
          },
        })),

      updateProvider: (providerId, providerUpdate) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.map((p) =>
              p.id === providerId ? { ...p, ...providerUpdate } : p,
            ),
          },
        })),

      // Model 操作方法
      addModel: (providerId, model) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.map((p) =>
              p.id === providerId ? { ...p, models: [...p.models, model] } : p,
            ),
          },
        })),

      removeModel: (providerId, modelIndex) =>
        set((state) => {
          const providers = state.config.providers.map((p) => {
            if (p.id !== providerId) return p;

            const newModels = p.models.filter((_, i) => i !== modelIndex);
            // 如果删除的是 default model，清除 defaultModel
            const newDefaultModel =
              p.defaultModel === modelIndex
                ? undefined
                : p.defaultModel !== undefined && p.defaultModel > modelIndex
                  ? p.defaultModel - 1
                  : p.defaultModel;

            return { ...p, models: newModels, defaultModel: newDefaultModel };
          });

          return { config: { ...state.config, providers } };
        }),

      updateModel: (providerId, modelIndex, model) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.map((p) =>
              p.id === providerId
                ? { ...p, models: p.models.map((m, i) => (i === modelIndex ? model : m)) }
                : p,
            ),
          },
        })),

      setDefaultModel: (providerId, modelIndex) =>
        set((state) => ({
          config: {
            ...state.config,
            providers: state.config.providers.map((p) =>
              p.id === providerId ? { ...p, defaultModel: modelIndex } : p,
            ),
          },
        })),

      resetConfig: () => set({ config: initialConfig }),

      // 获取转换后的 ProxyProviderOptions（用于生成配置）
      getProvidersOptions: () => {
        return transformUIProvidersToOptions(get().config.providers);
      },
    }),
    {
      name: "proxy-config-storage",
      version: 2, // 升级版本号触发迁移
      migrate: (persistedState, version) => {
        if (version === 1) {
          // 从 v1 ProxyProviderOptions[] 迁移到 v2 UIProvider[]
          const oldState = persistedState as any;
          const oldProviders = oldState.config?.providers as ProxyProviderOptions[] | undefined;

          if (!oldProviders) {
            return persistedState;
          }

          const newProviders: UIProvider[] = oldProviders.map((p, index) =>
            migrateOldProviderToUIProvider(p, index),
          );

          return {
            ...oldState,
            config: {
              ...oldState.config,
              providers: newProviders,
            },
          };
        }
        return persistedState;
      },
    },
  ),
);
