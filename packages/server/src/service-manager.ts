import { ProxyGateway, type ProxyGatewayOptions } from "@proxy-up/proxy";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ProxyConfig, ProxyStatus } from "./config-manager.js";
import { loadCurrentStatus, saveCurrentStatus } from "./config-manager.js";

/**
 * GatewayManager provides a class-based singleton for managing the proxy gateway.
 * This avoids the pitfalls of module-level mutable state:
 * - Proper encapsulation and controlled access
 * - Clear ownership of the gateway instance
 * - Easier to reason about state transitions
 */
class GatewayManager {
  #currentGateway: ProxyGateway | null = null;

  getGateway(): ProxyGateway | null {
    return this.#currentGateway;
  }

  setGateway(gateway: ProxyGateway | null): void {
    this.#currentGateway = gateway;
  }

  isRunning(): boolean {
    return this.#currentGateway?.isRunning ?? false;
  }
}

const gatewayManager = new GatewayManager();

export async function startProxyService(config: ProxyConfig): Promise<ProxyGateway> {
  const existingGateway = gatewayManager.getGateway();
  if (existingGateway && existingGateway.isRunning) {
    return existingGateway;
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

  const gateway = new ProxyGateway(gatewayOptions);
  await gateway.start();
  gatewayManager.setGateway(gateway);

  await saveCurrentStatus({
    running: true,
    gatewayUrl: gateway.gatewayUrl,
    workDir: gateway.paths.workDir,
  });

  return gateway;
}

export async function stopProxyService(cleanup: boolean = true): Promise<void> {
  const gateway = gatewayManager.getGateway();
  if (!gateway) {
    await saveCurrentStatus({ running: false });
    return;
  }

  await gateway.stop(cleanup);
  gatewayManager.setGateway(null);

  await saveCurrentStatus({ running: false });
}

export async function restartProxyService(config: ProxyConfig): Promise<ProxyGateway> {
  await stopProxyService(false);
  return await startProxyService(config);
}

export async function getProxyServiceStatus(): Promise<ProxyStatus> {
  const status = await loadCurrentStatus();
  const gateway = gatewayManager.getGateway();

  if (!status.running || !gateway) {
    return { running: false };
  }

  return {
    running: gateway.isRunning,
    gatewayUrl: gateway.gatewayUrl,
    workDir: gateway.paths.workDir,
  };
}

export async function updateGatewayConfig(config: ProxyConfig): Promise<void> {
  const gateway = gatewayManager.getGateway();
  if (!gateway || !gateway.isRunning) {
    return;
  }

  // 需要重启才能更新配置
  await restartProxyService(config);
}
