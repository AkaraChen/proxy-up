import { startProxyGateway, ProxyGateway, type ProxyGatewayOptions } from "@proxy-up/proxy";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProxyConfig, ProxyStatus } from "./config-manager.js";
import { loadCurrentStatus, saveCurrentStatus } from "./config-manager.js";

let currentGateway: ProxyGateway | null = null;

export async function startProxyService(config: ProxyConfig): Promise<ProxyGateway> {
  if (currentGateway && currentGateway.isRunning) {
    return currentGateway;
  }

  const workDir = config.workDir ?? join(homedir(), ".cache", "proxy-up", "gateway");

  const gatewayOptions: ProxyGatewayOptions = {
    artifacts: config.artifacts,
    cleanupOnStop: config.cleanupOnStop ?? true,
    gatewayHost: config.gatewayHost,
    logLevel: config.logLevel ?? "info",
    modelAliases: config.modelAliases,
    ports: config.ports,
    providers: config.providers,
    workDir,
  };

  currentGateway = await startProxyGateway(gatewayOptions);

  await saveCurrentStatus({
    running: true,
    gatewayUrl: currentGateway.gatewayUrl,
    workDir: currentGateway.paths.workDir,
  });

  return currentGateway;
}

export async function stopProxyService(cleanup: boolean = true): Promise<void> {
  if (!currentGateway) {
    await saveCurrentStatus({ running: false });
    return;
  }

  await currentGateway.stop(cleanup);
  currentGateway = null;

  await saveCurrentStatus({ running: false });
}

export async function restartProxyService(config: ProxyConfig): Promise<ProxyGateway> {
  await stopProxyService(false);
  return await startProxyService(config);
}

export async function getProxyServiceStatus(): Promise<ProxyStatus> {
  const status = await loadCurrentStatus();

  if (!status.running || !currentGateway) {
    return { running: false };
  }

  return {
    running: currentGateway.isRunning,
    gatewayUrl: currentGateway.gatewayUrl,
    workDir: currentGateway.paths.workDir,
  };
}

export async function updateGatewayConfig(config: ProxyConfig): Promise<void> {
  if (!currentGateway || !currentGateway.isRunning) {
    return;
  }

  // 需要重启才能更新配置
  await restartProxyService(config);
}
