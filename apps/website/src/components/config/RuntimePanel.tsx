import { Card } from "@heroui/react/card";
import type { ProxyArtifactOptions } from "@proxy-up/proxy/browser";

import { ConfigSwitchCard, ConfigTextField } from "./shared";

export function RuntimePanel({
  artifacts,
  cleanupOnStop,
  onUpdateArtifact,
  onUpdateCleanupOnStop,
  onUpdateWorkDir,
  workDir,
}: {
  artifacts?: ProxyArtifactOptions;
  cleanupOnStop?: boolean;
  onUpdateArtifact: (field: keyof ProxyArtifactOptions, value: string) => void;
  onUpdateCleanupOnStop: (value: boolean) => void;
  onUpdateWorkDir: (value: string) => void;
  workDir?: string;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]">
      <div className="space-y-6">
        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Runtime behavior</Card.Title>
            <Card.Description>
              Control where proxy-up writes artifacts and whether temporary runtime files are
              cleaned up.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-5 pt-0">
            <ConfigTextField
              description="Optional working directory for generated config, logs, and runtime state."
              label="Work directory"
              onChange={onUpdateWorkDir}
              placeholder="/tmp/proxy-up"
              value={workDir}
            />

            <ConfigSwitchCard
              description="Remove generated config files and transient artifacts when the gateway shuts down."
              isSelected={Boolean(cleanupOnStop)}
              label="Cleanup on stop"
              onChange={onUpdateCleanupOnStop}
            />
          </Card.Content>
        </Card.Root>

        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Resolved paths</Card.Title>
            <Card.Description>
              Override binary locations only if you need custom local assets instead of downloaded
              artifacts.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-5 pt-0">
            <ConfigTextField
              description="Directory used to cache downloaded binaries and runtime assets."
              label="Cache directory"
              onChange={(value) => onUpdateArtifact("cacheDir", value)}
              placeholder="~/.cache/proxy-up/proxy"
              value={artifacts?.cacheDir}
            />
            <ConfigTextField
              description="Optional explicit path to the Envoy binary."
              label="Envoy path"
              onChange={(value) => onUpdateArtifact("envoyPath", value)}
              placeholder="/usr/local/bin/envoy"
              value={artifacts?.envoyPath}
            />
            <ConfigTextField
              description="Optional explicit path to the Brightstaff binary."
              label="Brightstaff path"
              onChange={(value) => onUpdateArtifact("brightstaffPath", value)}
              placeholder="/usr/local/bin/brightstaff"
              value={artifacts?.brightstaffPath}
            />
            <ConfigTextField
              description="Optional explicit path to the LLM gateway WebAssembly module."
              label="LLM gateway WASM path"
              onChange={(value) => onUpdateArtifact("llmGatewayWasmPath", value)}
              placeholder="./llm_gateway.wasm"
              value={artifacts?.llmGatewayWasmPath}
            />
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root variant="default">
        <Card.Header className="p-5 pb-3">
          <Card.Title>Artifact versions & mirrors</Card.Title>
          <Card.Description>
            Point the downloader at alternate versions or release mirrors when you need to pin
            infra.
          </Card.Description>
        </Card.Header>
        <Card.Content className="grid gap-4 p-5 pt-0">
          <ConfigTextField
            description="Pinned version used when downloading Plano."
            label="Plano version"
            onChange={(value) => onUpdateArtifact("planoVersion", value)}
            placeholder="0.4.17"
            value={artifacts?.planoVersion}
          />
          <ConfigTextField
            description="Pinned version used when downloading Envoy."
            label="Envoy version"
            onChange={(value) => onUpdateArtifact("envoyVersion", value)}
            placeholder="v1.37.0"
            value={artifacts?.envoyVersion}
          />
          <ConfigTextField
            description="Override the base URL used to fetch Plano releases."
            label="Plano release base URL"
            onChange={(value) => onUpdateArtifact("planoReleaseBaseUrl", value)}
            placeholder="https://github.com/katanemo/plano/releases/download"
            value={artifacts?.planoReleaseBaseUrl}
          />
          <ConfigTextField
            description="Override the base URL used to fetch Envoy releases."
            label="Envoy release base URL"
            onChange={(value) => onUpdateArtifact("envoyReleaseBaseUrl", value)}
            placeholder="https://github.com/tetratelabs/archive-envoy/releases/download"
            value={artifacts?.envoyReleaseBaseUrl}
          />
        </Card.Content>
      </Card.Root>
    </div>
  );
}
