import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { ProxyConfig } from "../lib/proxy";
import { useProxyConfigStore, useProxyUIStore } from "../stores";
import { transformOptionsToUIProviders } from "../stores/transform";

// Query keys for cache management
export const queryKeys = {
  config: ["config"] as const,
  status: ["status"] as const,
};

// Hook: Fetch config with suspense
export function useConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => {
      const response = await apiClient.api.config.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },
  });
}

// Hook: Initialize config from server (mutation version for explicit initialization)
export function useInitConfig() {
  const {
    updateProviders,
    updatePorts,
    updateLogLevel,
    updateGatewayHost,
    updateArtifacts,
    updateCleanupOnStop,
    updateWorkDir,
    updateModelAliases,
  } = useProxyConfigStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.config.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },
    onSuccess: (config) => {
      // Transform and update store
      const uiProviders = transformOptionsToUIProviders(config.providers || []);
      updateProviders(uiProviders);
      updatePorts(config.ports || {});
      updateLogLevel(config.logLevel || "info");
      updateGatewayHost(config.gatewayHost || "0.0.0.0");
      updateArtifacts(config.artifacts || {});
      updateCleanupOnStop(config.cleanupOnStop ?? true);
      updateWorkDir(config.workDir);
      updateModelAliases(config.modelAliases || {});
    },
  });
}

// Hook: Initialize status from server
export function useInitStatus() {
  const { setRunning } = useProxyUIStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.status.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      return response.json();
    },
    onSuccess: (status) => {
      setRunning(status.running);
    },
  });
}

// Hook: Fetch status with polling support
export function useStatus(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: async () => {
      const response = await apiClient.api.status.$get();
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      return response.json();
    },
    refetchInterval: options?.refetchInterval,
  });
}

// Hook: Save configuration (POST - initial save)
export function useSaveConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: ProxyConfig) => {
      const response = await apiClient.api.config.$post({ json: config });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Failed to save config");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}

// Hook: Update configuration (PUT - update existing)
export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: ProxyConfig) => {
      const response = await apiClient.api.config.$put({ json: config });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Failed to update config");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}

// Hook: Start gateway
export function useStartGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.start.$post();
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Failed to start gateway");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Hook: Stop gateway
export function useStopGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.stop.$post();
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Failed to stop gateway");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Hook: Restart gateway
export function useRestartGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.api.restart.$post();
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error("error" in errorData ? errorData.error : "Failed to restart gateway");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}
