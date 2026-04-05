import { Command, CommandExecutor, FileSystem, HttpClient, Path } from "@effect/platform";
import { Effect, Stream } from "effect";

import {
  DEFAULT_ENVOY_RELEASE_BASE_URL,
  DEFAULT_ENVOY_VERSION,
  DEFAULT_PLANO_RELEASE_BASE_URL,
  DEFAULT_PLANO_VERSION,
} from "./constants.js";
import { runProxyEffect } from "./effect-runtime.js";
import { ProxyRuntimeInfo } from "./runtime-info.js";
import { DEFAULT_CACHE_DIR } from "./runtime-defaults.js";
import type { ProxyArtifactOptions, ResolvedProxyArtifacts } from "./types.js";

const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const cleanupPathsEffect = (paths: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    yield* Effect.forEach(
      paths,
      (pathname) =>
        fileSystem
          .remove(pathname, {
            force: true,
            recursive: true,
          })
          .pipe(Effect.catchAll(() => Effect.void)),
      {
        discard: true,
      },
    );
  });

const ensureExistsEffect = (pathname: string, label: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;

    if (!(yield* fileSystem.exists(pathname))) {
      return yield* Effect.fail(new Error(`${label} was not found at ${pathname}.`));
    }
  });

const resolvePlatformSlugEffect = Effect.gen(function* () {
  const runtimeInfo = yield* ProxyRuntimeInfo;

  if (runtimeInfo.platform === "linux" && runtimeInfo.arch === "x64") {
    return "linux-amd64";
  }
  if (runtimeInfo.platform === "linux" && runtimeInfo.arch === "arm64") {
    return "linux-arm64";
  }
  if (runtimeInfo.platform === "darwin" && runtimeInfo.arch === "arm64") {
    return "darwin-arm64";
  }
  if (runtimeInfo.platform === "darwin" && runtimeInfo.arch === "x64") {
    return yield* Effect.fail(
      new Error(
        "macOS x64 is not supported by Plano's published native binaries. Use Apple Silicon or Linux.",
      ),
    );
  }

  return yield* Effect.fail(
    new Error(
      `Unsupported platform ${runtimeInfo.platform}/${runtimeInfo.arch}. Supported platforms are linux/x64, linux/arm64, and darwin/arm64.`,
    ),
  );
});

const downloadToFileEffect = (url: string, destination: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const response = yield* client.get(url);

    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.fail(new Error(`Failed to download ${url}: ${response.status}`));
    }

    yield* fileSystem.makeDirectory(path.dirname(destination), {
      recursive: true,
    });
    yield* Stream.run(response.stream, fileSystem.sink(destination, { flag: "w" }));
  }).pipe(
    Effect.catchAll((error) => {
      if (error instanceof Error && error.message.startsWith(`Failed to download ${url}:`)) {
        return Effect.fail(error);
      }

      return Effect.fail(new Error(`Failed to download ${url}: ${asError(error).message}`));
    }),
  );

const ensureExitCodeZero = (command: Command.Command, description: string) =>
  Command.exitCode(command).pipe(
    Effect.flatMap((exitCode) =>
      Number(exitCode) === 0
        ? Effect.void
        : Effect.fail(new Error(`${description} failed with code ${Number(exitCode)}.`)),
    ),
    Effect.catchAll((error) =>
      Effect.fail(
        error instanceof Error ? error : new Error(`${description} failed: ${String(error)}`),
      ),
    ),
  );

const gunzipArchiveEffect = (archivePath: string, destination: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const process = yield* Command.start(Command.make("gzip", "-dc", archivePath));

      yield* Stream.run(process.stdout, fileSystem.sink(destination, { flag: "w" }));

      const exitCode = yield* process.exitCode;
      if (Number(exitCode) !== 0) {
        return yield* Effect.fail(
          new Error(`Failed to extract ${archivePath} failed with code ${Number(exitCode)}.`),
        );
      }
    }),
  );

const findFileEffect = (root: string, matcher: (candidate: string) => boolean) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const entries = yield* fileSystem.readDirectory(root, {
      recursive: true,
    });

    for (const entry of entries) {
      const candidate = path.isAbsolute(entry) ? entry : path.join(root, entry);
      const info = yield* fileSystem
        .stat(candidate)
        .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

      if (info?.type === "File" && matcher(candidate)) {
        return candidate;
      }
    }

    return undefined;
  });

const ensureDownloadedGzipEffect = (url: string, destination: string, executable = false) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    if (yield* fileSystem.exists(destination)) {
      return destination;
    }

    const tempArchive = `${destination}.download`;
    const tempOutput = `${destination}.tmp`;

    const writeArtifact = Effect.gen(function* () {
      yield* downloadToFileEffect(url, tempArchive);
      yield* gunzipArchiveEffect(tempArchive, tempOutput);
      if (executable) {
        yield* fileSystem.chmod(tempOutput, 0o755);
      }
      yield* fileSystem.makeDirectory(path.dirname(destination), {
        recursive: true,
      });
      yield* fileSystem.copyFile(tempOutput, destination);
      if (executable) {
        yield* fileSystem.chmod(destination, 0o755);
      }
      return destination;
    });

    return yield* writeArtifact.pipe(
      Effect.ensuring(cleanupPathsEffect([tempArchive, tempOutput])),
    );
  });

const ensureDownloadedEnvoyEffect = (url: string, destination: string) =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      if (yield* fileSystem.exists(destination)) {
        return destination;
      }

      const tempDir = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "proxy-up-envoy-",
      });
      const archivePath = path.join(tempDir, "envoy.tar.xz");
      const extractedPath = path.join(tempDir, "extract");

      yield* fileSystem.makeDirectory(extractedPath, {
        recursive: true,
      });
      yield* downloadToFileEffect(url, archivePath);
      yield* ensureExitCodeZero(
        Command.make("tar", "-xf", archivePath, "-C", extractedPath),
        `Failed to extract ${archivePath}`,
      );

      const envoyBinary = yield* findFileEffect(extractedPath, (candidate) => {
        const normalized = path.normalize(candidate);
        return (
          path.basename(normalized) === "envoy" && normalized.includes(`${path.sep}bin${path.sep}`)
        );
      });

      if (!envoyBinary) {
        return yield* Effect.fail(
          new Error(`Unable to find envoy binary after extracting ${url}.`),
        );
      }

      yield* fileSystem.makeDirectory(path.dirname(destination), {
        recursive: true,
      });
      yield* fileSystem.copyFile(envoyBinary, destination);
      yield* fileSystem.chmod(destination, 0o755);

      return destination;
    }),
  );

export const ensureProxyArtifactsEffect = (
  options: ProxyArtifactOptions = {},
): Effect.Effect<
  ResolvedProxyArtifacts,
  Error,
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | Path.Path
  | ProxyRuntimeInfo
> =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const planoVersion = options.planoVersion ?? DEFAULT_PLANO_VERSION;
    const envoyVersion = options.envoyVersion ?? DEFAULT_ENVOY_VERSION;

    if (options.brightstaffPath && options.envoyPath && options.llmGatewayWasmPath) {
      yield* ensureExistsEffect(options.brightstaffPath, "brightstaff binary");
      yield* ensureExistsEffect(options.envoyPath, "Envoy binary");
      yield* ensureExistsEffect(options.llmGatewayWasmPath, "llm_gateway.wasm");

      return {
        brightstaffPath: options.brightstaffPath,
        envoyPath: options.envoyPath,
        envoyVersion,
        llmGatewayWasmPath: options.llmGatewayWasmPath,
        planoVersion,
      };
    }

    const platformSlug = yield* resolvePlatformSlugEffect;
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    const planoDir = path.join(cacheDir, "plano", planoVersion, platformSlug);
    const envoyDir = path.join(cacheDir, "envoy", envoyVersion, platformSlug);

    const brightstaffPath = options.brightstaffPath ?? path.join(planoDir, "brightstaff");
    const llmGatewayWasmPath =
      options.llmGatewayWasmPath ?? path.join(planoDir, "llm_gateway.wasm");
    const envoyPath = options.envoyPath ?? path.join(envoyDir, "envoy");

    const planoReleaseBaseUrl = options.planoReleaseBaseUrl ?? DEFAULT_PLANO_RELEASE_BASE_URL;
    const envoyReleaseBaseUrl = options.envoyReleaseBaseUrl ?? DEFAULT_ENVOY_RELEASE_BASE_URL;

    yield* ensureDownloadedGzipEffect(
      `${planoReleaseBaseUrl}/${planoVersion}/brightstaff-${platformSlug}.gz`,
      brightstaffPath,
      true,
    );
    yield* ensureDownloadedGzipEffect(
      `${planoReleaseBaseUrl}/${planoVersion}/llm_gateway.wasm.gz`,
      llmGatewayWasmPath,
    );
    yield* ensureDownloadedEnvoyEffect(
      `${envoyReleaseBaseUrl}/${envoyVersion}/envoy-${envoyVersion}-${platformSlug}.tar.xz`,
      envoyPath,
    );

    return {
      brightstaffPath,
      envoyPath,
      envoyVersion,
      llmGatewayWasmPath,
      planoVersion,
    };
  }).pipe(Effect.mapError(asError));

export async function ensureProxyArtifacts(
  options: ProxyArtifactOptions = {},
): Promise<ResolvedProxyArtifacts> {
  return runProxyEffect(ensureProxyArtifactsEffect(options));
}
