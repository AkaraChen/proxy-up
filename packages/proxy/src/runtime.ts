import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { DEFAULT_GATEWAY_HOST, DEFAULT_INTERNAL_HOST, DEFAULT_LOG_LEVEL } from "./constants.js";
import { ensureProxyArtifacts } from "./assets.js";
import { generateGatewayConfig } from "./config.js";
import type {
  GeneratedProxyConfig,
  ProxyGatewayOptions,
  ProxyGatewayPaths,
  ResolvedProxyArtifacts,
} from "./types.js";

interface ManagedProcess {
  child: ReturnType<typeof spawn>;
  error?: Error;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function assertPortAvailable(port: number, host: string, label: string) {
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (error) => {
      reject(
        new Error(
          `Port ${port} for ${label} is not available on ${host}: ${(error as Error).message}`,
        ),
      );
    });
    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve();
      });
    });
    server.listen(port, host);
  });
}

function wireProcessToLog(processName: string, child: ReturnType<typeof spawn>, logPath: string) {
  const stream = createWriteStream(logPath, {
    flags: "a",
  });

  child.stdout?.pipe(stream);
  child.stderr?.pipe(stream);
  child.once("close", () => {
    stream.end(`\n[${processName}] exited\n`);
  });
}

async function stopChildProcess(processName: string, child?: ReturnType<typeof spawn>) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      return;
    }
    await delay(100);
  }

  child.kill("SIGKILL");
  await delay(100);

  if (child.exitCode === null && child.signalCode === null) {
    throw new Error(`${processName} did not stop cleanly.`);
  }
}

export async function findAvailablePort(host = DEFAULT_INTERNAL_HOST) {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => {
          reject(new Error("Failed to resolve an available port."));
        });
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
    server.listen(0, host);
  });
}

export class ProxyGateway {
  readonly artifacts: ResolvedProxyArtifacts;
  readonly generatedConfig: GeneratedProxyConfig;
  readonly paths: ProxyGatewayPaths;

  #brightstaff?: ManagedProcess;
  #cleanupOnStop: boolean;
  #envoy?: ManagedProcess;
  #gatewayHost: string;
  #logLevel: string;
  #running = false;

  constructor(args: {
    artifacts: ResolvedProxyArtifacts;
    cleanupOnStop: boolean;
    generatedConfig: GeneratedProxyConfig;
    gatewayHost: string;
    logLevel: string;
    paths: ProxyGatewayPaths;
  }) {
    this.artifacts = args.artifacts;
    this.generatedConfig = args.generatedConfig;
    this.paths = args.paths;
    this.#cleanupOnStop = args.cleanupOnStop;
    this.#gatewayHost = args.gatewayHost;
    this.#logLevel = args.logLevel;
  }

  get gatewayUrl() {
    return this.generatedConfig.gatewayUrl;
  }

  get isRunning() {
    return this.#running;
  }

  async start() {
    if (this.#running) {
      return this;
    }

    await assertPortAvailable(
      this.generatedConfig.ports.gateway,
      this.#gatewayHost,
      "gateway listener",
    );
    await assertPortAvailable(
      this.generatedConfig.ports.internal,
      DEFAULT_INTERNAL_HOST,
      "internal Envoy listener",
    );
    await assertPortAvailable(
      this.generatedConfig.ports.admin,
      DEFAULT_INTERNAL_HOST,
      "Envoy admin listener",
    );
    await assertPortAvailable(
      this.generatedConfig.ports.brightstaff,
      DEFAULT_INTERNAL_HOST,
      "brightstaff listener",
    );

    const brightstaff = spawn(this.artifacts.brightstaffPath, [], {
      env: {
        ...process.env,
        BIND_ADDRESS: `${DEFAULT_INTERNAL_HOST}:${this.generatedConfig.ports.brightstaff}`,
        LLM_PROVIDER_ENDPOINT: this.generatedConfig.internalUrl,
        PLANO_CONFIG_PATH_RENDERED: this.paths.planoConfigPath,
        RUST_LOG: this.#logLevel,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const brightstaffProcess: ManagedProcess = {
      child: brightstaff,
    };
    brightstaff.once("error", (error) => {
      brightstaffProcess.error = error;
    });
    wireProcessToLog("brightstaff", brightstaff, this.paths.brightstaffLogPath);
    this.#brightstaff = brightstaffProcess;

    const envoy = spawn(
      this.artifacts.envoyPath,
      [
        "-c",
        this.paths.envoyConfigPath,
        "--component-log-level",
        `wasm:${this.#logLevel}`,
        "--log-format",
        "[%Y-%m-%d %T.%e][%l] %v",
      ],
      {
        env: {
          ...process.env,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const envoyProcess: ManagedProcess = {
      child: envoy,
    };
    envoy.once("error", (error) => {
      envoyProcess.error = error;
    });
    wireProcessToLog("envoy", envoy, this.paths.envoyLogPath);
    this.#envoy = envoyProcess;

    try {
      await this.#waitUntilReady();
      this.#running = true;
      return this;
    } catch (error) {
      await this.stop(false);
      throw error;
    }
  }

  async stop(cleanup = this.#cleanupOnStop) {
    await stopChildProcess("envoy", this.#envoy?.child);
    await stopChildProcess("brightstaff", this.#brightstaff?.child);
    this.#running = false;

    if (cleanup) {
      await rm(this.paths.workDir, {
        force: true,
        recursive: true,
      });
    }
  }

  async #waitUntilReady() {
    const deadline = Date.now() + 120_000;

    while (Date.now() < deadline) {
      if (this.#brightstaff?.error) {
        throw new Error(
          `brightstaff failed to start: ${this.#brightstaff.error.message}. See ${this.paths.brightstaffLogPath}.`,
        );
      }
      if (this.#envoy?.error) {
        throw new Error(
          `Envoy failed to start: ${this.#envoy.error.message}. See ${this.paths.envoyLogPath}.`,
        );
      }

      if (
        this.#brightstaff?.child.exitCode !== null ||
        this.#brightstaff?.child.signalCode !== null
      ) {
        throw new Error(
          `brightstaff exited before the gateway became ready. See ${this.paths.brightstaffLogPath}.`,
        );
      }
      if (this.#envoy?.child.exitCode !== null || this.#envoy?.child.signalCode !== null) {
        throw new Error(
          `Envoy exited before the gateway became ready. See ${this.paths.envoyLogPath}.`,
        );
      }

      try {
        const response = await fetch(`${this.gatewayUrl}/v1/models`);
        if (response.ok) {
          return;
        }
      } catch {
        // Keep polling until the deadline or process exit.
      }

      await delay(250);
    }

    throw new Error(
      `Timed out waiting for the proxy gateway to become ready. See ${this.paths.workDir}.`,
    );
  }
}

export async function createProxyGateway(options: ProxyGatewayOptions) {
  const artifacts = await ensureProxyArtifacts(options.artifacts);
  const generatedConfig = generateGatewayConfig({
    ...options,
    artifacts: {
      ...options.artifacts,
      llmGatewayWasmPath: artifacts.llmGatewayWasmPath,
    },
  });

  const workDir = options.workDir ?? (await mkdtemp(path.join(os.tmpdir(), "proxy-up-gateway-")));
  const logsDir = path.join(workDir, "logs");
  const planoConfigPath = path.join(workDir, "plano_config_rendered.yaml");
  const envoyConfigPath = path.join(workDir, "envoy.yaml");
  const brightstaffLogPath = path.join(logsDir, "brightstaff.log");
  const envoyLogPath = path.join(logsDir, "envoy.log");

  await mkdir(logsDir, {
    recursive: true,
  });
  await writeFile(planoConfigPath, generatedConfig.planoConfig, "utf8");
  await writeFile(envoyConfigPath, generatedConfig.envoyConfig, "utf8");

  return new ProxyGateway({
    artifacts,
    cleanupOnStop: options.cleanupOnStop ?? false,
    generatedConfig,
    gatewayHost: options.gatewayHost ?? DEFAULT_GATEWAY_HOST,
    logLevel: options.logLevel ?? DEFAULT_LOG_LEVEL,
    paths: {
      brightstaffLogPath,
      envoyConfigPath,
      envoyLogPath,
      logsDir,
      planoConfigPath,
      workDir,
    },
  });
}

export async function startProxyGateway(options: ProxyGatewayOptions) {
  const gateway = await createProxyGateway(options);
  await gateway.start();
  return gateway;
}
