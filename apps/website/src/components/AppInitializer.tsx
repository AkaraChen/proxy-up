import { useEffect, type ReactNode } from "react";
import { useInitConfig, useInitStatus } from "../api/hooks";

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const initConfig = useInitConfig();
  const initStatus = useInitStatus();

  useEffect(() => {
    // Only run once on mount
    initConfig.mutate();
    initStatus.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
