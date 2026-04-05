import { create } from "zustand";

interface ProxyUIState {
  selectedProviderId: string | null; // 改用 provider ID 而非 index
  selectedModelIndex: number | null; // 新增，追踪选中的 model（用于编辑）
  isRunning: boolean;
  isStarting: boolean;
  error: string | null;
  validationErrors: {
    providers: Map<string, string[]>; // 改用 providerId 作为 key
    ports: string[];
    global: string[];
  };

  setSelectedProvider: (id: string | null) => void;
  setSelectedModelIndex: (index: number | null) => void;
  setRunning: (running: boolean) => void;
  setStarting: (starting: boolean) => void;
  setError: (error: string | null) => void;
  setValidationErrors: (errors: ProxyUIState["validationErrors"]) => void;
  clearValidationErrors: () => void;
}

const initialValidationErrors = {
  providers: new Map<string, string[]>(),
  ports: [],
  global: [],
};

export const useProxyUIStore = create<ProxyUIState>((set) => ({
  selectedProviderId: null,
  selectedModelIndex: null,
  isRunning: false,
  isStarting: false,
  error: null,
  validationErrors: initialValidationErrors,

  setSelectedProvider: (id) => set({ selectedProviderId: id, selectedModelIndex: null }),

  setSelectedModelIndex: (index) => set({ selectedModelIndex: index }),

  setRunning: (running) => set({ isRunning: running }),

  setStarting: (starting) => set({ isStarting: starting }),

  setError: (error) => set({ error }),

  setValidationErrors: (validationErrors) => set({ validationErrors }),

  clearValidationErrors: () => set({ validationErrors: initialValidationErrors }),
}));
