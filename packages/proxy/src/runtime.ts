import { Command, CommandExecutor, FileSystem, HttpClient, Path } from "@effect/platform";
import { Effect, Scope, Stream } from "effect";

import { ensureProxyArtifactsEffect } from "./assets.js";
import { DEFAULT_GATEWAY_HOST, DEFAULT_INTERNAL_HOST, DEFAULT_LOG_LEVEL } from "./constants.js";
import { generateGatewayConfig } from "./config.js";
import { runProxyEffect } from "./effect-runtime.js";
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

const createProxyGatewayEffect = (options: ProxyGatewayOptions) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const artifacts = yield* ensureProxyArtifactsEffect(options.artifacts);
    const generatedConfig = generateGatewayConfig({
      ...options,
      artifacts: {
        ...options.artifacts,
        llmGatewayWasmPath: artifacts.llmGatewayWasmPath,
      },
    });

    const workDir =
      options.workDir ??
      (yield* fileSystem.makeTempDirectory({
        prefix: "proxy-up-gateway-",
      }));
    const logsDir = path.join(workDir, "logs");
    const planoConfigPath = path.join(workDir, "plano_config_rendered.yaml");
    const envoyConfigPath = path.join(workDir, "envoy.yaml");
    const brightstaffLogPath = path.join(logsDir, "brightstaff.log");
    const envoyLogPath = path.join(logsDir, "envoy.log");

    yield* fileSystem.makeDirectory(logsDir, {
      recursive: true,
    });
    yield* fileSystem.writeFileString(planoConfigPath, generatedConfig.planoConfig, {
      flag: "w",
    });
    yield* fileSystem.writeFileString(envoyConfigPath, generatedConfig.envoyConfig, {
      flag: "w",
    });

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
  });

export async function findAvailablePort(host = DEFAULT_INTERNAL_HOST) {
  return runProxyEffect(findAvailablePortEffect(host));
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

  #startEffect() {
    return Effect.forEach(
      [
        assertPortAvailableEffect(
          this.generatedConfig.ports.gateway,
          this.#gatewayHost,
          "gateway listener",
        ),
        assertPortAvailableEffect(
          this.generatedConfig.ports.internal,
          DEFAULT_INTERNAL_HOST,
          "internal Envoy listener",
        ),
        assertPortAvailableEffect(
          this.generatedConfig.ports.admin,
          DEFAULT_INTERNAL_HOST,
          "Envoy admin listener",
        ),
        assertPortAvailableEffect(
          this.generatedConfig.ports.brightstaff,
          DEFAULT_INTERNAL_HOST,
          "brightstaff listener",
        ),
      ],
      (effect) => effect,
      {
        discard: true,
      },
    ).pipe(
      Effect.flatMap(() =>
        startManagedProcessEffect({
          command: Command.make(this.artifacts.brightstaffPath).pipe(
            Command.env({
              BIND_ADDRESS: `${DEFAULT_INTERNAL_HOST}:${this.generatedConfig.ports.brightstaff}`,
              LLM_PROVIDER_ENDPOINT: this.generatedConfig.internalUrl,
              PLANO_CONFIG_PATH_RENDERED: this.paths.planoConfigPath,
              RUST_LOG: this.#logLevel,
            }),
          ),
          logPath: this.paths.brightstaffLogPath,
          processName: "brightstaff",
        }).pipe(
          Effect.tap((brightstaff) =>
            Effect.sync(() => {
              this.#brightstaff = brightstaff;
            }),
          ),
        ),
      ),
      Effect.flatMap((brightstaff) =>
        startManagedProcessEffect({
          command: Command.make(
            this.artifacts.envoyPath,
            "-c",
            this.paths.envoyConfigPath,
            "--component-log-level",
            `wasm:${this.#logLevel}`,
            "--log-format",
            "[%Y-%m-%d %T.%e][%l] %v",
          ),
          logPath: this.paths.envoyLogPath,
          processName: "Envoy",
        }).pipe(
          Effect.tap((envoy) =>
            Effect.sync(() => {
              this.#envoy = envoy;
            }),
          ),
          Effect.flatMap((envoy) =>
            waitUntilReadyEffect({
              brightstaff,
              brightstaffLogPath: this.paths.brightstaffLogPath,
              envoy,
              envoyLogPath: this.paths.envoyLogPath,
              gatewayUrl: this.gatewayUrl,
              workDir: this.paths.workDir,
            }),
          ),
        ),
      ),
    );
  }

  #stopEffect(cleanup: boolean) {
    const errors: Error[] = [];
    const recordErrorEffect = (error: unknown) =>
      Effect.sync(() => {
        errors.push(asError(error));
      });
    const cleanupEffect = cleanup
      ? FileSystem.FileSystem.pipe(
          Effect.flatMap((fileSystem) =>
            fileSystem.remove(this.paths.workDir, {
              force: true,
              recursive: true,
            }),
          ),
        )
      : Effect.void;

    return stopManagedProcessEffect("envoy", this.#envoy).pipe(
      Effect.catchAll(recordErrorEffect),
      Effect.zipRight(
        stopManagedProcessEffect("brightstaff", this.#brightstaff).pipe(
          Effect.catchAll(recordErrorEffect),
        ),
      ),
      Effect.zipRight(cleanupEffect),
      Effect.flatMap(() => (errors.length > 0 ? Effect.fail(errors[0]!) : Effect.void)),
    );
  }

  async start() {
    if (this.#running) {
      return this;
    }

    try {
      await runProxyEffect(this.#startEffect());
      this.#running = true;
      return this;
    } catch (error) {
      await this.stop(false).catch(() => undefined);
      throw error;
    }
  }

  async stop(cleanup = this.#cleanupOnStop) {
    try {
      await runProxyEffect(this.#stopEffect(cleanup));
    } finally {
      this.#brightstaff = undefined;
      this.#envoy = undefined;
      this.#running = false;
    }
  }
}

export async function createProxyGateway(options: ProxyGatewayOptions) {
  return runProxyEffect(createProxyGatewayEffect(options));
}

export async function startProxyGateway(options: ProxyGatewayOptions) {
  const gateway = await createProxyGateway(options);
  await gateway.start();
  return gateway;
}
