import { createReadStream, createWriteStream } from "node:fs";
import { access, chmod, copyFile, mkdir, mkdtemp, rm, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { spawn } from "node:child_process";

import {
  DEFAULT_ENVOY_RELEASE_BASE_URL,
  DEFAULT_ENVOY_VERSION,
  DEFAULT_PLANO_RELEASE_BASE_URL,
  DEFAULT_PLANO_VERSION,
} from "./constants.js";
import { DEFAULT_CACHE_DIR } from "./runtime-defaults.js";
import type { ProxyArtifactOptions, ResolvedProxyArtifacts } from "./types.js";

async function ensureExists(pathname: string, label: string) {
  try {
    await stat(pathname);
  } catch {
    throw new Error(`${label} was not found at ${pathname}.`);
  }
}

function resolvePlatformSlug() {
  if (process.platform === "linux" && process.arch === "x64") {
    return "linux-amd64";
  }
  if (process.platform === "linux" && process.arch === "arm64") {
    return "linux-arm64";
  }
  if (process.platform === "darwin" && process.arch === "arm64") {
    return "darwin-arm64";
  }
  if (process.platform === "darwin" && process.arch === "x64") {
    throw new Error(
      "macOS x64 is not supported by Plano's published native binaries. Use Apple Silicon or Linux.",
    );
  }

  throw new Error(
    `Unsupported platform ${process.platform}/${process.arch}. Supported platforms are linux/x64, linux/arm64, and darwin/arm64.`,
  );
}

async function pathExists(pathname: string) {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await mkdir(path.dirname(destination), {
    recursive: true,
  });

  const body = Readable.fromWeb(response.body as globalThis.ReadableStream<Uint8Array>);
  await pipeline(body, createWriteStream(destination));
}

async function gunzipArchive(archivePath: string, destination: string) {
  await pipeline(createReadStream(archivePath), createGunzip(), createWriteStream(destination));
}

async function runCommand(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code ${code ?? "null"} and signal ${signal ?? "null"}.`,
        ),
      );
    });
  });
}

async function findFile(root: string, matcher: (candidate: string) => boolean) {
  const entries = await (
    await import("node:fs/promises")
  ).readdir(root, {
    recursive: true,
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const candidate = path.join(entry.parentPath, entry.name);
    if (matcher(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function ensureDownloadedGzip(url: string, destination: string, executable = false) {
  if (await pathExists(destination)) {
    return destination;
  }

  const tempArchive = `${destination}.download`;
  const tempOutput = `${destination}.tmp`;

  try {
    await downloadToFile(url, tempArchive);
    await gunzipArchive(tempArchive, tempOutput);
    if (executable) {
      await chmod(tempOutput, 0o755);
    }
    await copyFile(tempOutput, destination);
    if (executable) {
      await chmod(destination, 0o755);
    }
    return destination;
  } finally {
    await Promise.allSettled([unlink(tempArchive), unlink(tempOutput)]);
  }
}

async function ensureDownloadedEnvoy(url: string, destination: string) {
  if (await pathExists(destination)) {
    return destination;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "proxy-up-envoy-"));
  const archivePath = path.join(tempDir, "envoy.tar.xz");
  const extractedPath = path.join(tempDir, "extract");

  try {
    await mkdir(extractedPath, {
      recursive: true,
    });
    await downloadToFile(url, archivePath);
    await runCommand("tar", ["-xf", archivePath, "-C", extractedPath]);

    const envoyBinary = await findFile(
      extractedPath,
      (candidate) =>
        path.basename(candidate) === "envoy" && candidate.includes(`${path.sep}bin${path.sep}`),
    );

    if (!envoyBinary) {
      throw new Error(`Unable to find envoy binary after extracting ${url}.`);
    }

    await mkdir(path.dirname(destination), {
      recursive: true,
    });
    await copyFile(envoyBinary, destination);
    await chmod(destination, 0o755);
    return destination;
  } finally {
    await rm(tempDir, {
      force: true,
      recursive: true,
    });
  }
}

export async function ensureProxyArtifacts(
  options: ProxyArtifactOptions = {},
): Promise<ResolvedProxyArtifacts> {
  const planoVersion = options.planoVersion ?? DEFAULT_PLANO_VERSION;
  const envoyVersion = options.envoyVersion ?? DEFAULT_ENVOY_VERSION;

  if (options.brightstaffPath && options.envoyPath && options.llmGatewayWasmPath) {
    await ensureExists(options.brightstaffPath, "brightstaff binary");
    await ensureExists(options.envoyPath, "Envoy binary");
    await ensureExists(options.llmGatewayWasmPath, "llm_gateway.wasm");

    return {
      brightstaffPath: options.brightstaffPath,
      envoyPath: options.envoyPath,
      envoyVersion,
      llmGatewayWasmPath: options.llmGatewayWasmPath,
      planoVersion,
    };
  }

  const platformSlug = resolvePlatformSlug();
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const planoDir = path.join(cacheDir, "plano", planoVersion, platformSlug);
  const envoyDir = path.join(cacheDir, "envoy", envoyVersion, platformSlug);

  const brightstaffPath = options.brightstaffPath ?? path.join(planoDir, "brightstaff");
  const llmGatewayWasmPath = options.llmGatewayWasmPath ?? path.join(planoDir, "llm_gateway.wasm");
  const envoyPath = options.envoyPath ?? path.join(envoyDir, "envoy");

  const planoReleaseBaseUrl = options.planoReleaseBaseUrl ?? DEFAULT_PLANO_RELEASE_BASE_URL;
  const envoyReleaseBaseUrl = options.envoyReleaseBaseUrl ?? DEFAULT_ENVOY_RELEASE_BASE_URL;

  await ensureDownloadedGzip(
    `${planoReleaseBaseUrl}/${planoVersion}/brightstaff-${platformSlug}.gz`,
    brightstaffPath,
    true,
  );
  await ensureDownloadedGzip(
    `${planoReleaseBaseUrl}/${planoVersion}/llm_gateway.wasm.gz`,
    llmGatewayWasmPath,
  );
  await ensureDownloadedEnvoy(
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
}
