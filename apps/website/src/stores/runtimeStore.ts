import { create } from "zustand";
import type { GeneratedProxyConfig } from "@proxy-up/proxy/browser";
import type { ProxyGateway } from "@proxy-up/proxy";

interface ProxyRuntimeState {
  gateway: ProxyGateway | null;
  generatedConfig: GeneratedProxyConfig | null;

  setGateway: (gateway: ProxyGateway | null) => void;
  setGeneratedConfig: (config: GeneratedProxyConfig | null) => void;
}

export const useProxyRuntimeStore = create<ProxyRuntimeState>((set) => ({
  gateway: null,
  generatedConfig: null,

  setGateway: (gateway) => set({ gateway }),

  setGeneratedConfig: (generatedConfig) => set({ generatedConfig }),
}));
