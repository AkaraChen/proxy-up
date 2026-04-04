import { create } from "zustand";

interface ProxyUIState {
  selectedProviderIndex: number | null;
  isRunning: boolean;
  isStarting: boolean;
  error: string | null;
  validationErrors: {
    providers: Map<number, string[]>;
    ports: string[];
    global: string[];
  };

  setSelectedProvider: (index: number | null) => void;
  setRunning: (running: boolean) => void;
  setStarting: (starting: boolean) => void;
  setError: (error: string | null) => void;
  setValidationErrors: (errors: ProxyUIState["validationErrors"]) => void;
  clearValidationErrors: () => void;
}

const initialValidationErrors = {
  providers: new Map<number, string[]>(),
  ports: [],
  global: [],
};

export const useProxyUIStore = create<ProxyUIState>((set) => ({
  selectedProviderIndex: null,
  isRunning: false,
  isStarting: false,
  error: null,
  validationErrors: initialValidationErrors,

  setSelectedProvider: (index) => set({ selectedProviderIndex: index }),

  setRunning: (running) => set({ isRunning: running }),

  setStarting: (starting) => set({ isStarting: starting }),

  setError: (error) => set({ error }),

  setValidationErrors: (validationErrors) => set({ validationErrors }),

  clearValidationErrors: () => set({ validationErrors: initialValidationErrors }),
}));
