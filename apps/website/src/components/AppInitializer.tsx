import { use } from "react";
import type { ReactNode } from "react";
import { useInitConfig, useInitStatus } from "../api/hooks";

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const initConfig = useInitConfig();
  const initStatus = useInitStatus();

  // Use React's `use()` to await mutations - elegant pattern
  use(initConfig.mutateAsync());
  use(initStatus.mutateAsync());

  return <>{children}</>;
}
