import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { Separator } from "@heroui/react/separator";
import type {
  ProxyGatewayOptions,
  ProxyProviderInterface,
  ProxyProviderOptions,
} from "@proxy-up/proxy/browser";

import type { ValidationErrors } from "../../stores/middleware/validation";
import { PROVIDER_LIBRARY, QUICK_PROVIDER_PRESETS, getProviderMeta } from "./data";
import { getProviderIssues, getProviderLabel, getProviderSubtitle } from "./utils";
import { ConfigSwitchCard, ConfigTextField, InlineAlert } from "./shared";

export function ProvidersPanel({
  config,
  provider,
  providerIssues,
  selectedProviderIndex,
  validationErrors,
  onAddProvider,
  onRemoveProvider,
  onSelectProvider,
  onSetDefaultProvider,
  onUpdateProvider,
  onUpdateProviderInterface,
}: {
  config: ProxyGatewayOptions;
  provider: ProxyProviderOptions | null;
  providerIssues: string[];
  selectedProviderIndex: number | null;
  validationErrors: ValidationErrors;
  onAddProvider: (create: (index: number) => ProxyProviderOptions) => void;
  onRemoveProvider: (index: number) => void;
  onSelectProvider: (index: number) => void;
  onSetDefaultProvider: (index: number, isDefault: boolean) => void;
  onUpdateProvider: (index: number, providerUpdate: Partial<ProxyProviderOptions>) => void;
  onUpdateProviderInterface: (index: number, providerInterface: ProxyProviderInterface) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[20rem,minmax(0,1fr)]">
      <div className="space-y-4">
        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Quick Add</Card.Title>
            <Card.Description>
              Start from common upstream shapes instead of building every provider from scratch.
            </Card.Description>
          </Card.Header>
          <Card.Content className="grid gap-3 p-5 pt-0">
            {QUICK_PROVIDER_PRESETS.map((preset) => (
              <Button
                className="h-auto justify-start px-4 py-4 text-left"
                key={preset.label}
                onPress={() => onAddProvider(preset.create)}
                variant="outline"
              >
                <span className="flex flex-col items-start gap-1">
                  <span className="font-medium text-slate-900">{preset.label}</span>
                  <span className="text-sm text-slate-500">{preset.description}</span>
                </span>
              </Button>
            ))}
          </Card.Content>
        </Card.Root>

        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Configured Providers</Card.Title>
            <Card.Description>
              Choose a card to edit detailed settings and provider-specific routing behavior.
            </Card.Description>
          </Card.Header>
          <Card.Content className="grid gap-3 p-5 pt-0">
            {config.providers.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-sm leading-6 text-slate-600">
                No providers yet. Add a preset to start shaping the gateway.
              </div>
            ) : (
              config.providers.map((currentProvider, index) => {
                const selected = index === selectedProviderIndex;
                const currentIssues = getProviderIssues(validationErrors, index);

                return (
                  <Button
                    className="h-auto justify-start px-4 py-4 text-left"
                    fullWidth
                    key={`${getProviderLabel(currentProvider, index)}-${index}`}
                    onPress={() => onSelectProvider(index)}
                    variant={selected ? "primary" : "outline"}
                  >
                    <span className="flex w-full flex-col gap-3">
                      <span className="flex items-start justify-between gap-3">
                        <span className="space-y-1">
                          <span className="block font-medium">
                            {getProviderLabel(currentProvider, index)}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {getProviderSubtitle(currentProvider)}
                          </span>
                        </span>
                        <span className="flex flex-wrap justify-end gap-2">
                          {currentProvider.default ? (
                            <Chip color="success" size="sm" variant="soft">
                              Default
                            </Chip>
                          ) : null}
                          <Chip
                            color={currentIssues.length > 0 ? "warning" : "accent"}
                            size="sm"
                            variant="soft"
                          >
                            {currentIssues.length > 0
                              ? `${currentIssues.length} issue${currentIssues.length === 1 ? "" : "s"}`
                              : "Ready"}
                          </Chip>
                        </span>
                      </span>
                    </span>
                  </Button>
                );
              })
            )}
          </Card.Content>
        </Card.Root>
      </div>

      {provider && selectedProviderIndex !== null ? (
        <Card.Root variant="default">
          <Card.Header className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <Card.Title>{getProviderLabel(provider, selectedProviderIndex)}</Card.Title>
                <Card.Description>
                  {getProviderMeta(provider.providerInterface)?.note ??
                    "Map the provider slug, model, and upstream routing details."}
                </Card.Description>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip color={provider.default ? "success" : "default"} size="sm" variant="soft">
                  {provider.default ? "Default route" : "Secondary route"}
                </Chip>
                {getProviderMeta(provider.providerInterface)?.requiresBaseUrl ? (
                  <Chip color="warning" size="sm" variant="soft">
                    baseUrl required
                  </Chip>
                ) : (
                  <Chip color="accent" size="sm" variant="soft">
                    builtin upstream
                  </Chip>
                )}
              </div>
            </div>

            {providerIssues.length > 0 ? (
              <InlineAlert
                description={providerIssues.join(" • ")}
                status="warning"
                title="Provider-specific validation"
              />
            ) : null}
          </Card.Header>

          <Card.Content className="space-y-6 p-5 pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Provider Interface
                </h3>
                <span className="text-xs text-slate-500">
                  Choose the parser + auth semantics the gateway should use.
                </span>
              </div>
              <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {PROVIDER_LIBRARY.map((option) => (
                  <Button
                    className="h-auto justify-start px-4 py-3 text-left"
                    key={option.providerInterface}
                    onPress={() =>
                      onUpdateProviderInterface(selectedProviderIndex, option.providerInterface)
                    }
                    variant={
                      provider.providerInterface === option.providerInterface
                        ? "primary"
                        : "outline"
                    }
                  >
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium text-slate-900">{option.label}</span>
                      <span className="text-xs leading-5 text-slate-500">
                        {option.requiresBaseUrl ? "Custom base URL" : "Built-in upstream"}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <ConfigTextField
                description="Human-friendly label used throughout the UI and validation."
                label="Display name"
                onChange={(value) => onUpdateProvider(selectedProviderIndex, { name: value })}
                placeholder="OpenAI primary"
                value={provider.name}
              />
              <ConfigTextField
                description="Logical provider slug used in `<provider>/<model>` routing."
                label="Provider slug"
                onChange={(value) => onUpdateProvider(selectedProviderIndex, { provider: value })}
                placeholder={getProviderMeta(provider.providerInterface)?.provider ?? "openai"}
                value={provider.provider}
              />
              <ConfigTextField
                description="Model name forwarded to the selected upstream provider."
                label="Model"
                onChange={(value) => onUpdateProvider(selectedProviderIndex, { model: value })}
                placeholder={
                  getProviderMeta(provider.providerInterface)?.modelExample ?? "your-model-id"
                }
                value={provider.model}
              />
              <ConfigTextField
                description="Optional upstream credential. Leave empty if you use passthrough auth."
                label="API key"
                onChange={(value) => onUpdateProvider(selectedProviderIndex, { apiKey: value })}
                placeholder="sk-..."
                type="password"
                value={provider.apiKey}
              />
              <div className="md:col-span-2">
                <ConfigTextField
                  description="Required for native interfaces without a built-in endpoint, and useful for custom OpenAI-compatible routes."
                  label="Base URL"
                  onChange={(value) => onUpdateProvider(selectedProviderIndex, { baseUrl: value })}
                  placeholder={
                    getProviderMeta(provider.providerInterface)?.baseUrlExample ??
                    "https://your-endpoint.example/v1"
                  }
                  value={provider.baseUrl}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ConfigSwitchCard
                description="Makes this provider the default target when routing does not explicitly pick another provider."
                isSelected={Boolean(provider.default)}
                label="Default provider"
                onChange={(value) => onSetDefaultProvider(selectedProviderIndex, value)}
              />
              <ConfigSwitchCard
                description="Pass the incoming authorization header through instead of using the configured API key."
                isSelected={Boolean(provider.passthroughAuth)}
                label="Passthrough auth"
                onChange={(value) =>
                  onUpdateProvider(selectedProviderIndex, { passthroughAuth: value })
                }
              />
            </div>

            <div className="flex justify-end">
              <Button onPress={() => onRemoveProvider(selectedProviderIndex)} variant="danger-soft">
                Remove provider
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      ) : (
        <Card.Root className="flex min-h-[24rem] items-center justify-center" variant="default">
          <Card.Content className="max-w-xl space-y-3 p-8 text-center">
            <Card.Title>Choose a provider to edit</Card.Title>
            <Card.Description>
              The provider rail on the left gives you fast access to presets and validation status.
              Once you select one, its routing, auth, and model fields open here.
            </Card.Description>
          </Card.Content>
        </Card.Root>
      )}
    </div>
  );
}
