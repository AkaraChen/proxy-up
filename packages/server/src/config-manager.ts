import { homedir } from "node:os";
import { join } from "node:path";
import { promises as fs } from "node:fs";
import type {
  ProxyArtifactOptions,
  ProxyModelAliases,
  ProxyPorts,
  ProxyProviderOptions,
} from "@proxy-up/proxy";

export interface ProxyConfig {
  artifacts?: ProxyArtifactOptions;
  cleanupOnStop?: boolean;
  gatewayHost?: string;
  logLevel?: "trace" | "debug" | "info" | "warn" | "error";
  modelAliases?: ProxyModelAliases;
  ports?: ProxyPorts;
  providers: ProxyProviderOptions[];
  workDir?: string;
}

export interface ProxyStatus {
  running: boolean;
  gatewayUrl?: string;
  workDir?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "proxy-up");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const STATUS_FILE = join(CONFIG_DIR, "status.json");

async function ensureConfigDir(): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

export async function saveCurrentConfig(config: ProxyConfig): Promise<string> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  return CONFIG_FILE;
}

export async function loadCurrentConfig(): Promise<ProxyConfig | null> {
  try {
    const content = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as ProxyConfig;
  } catch {
    return null;
  }
}

export async function saveCurrentStatus(status: ProxyStatus): Promise<string> {
  await ensureConfigDir();
  await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2), "utf-8");
  return STATUS_FILE;
}

export async function loadCurrentStatus(): Promise<ProxyStatus> {
  try {
    const content = await fs.readFile(STATUS_FILE, "utf-8");
    return JSON.parse(content) as ProxyStatus;
  } catch {
    return { running: false };
  }
}
