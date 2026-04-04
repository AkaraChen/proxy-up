import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import type { GeneratedProxyConfig, ProxyGatewayOptions } from "@proxy-up/proxy/browser";

import { CodePanel, MetricCard, SectionIntro } from "./shared";

export function PreviewPanel({
  config,
  gatewayPreview,
  generatedConfig,
}: {
  config: ProxyGatewayOptions;
  gatewayPreview: string;
  generatedConfig: GeneratedProxyConfig | null;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro
        description="A live, deferred preview of the runtime config that `@proxy-up/proxy` will generate from the current store snapshot."
        eyebrow="Generated Output"
        title="Gateway preview"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          caption="external listener"
          label="Gateway URL"
          tone="accent"
          value={(generatedConfig?.gatewayUrl ?? gatewayPreview).replace("http://", "")}
        />
        <MetricCard
          caption="internal routing"
          label="Internal URL"
          tone="mint"
          value={(generatedConfig?.internalUrl ?? "http://127.0.0.1:12001").replace("http://", "")}
        />
        <MetricCard
          caption="diagnostics"
          label="Admin URL"
          tone="sun"
          value={(generatedConfig?.adminUrl ?? "http://127.0.0.1:9901").replace("http://", "")}
        />
        <MetricCard
          caption="managed process"
          label="Brightstaff URL"
          tone="accent"
          value={(generatedConfig?.brightstaffUrl ?? "http://127.0.0.1:9091").replace(
            "http://",
            "",
          )}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.75fr),minmax(0,1.25fr)]">
        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Normalized providers</Card.Title>
            <Card.Description>
              This is how provider routing resolves after parsing slugs, interfaces, defaults, and
              base URLs.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3 p-5 pt-0">
            {generatedConfig?.normalizedProviders.length ? (
              generatedConfig.normalizedProviders.map((normalizedProvider) => (
                <div
                  className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-sm"
                  key={`${normalizedProvider.name}-${normalizedProvider.model}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-slate-950">{normalizedProvider.name}</p>
                      <p className="text-sm text-slate-600">
                        {normalizedProvider.provider} / {normalizedProvider.model}
                      </p>
                      <p className="text-xs leading-5 text-slate-500">
                        Interface: {normalizedProvider.providerInterface}
                        {normalizedProvider.clusterName
                          ? ` • Cluster: ${normalizedProvider.clusterName}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {normalizedProvider.default ? (
                        <Chip color="success" size="sm" variant="soft">
                          Default
                        </Chip>
                      ) : null}
                      <Chip
                        color={normalizedProvider.baseUrl ? "warning" : "accent"}
                        size="sm"
                        variant="soft"
                      >
                        {normalizedProvider.baseUrl ? "Custom endpoint" : "Built-in endpoint"}
                      </Chip>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-sm leading-6 text-slate-600">
                Once the config is valid, the normalized provider list will show the final routing
                shape here.
              </div>
            )}
          </Card.Content>
        </Card.Root>

        <div className="grid gap-6">
          <CodePanel
            description="The rendered Plano LLM gateway config derived from providers, aliases, and ports."
            title="Plano config"
            value={
              generatedConfig?.planoConfig ??
              "# Configure at least one valid provider to render Plano output."
            }
          />
          <CodePanel
            description="The generated Envoy config that wires listeners, filters, and upstream clusters together."
            title="Envoy config"
            value={
              generatedConfig?.envoyConfig ??
              "# Envoy output appears here when preview generation succeeds."
            }
          />
          <CodePanel
            description="The exact persisted options object from the browser store."
            title="Current options"
            value={JSON.stringify(config, null, 2)}
          />
        </div>
      </div>
    </div>
  );
}
