import { startTransition, useDeferredValue, useEffect } from "react";
import { Card } from "@heroui/react/card";
import { Tabs } from "@heroui/react/tabs";
import {
  generateGatewayConfig,
  type GeneratedProxyConfig,
  type ProxyArtifactOptions,
  type ProxyGatewayOptions,
  type ProxyLogLevel,
  type ProxyPorts,
  type ProxyProviderInterface,
  type ProxyProviderOptions,
} from "@proxy-up/proxy/browser";

import { ConfigHero } from "./components/config/ConfigHero";
import { PreviewPanel } from "./components/config/PreviewPanel";
import { ProvidersPanel } from "./components/config/ProvidersPanel";
import { RoutingPanel } from "./components/config/RoutingPanel";
import { RuntimePanel } from "./components/config/RuntimePanel";
import { StatusAlerts } from "./components/config/StatusAlerts";
import { createProviderPreset, getProviderMeta } from "./components/config/data";
import type { AliasEntry } from "./components/config/types";
import {
  countValidationIssues,
  getAliasEntries,
  getGatewayPreview,
  getProviderIssues,
  getProviderLabel,
  toAliasMap,
} from "./components/config/utils";
import { useProxyConfigStore, useProxyRuntimeStore, useProxyUIStore } from "./stores";
import { validateConfig } from "./stores/middleware/validation";

function App() {
  const config = useProxyConfigStore((state) => state.config);
  const resetConfig = useProxyConfigStore((state) => state.resetConfig);
  const setConfig = useProxyConfigStore((state) => state.setConfig);

  const error = useProxyUIStore((state) => state.error);
  const selectedProviderIndex = useProxyUIStore((state) => state.selectedProviderIndex);
  const setError = useProxyUIStore((state) => state.setError);
  const setSelectedProvider = useProxyUIStore((state) => state.setSelectedProvider);
  const setValidationErrors = useProxyUIStore((state) => state.setValidationErrors);
  const validationErrors = useProxyUIStore((state) => state.validationErrors);

  const generatedConfig = useProxyRuntimeStore((state) => state.generatedConfig);
  const setGeneratedConfig = useProxyRuntimeStore((state) => state.setGeneratedConfig);

  const deferredConfig = useDeferredValue(config);

  useEffect(() => {
    if (config.providers.length === 0) {
      if (selectedProviderIndex !== null) {
        setSelectedProvider(null);
      }
      return;
    }

    if (selectedProviderIndex === null || selectedProviderIndex >= config.providers.length) {
      setSelectedProvider(0);
    }
  }, [config.providers.length, selectedProviderIndex, setSelectedProvider]);

  useEffect(() => {
    const nextValidationErrors = validateConfig(deferredConfig);
    let nextGeneratedConfig: GeneratedProxyConfig | null = null;
    let nextError: string | null = null;

    try {
      nextGeneratedConfig = generateGatewayConfig(deferredConfig);
    } catch (issue) {
      nextError =
        issue instanceof Error
          ? issue.message
          : "Unable to generate the proxy configuration preview.";
    }

    setValidationErrors(nextValidationErrors);
    setGeneratedConfig(nextGeneratedConfig);
    setError(nextError);
  }, [deferredConfig, setError, setGeneratedConfig, setValidationErrors]);

  function updateConfig(updater: (current: ProxyGatewayOptions) => ProxyGatewayOptions) {
    startTransition(() => {
      const current = useProxyConfigStore.getState().config;
      setConfig(updater(current));
    });
  }

  function addProvider(create: (index: number) => ProxyProviderOptions) {
    const nextIndex = useProxyConfigStore.getState().config.providers.length;

    updateConfig((current) => ({
      ...current,
      providers: [...current.providers, create(nextIndex)],
    }));

    startTransition(() => {
      setSelectedProvider(nextIndex);
    });
  }

  function updateProvider(index: number, providerUpdate: Partial<ProxyProviderOptions>) {
    updateConfig((current) => ({
      ...current,
      providers: current.providers.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, ...providerUpdate } : provider,
      ),
    }));
  }

  function updateProviderInterface(index: number, providerInterface: ProxyProviderInterface) {
    const meta = getProviderMeta(providerInterface);

    updateConfig((current) => ({
      ...current,
      providers: current.providers.map((provider, providerIndex) => {
        if (providerIndex !== index) {
          return provider;
        }

        const shouldSyncProviderName =
          !provider.provider ||
          provider.provider === provider.providerInterface ||
          provider.provider === getProviderMeta(provider.providerInterface)?.provider;

        return {
          ...provider,
          baseUrl: meta?.requiresBaseUrl
            ? (provider.baseUrl ?? meta.baseUrlExample)
            : provider.baseUrl,
          provider: shouldSyncProviderName
            ? (meta?.provider ?? provider.provider)
            : provider.provider,
          providerInterface,
        };
      }),
    }));
  }

  function removeProvider(index: number) {
    updateConfig((current) => ({
      ...current,
      providers: current.providers.filter((_, providerIndex) => providerIndex !== index),
    }));
  }

  function setDefaultProvider(index: number, isDefault: boolean) {
    updateConfig((current) => ({
      ...current,
      providers: current.providers.map((provider, providerIndex) => {
        if (providerIndex === index) {
          return { ...provider, default: isDefault };
        }

        return isDefault ? { ...provider, default: false } : provider;
      }),
    }));
  }

  function updatePort(port: keyof ProxyPorts, value: number) {
    updateConfig((current) => ({
      ...current,
      ports: {
        ...current.ports,
        [port]: value,
      },
    }));
  }

  function updateArtifact(field: keyof ProxyArtifactOptions, value: string) {
    updateConfig((current) => ({
      ...current,
      artifacts: {
        ...current.artifacts,
        [field]: value.trim() === "" ? undefined : value,
      },
    }));
  }

  function addAlias() {
    updateConfig((current) => {
      const entries = getAliasEntries(current.modelAliases);
      const seed = current.providers[0];
      entries.push({
        name: `alias-${entries.length + 1}`,
        target: seed
          ? `${seed.provider ?? seed.providerInterface ?? "provider"}/${seed.model}`
          : "",
      });

      return {
        ...current,
        modelAliases: toAliasMap(entries),
      };
    });
  }

  function updateAlias(index: number, field: keyof AliasEntry, value: string) {
    updateConfig((current) => {
      const entries = getAliasEntries(current.modelAliases);
      const currentEntry = entries[index];

      if (!currentEntry) {
        return current;
      }

      entries[index] = { ...currentEntry, [field]: value };

      return {
        ...current,
        modelAliases: toAliasMap(entries),
      };
    });
  }

  function removeAlias(index: number) {
    updateConfig((current) => ({
      ...current,
      modelAliases: toAliasMap(
        getAliasEntries(current.modelAliases).filter((_, aliasIndex) => aliasIndex !== index),
      ),
    }));
  }

  function resetWorkspace() {
    startTransition(() => {
      resetConfig();
      setSelectedProvider(null);
    });
  }

  function updateGatewayHost(value: string) {
    updateConfig((current) => ({
      ...current,
      gatewayHost: value,
    }));
  }

  function updateLogLevel(value: ProxyLogLevel) {
    updateConfig((current) => ({
      ...current,
      logLevel: value,
    }));
  }

  function updateWorkDir(value: string) {
    updateConfig((current) => ({
      ...current,
      workDir: value.trim() === "" ? undefined : value,
    }));
  }

  function updateCleanupOnStop(value: boolean) {
    updateConfig((current) => ({
      ...current,
      cleanupOnStop: value,
    }));
  }

  const aliasEntries = getAliasEntries(config.modelAliases);
  const issueCount = countValidationIssues(validationErrors);
  const defaultProvider = config.providers.find((provider) => provider.default);
  const provider =
    selectedProviderIndex === null ? null : (config.providers[selectedProviderIndex] ?? null);
  const providerIssues =
    selectedProviderIndex === null
      ? []
      : getProviderIssues(validationErrors, selectedProviderIndex);
  const gatewayPreview = getGatewayPreview(config, generatedConfig);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <ConfigHero
          aliasCount={aliasEntries.length}
          defaultProviderLabel={defaultProvider ? getProviderLabel(defaultProvider, 0) : undefined}
          gatewayPreview={gatewayPreview}
          issueCount={issueCount}
          logLevel={config.logLevel}
          onAddAlias={addAlias}
          onAddProvider={() => addProvider((index) => createProviderPreset("openai", index))}
          onReset={resetWorkspace}
          previewHealthy={issueCount === 0 && !error}
          providerCount={config.providers.length}
        />

        <StatusAlerts
          error={error}
          hasGeneratedConfig={Boolean(generatedConfig)}
          issueCount={issueCount}
        />

        <Card.Root className="overflow-hidden" variant="secondary">
          <Card.Content className="p-0">
            <Tabs.Root className="gap-0" defaultSelectedKey="providers" variant="secondary">
              <div className="border-b border-slate-200/80 px-4 pt-4 sm:px-6">
                <Tabs.ListContainer className="overflow-x-auto pb-4">
                  <Tabs.List aria-label="Proxy configuration sections">
                    <Tabs.Tab id="providers">Providers</Tabs.Tab>
                    <Tabs.Tab id="routing">Routing</Tabs.Tab>
                    <Tabs.Tab id="runtime">Runtime</Tabs.Tab>
                    <Tabs.Tab id="preview">Preview</Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </div>

              <Tabs.Panel className="p-4 sm:p-6" id="providers">
                <ProvidersPanel
                  config={config}
                  onAddProvider={addProvider}
                  onRemoveProvider={removeProvider}
                  onSelectProvider={setSelectedProvider}
                  onSetDefaultProvider={setDefaultProvider}
                  onUpdateProvider={updateProvider}
                  onUpdateProviderInterface={updateProviderInterface}
                  provider={provider}
                  providerIssues={providerIssues}
                  selectedProviderIndex={selectedProviderIndex}
                  validationErrors={validationErrors}
                />
              </Tabs.Panel>

              <Tabs.Panel className="p-4 sm:p-6" id="routing">
                <RoutingPanel
                  aliasEntries={aliasEntries}
                  gatewayHost={config.gatewayHost}
                  logLevel={config.logLevel}
                  onAddAlias={addAlias}
                  onRemoveAlias={removeAlias}
                  onUpdateAlias={updateAlias}
                  onUpdateGatewayHost={updateGatewayHost}
                  onUpdateLogLevel={updateLogLevel}
                  onUpdatePort={updatePort}
                  ports={config.ports}
                  validationErrors={validationErrors}
                />
              </Tabs.Panel>

              <Tabs.Panel className="p-4 sm:p-6" id="runtime">
                <RuntimePanel
                  artifacts={config.artifacts}
                  cleanupOnStop={config.cleanupOnStop}
                  onUpdateArtifact={updateArtifact}
                  onUpdateCleanupOnStop={updateCleanupOnStop}
                  onUpdateWorkDir={updateWorkDir}
                  workDir={config.workDir}
                />
              </Tabs.Panel>

              <Tabs.Panel className="p-4 sm:p-6" id="preview">
                <PreviewPanel
                  config={config}
                  gatewayPreview={gatewayPreview}
                  generatedConfig={generatedConfig}
                />
              </Tabs.Panel>
            </Tabs.Root>
          </Card.Content>
        </Card.Root>
      </div>
    </div>
  );
}

export default App;
