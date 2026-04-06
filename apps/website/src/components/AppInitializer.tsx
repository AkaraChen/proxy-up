import { useEffect, type ReactNode } from "react";
import { useInitConfig, useInitStatus } from "../api/hooks";

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const initConfig = useInitConfig();
  const initStatus = useInitStatus();

  // React Query mutation functions are stable references, safe to include in deps
  useEffect(() => {
    initConfig.mutate();
    initStatus.mutate();
  }, [initConfig.mutate, initStatus.mutate]);

  // Wait for initialization to complete
  if (initConfig.isPending || initStatus.isPending) {
    return <div>Loading...</div>;
  }

  if (initConfig.isError) {
    return <div>Error loading config: {initConfig.error?.message}</div>;
  }

  if (initStatus.isError) {
    return <div>Error loading status: {initStatus.error?.message}</div>;
  }

  return <>{children}</>;
}
