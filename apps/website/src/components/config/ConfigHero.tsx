import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";

import { MetricCard } from "./shared";

export function ConfigHero({
  aliasCount,
  defaultProviderLabel,
  gatewayPreview,
  issueCount,
  logLevel,
  onAddAlias,
  onAddProvider,
  onReset,
  previewHealthy,
  providerCount,
}: {
  aliasCount: number;
  defaultProviderLabel?: string;
  gatewayPreview: string;
  issueCount: number;
  logLevel?: string;
  onAddAlias: () => void;
  onAddProvider: () => void;
  onReset: () => void;
  previewHealthy: boolean;
  providerCount: number;
}) {
  return (
    <section className="app-hero relative overflow-hidden rounded-[36px] border border-white/80 px-6 py-6 shadow-[0_36px_120px_-60px_rgba(15,23,42,0.45)] sm:px-8 sm:py-8">
      <div className="app-hero__veil absolute inset-0" />
      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.35fr),minmax(22rem,0.95fr)]">
        <div className="space-y-5">
          <Chip color="accent" size="sm" variant="soft">
            HeroUI configuration desk
          </Chip>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Tune every `proxy-up` option from one feature-rich homepage.
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              This workspace edits the same Zustand-backed config store your runtime uses.
              Providers, routing, artifacts, aliases, and generated gateway previews stay in sync
              while you type.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onPress={onAddProvider} size="lg" variant="primary">
              Add provider
            </Button>
            <Button onPress={onAddAlias} size="lg" variant="secondary">
              Add alias
            </Button>
            <Button onPress={onReset} size="lg" variant="ghost">
              Reset config
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            caption={
              defaultProviderLabel ? `default: ${defaultProviderLabel}` : "pick a default route"
            }
            label="Providers"
            tone="accent"
            value={String(providerCount).padStart(2, "0")}
          />
          <MetricCard
            caption={previewHealthy ? "preview is healthy" : "review warnings below"}
            label="Validation"
            tone="sun"
            value={previewHealthy ? "Ready" : `${issueCount} issues`}
          />
          <MetricCard
            caption={`${logLevel ?? "info"} logging`}
            label="Gateway"
            tone="mint"
            value={gatewayPreview.replace("http://", "")}
          />
          <MetricCard
            caption="persisted in browser storage"
            label="Aliases"
            tone="accent"
            value={String(aliasCount).padStart(2, "0")}
          />
        </div>
      </div>
    </section>
  );
}
