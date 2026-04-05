import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

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

export const useProxyUIStore = create<ProxyUIState>()(
  immer((set) => ({
    selectedProviderId: null,
    selectedModelIndex: null,
    isRunning: false,
    isStarting: false,
    error: null,
    validationErrors: initialValidationErrors,

    setSelectedProvider: (id) =>
      set((state) => {
        state.selectedProviderId = id;
        state.selectedModelIndex = null;
      }),

    setSelectedModelIndex: (index) =>
      set((state) => {
        state.selectedModelIndex = index;
      }),

    setRunning: (running) =>
      set((state) => {
        state.isRunning = running;
      }),

    setStarting: (starting) =>
      set((state) => {
        state.isStarting = starting;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setValidationErrors: (validationErrors) =>
      set((state) => {
        state.validationErrors = validationErrors;
      }),

    clearValidationErrors: () =>
      set((state) => {
        state.validationErrors = initialValidationErrors;
      }),
  })),
);
