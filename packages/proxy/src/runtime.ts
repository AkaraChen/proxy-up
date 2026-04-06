/* eslint-disable @typescript-eslint/no-this-alias */
import { Command, CommandExecutor, FileSystem, HttpClient, Path } from "@effect/platform";
import { Effect, Scope, Stream } from "effect";

import { ensureProxyArtifactsEffect } from "./assets.js";
import { DEFAULT_GATEWAY_HOST, DEFAULT_INTERNAL_HOST, DEFAULT_LOG_LEVEL } from "./constants.js";
import { generateGatewayConfigCore } from "./config-core.js";
import { runProxyEffect } from "./effect-runtime.js";
import { getDefaultTrustedCaPath } from "./runtime-defaults.js";
import {
  assertPortAvailableEffect,
  closeScopeQuietlyEffect,
  findAvailablePortEffect,
  asError,
  isManagedProcessRunningEffect,
} from "./utils.js";
import type {
  GeneratedProxyConfig,
  ProxyGatewayOptions,
  ProxyGatewayPaths,
  ResolvedProxyArtifacts,
} from "./types.js";

interface ManagedProcess {
  readonly process: CommandExecutor.Process;
  readonly scope: Scope.CloseableScope;
}

const wireProcessToLogEffect = (
  processName: string,
  managedProcess: CommandExecutor.Process,
  logPath: string,
  scope: Scope.CloseableScope,
) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    const forkLogDrain = (stream: Stream.Stream<Uint8Array, unknown>) =>
      Effect.forkScoped(
        Stream.run(stream, fileSystem.sink(logPath, { flag: "a" })).pipe(
          Effect.catchAll((error) =>
            Effect.logError(`Failed to drain log to ${logPath}: ${asError(error).message}`).pipe(
              Effect.asVoid,
            ),
          ),
        ),
      ).pipe(Scope.extend(scope));

    yield* forkLogDrain(managedProcess.stdout);
    yield* forkLogDrain(managedProcess.stderr);
    yield* Effect.forkScoped(
      Effect.exit(managedProcess.exitCode).pipe(
        Effect.flatMap(() =>
          fileSystem.writeFileString(logPath, `\n[${processName}] exited\n`, {
            flag: "a",
          }),
        ),
        Effect.catchAll((error) =>
          Effect.logError(`Failed to write exit log for ${processName}: ${asError(error).message}`),
        ),
      ),
    ).pipe(Scope.extend(scope));
  });

const startManagedProcessEffect = (args: {
  readonly command: Command.Command;
  readonly logPath: string;
  readonly processName: string;
}) =>
  Effect.gen(function* () {
    const scope = yield* Scope.make();

    const startProcess = Effect.gen(function* () {
      const process = yield* Command.start(args.command).pipe(
        Scope.extend(scope),
        Effect.mapError((error) => {
          const resolved = asError(error);
          return new Error(
            `${args.processName} failed to start: ${resolved.message}. See ${args.logPath}.`,
          );
        }),
      );

      yield* wireProcessToLogEffect(args.processName, process, args.logPath, scope);

      return {
        process,
        scope,
      } satisfies ManagedProcess;
    });

    return yield* startProcess.pipe(
      Effect.catchAll((error) =>
        closeScopeQuietlyEffect(scope).pipe(Effect.zipRight(Effect.fail(error))),
      ),
    );
  });

const stopManagedProcessEffect = (processName: string, managed?: ManagedProcess) => {
  if (!managed) {
    return Effect.void;
  }

  const terminateEffect = managed.process.kill("SIGTERM").pipe(
    Effect.timeoutTo({
      duration: "10 seconds",
      onSuccess: () => Effect.void,
      onTimeout: () =>
        managed.process.kill("SIGKILL").pipe(
          Effect.timeoutFail({
            duration: "2 seconds",
            onTimeout: () => new Error(`${processName} did not stop cleanly.`),
          }),
          Effect.asVoid,
        ),
    }),
    Effect.flatten,
  );

  return isManagedProcessRunningEffect(managed.process).pipe(
    Effect.flatMap((running) => (running ? terminateEffect : Effect.void)),
    Effect.catchAll((error) =>
      isManagedProcessRunningEffect(managed.process).pipe(
        Effect.flatMap((running) => (running ? Effect.fail(error) : Effect.void)),
      ),
    ),
    Effect.ensuring(closeScopeQuietlyEffect(managed.scope)),
  );
};

const waitUntilReadyEffect = (args: {
  readonly brightstaff?: ManagedProcess;
  readonly brightstaffLogPath: string;
  readonly envoy?: ManagedProcess;
  readonly envoyLogPath: string;
  readonly gatewayUrl: string;
  readonly workDir: string;
}) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const clock = yield* Effect.clock;
    const deadline = (yield* clock.currentTimeMillis) + 120_000;

    while (true) {
      const now = yield* clock.currentTimeMillis;

      if (now >= deadline) {
        return yield* Effect.fail(
          new Error(
            `Timed out waiting for the proxy gateway to become ready. See ${args.workDir}.`,
          ),
        );
      }

      if (!(yield* isManagedProcessRunningEffect(args.brightstaff?.process))) {
        return yield* Effect.fail(
          new Error(
            `brightstaff exited before the gateway became ready. See ${args.brightstaffLogPath}.`,
          ),
        );
      }

      if (!(yield* isManagedProcessRunningEffect(args.envoy?.process))) {
        return yield* Effect.fail(
          new Error(`Envoy exited before the gateway became ready. See ${args.envoyLogPath}.`),
        );
      }

      const ready = yield* client.get(`${args.gatewayUrl}/v1/models`).pipe(
        Effect.timeout("1 second"),
        Effect.map((response) => response.status >= 200 && response.status < 300),
        Effect.catchAll(() => Effect.succeed(false)),
      );

      if (ready) {
        return;
      }

      yield* Effect.sleep("250 millis");
    }
  });

const validatePortsEffect = (
  ports: {
    admin: number;
    brightstaff: number;
    gateway: number;
    internal: number;
  },
  gatewayHost: string,
) =>
  Effect.forEach(
    [
      assertPortAvailableEffect(ports.gateway, gatewayHost, "gateway listener"),
      assertPortAvailableEffect(ports.internal, DEFAULT_INTERNAL_HOST, "internal Envoy listener"),
      assertPortAvailableEffect(ports.admin, DEFAULT_INTERNAL_HOST, "Envoy admin listener"),
      assertPortAvailableEffect(ports.brightstaff, DEFAULT_INTERNAL_HOST, "brightstaff listener"),
    ],
    (effect) => effect,
    { discard: true },
  );

/**
 * ProxyGateway manages the lifecycle of a proxy gateway instance.
 *
 * Usage:
 * ```typescript
 * const gateway = new ProxyGateway(options);
 * await gateway.start();
 * // gateway is now running at gateway.gatewayUrl
 * await gateway.stop();
 * ```
 */
export class ProxyGateway {
  readonly #options: ProxyGatewayOptions;
  readonly #cleanupOnStop: boolean;

  #artifacts?: ResolvedProxyArtifacts;
  #brightstaff?: ManagedProcess;
  #envoy?: ManagedProcess;
  #generatedConfig?: GeneratedProxyConfig;
  #paths?: ProxyGatewayPaths;
  #running = false;

  constructor(options: ProxyGatewayOptions) {
    this.#options = options;
    this.#cleanupOnStop = options.cleanupOnStop ?? false;
  }

  /**
   * The URL where the gateway is accessible (e.g., "http://127.0.0.1:8080")
   * Only available after start() succeeds.
   */
  get gatewayUrl(): string {
    if (!this.#generatedConfig) {
      throw new Error("Gateway URL is not available until the gateway is started.");
    }
    return this.#generatedConfig.gatewayUrl;
  }

  /**
   * Whether the gateway is currently running.
   */
  get isRunning(): boolean {
    return this.#running;
  }

  /**
   * The resolved artifacts (binary paths, wasm paths, versions).
   * Only available after start() succeeds.
   */
  get artifacts(): ResolvedProxyArtifacts {
    if (!this.#artifacts) {
      throw new Error("Artifacts are not available until the gateway is started.");
    }
    return this.#artifacts;
  }

  /**
   * The generated configuration files and paths.
   * Only available after start() succeeds.
   */
  get paths(): ProxyGatewayPaths {
    if (!this.#paths) {
      throw new Error("Paths are not available until the gateway is started.");
    }
    return this.#paths;
  }

  readonly #startEffect = () => {
    const self = this;
    return Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      // Ensure artifacts are available
      const artifacts = yield* ensureProxyArtifactsEffect(self.#options.artifacts);

      // Generate config (includes all validation)
      const generatedConfig = generateGatewayConfigCore(self.#options, getDefaultTrustedCaPath());

      // Setup working directory
      const workDir =
        self.#options.workDir ??
        (yield* fileSystem.makeTempDirectory({ prefix: "proxy-up-gateway-" }));

      const logsDir = path.join(workDir, "logs");
      const planoConfigPath = path.join(workDir, "plano_config_rendered.yaml");
      const envoyConfigPath = path.join(workDir, "envoy.yaml");
      const brightstaffLogPath = path.join(logsDir, "brightstaff.log");
      const envoyLogPath = path.join(logsDir, "envoy.log");

      yield* fileSystem.makeDirectory(logsDir, { recursive: true });
      yield* fileSystem.writeFileString(planoConfigPath, generatedConfig.planoConfig, {
        flag: "w",
      });
      yield* fileSystem.writeFileString(envoyConfigPath, generatedConfig.envoyConfig, {
        flag: "w",
      });

      // Store resolved data
      self.#artifacts = artifacts;
      self.#generatedConfig = generatedConfig;
      self.#paths = {
        brightstaffLogPath,
        envoyConfigPath,
        envoyLogPath,
        logsDir,
        planoConfigPath,
        workDir,
      };

      // Validate ports are available
      yield* validatePortsEffect(
        generatedConfig.ports,
        self.#options.gatewayHost ?? DEFAULT_GATEWAY_HOST,
      );

      // Start brightstaff
      const brightstaff = yield* startManagedProcessEffect({
        command: Command.make(artifacts.brightstaffPath).pipe(
          Command.env({
            BIND_ADDRESS: `${DEFAULT_INTERNAL_HOST}:${generatedConfig.ports.brightstaff}`,
            LLM_PROVIDER_ENDPOINT: generatedConfig.internalUrl,
            PLANO_CONFIG_PATH_RENDERED: planoConfigPath,
            RUST_LOG: self.#options.logLevel ?? DEFAULT_LOG_LEVEL,
          }),
        ),
        logPath: brightstaffLogPath,
        processName: "brightstaff",
      });
      self.#brightstaff = brightstaff;

      // Start envoy
      const envoy = yield* startManagedProcessEffect({
        command: Command.make(
          artifacts.envoyPath,
          "-c",
          envoyConfigPath,
          "--component-log-level",
          `wasm:${self.#options.logLevel ?? DEFAULT_LOG_LEVEL}`,
          "--log-format",
          "[%Y-%m-%d %T.%e][%l] %v",
        ),
        logPath: envoyLogPath,
        processName: "Envoy",
      });
      self.#envoy = envoy;

      // Wait until ready
      yield* waitUntilReadyEffect({
        brightstaff,
        brightstaffLogPath,
        envoy,
        envoyLogPath,
        gatewayUrl: generatedConfig.gatewayUrl,
        workDir,
      });

      self.#running = true;
    });
  };

  readonly #stopEffect = (cleanup: boolean) => {
    const self = this;
    return Effect.gen(function* () {
      const errors: Error[] = [];
      const recordErrorEffect = (error: unknown) =>
        Effect.sync(() => {
          errors.push(asError(error));
        });
      const cleanupEffect = cleanup
        ? FileSystem.FileSystem.pipe(
            Effect.flatMap((fileSystem) =>
              fileSystem.remove(self.#paths?.workDir ?? "", {
                force: true,
                recursive: true,
              }),
            ),
          )
        : Effect.void;

      yield* stopManagedProcessEffect("envoy", self.#envoy).pipe(
        Effect.catchAll(recordErrorEffect),
      );
      yield* stopManagedProcessEffect("brightstaff", self.#brightstaff).pipe(
        Effect.catchAll(recordErrorEffect),
      );
      yield* cleanupEffect;

      if (errors.length > 0) {
        yield* Effect.fail(errors[0]!);
      }
    });
  };

  /**
   * Start the proxy gateway.
   *
   * This will:
   * 1. Validate all configuration (providers, ports, model aliases)
   * 2. Download necessary artifacts (envoy, brightstaff, wasm) if not provided
   * 3. Generate configuration files
   * 4. Start the envoy and brightstaff processes
   * 5. Wait until the gateway is ready to accept requests
   *
   * If already running, returns immediately.
   *
   * @throws Error if validation fails, artifacts can't be downloaded, or processes fail to start
   */
  async start(): Promise<this> {
    if (this.#running) {
      return this;
    }

    try {
      await runProxyEffect(this.#startEffect());
      return this;
    } catch (error) {
      await this.stop(false).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Stop the proxy gateway.
   *
   * @param cleanup - Whether to remove the working directory (defaults to cleanupOnStop option)
   */
  async stop(cleanup = this.#cleanupOnStop): Promise<void> {
    try {
      if (this.#running) {
        await runProxyEffect(this.#stopEffect(cleanup));
      }
    } finally {
      this.#brightstaff = undefined;
      this.#envoy = undefined;
      this.#running = false;
    }
  }
}

/**
 * Find an available port on the given host.
 * Useful for dynamically allocating ports before creating a ProxyGateway.
 */
export async function findAvailablePort(host = DEFAULT_INTERNAL_HOST): Promise<number> {
  return runProxyEffect(findAvailablePortEffect(host));
}

/**
 * Convenience function to create and start a ProxyGateway in one step.
 *
 * Equivalent to:
 * ```typescript
 * const gateway = new ProxyGateway(options);
 * await gateway.start();
 * ```
 */
export async function startProxyGateway(options: ProxyGatewayOptions): Promise<ProxyGateway> {
  const gateway = new ProxyGateway(options);
  await gateway.start();
  return gateway;
}
