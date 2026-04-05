import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { GeneratedProxyConfig } from "@proxy-up/proxy/browser";
import type { ProxyGateway } from "@proxy-up/proxy";

interface ProxyRuntimeState {
  gateway: ProxyGateway | null;
  generatedConfig: GeneratedProxyConfig | null;

  setGateway: (gateway: ProxyGateway | null) => void;
  setGeneratedConfig: (config: GeneratedProxyConfig | null) => void;
}

export const useProxyRuntimeStore = create<ProxyRuntimeState>()(
  immer((set) => ({
    gateway: null,
    generatedConfig: null,

    setGateway: (gateway) =>
      set((state) => {
        state.gateway = gateway;
      }),

    setGeneratedConfig: (generatedConfig) =>
      set((state) => {
        state.generatedConfig = generatedConfig;
      }),
  })),
);
