import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import type { ProxyLogLevel, ProxyPorts } from "@proxy-up/proxy/browser";

import type { ValidationErrors } from "../../stores/middleware/validation";
import { LOG_LEVEL_OPTIONS } from "./data";
import type { AliasEntry } from "./types";
import { ConfigNumberField, ConfigTextField, InlineAlert, SectionIntro } from "./shared";

export function RoutingPanel({
  aliasEntries,
  gatewayHost,
  logLevel,
  onAddAlias,
  onRemoveAlias,
  onUpdateAlias,
  onUpdateGatewayHost,
  onUpdateLogLevel,
  onUpdatePort,
  ports,
  validationErrors,
}: {
  aliasEntries: AliasEntry[];
  gatewayHost?: string;
  logLevel?: ProxyLogLevel;
  onAddAlias: () => void;
  onRemoveAlias: (index: number) => void;
  onUpdateAlias: (index: number, field: keyof AliasEntry, value: string) => void;
  onUpdateGatewayHost: (value: string) => void;
  onUpdateLogLevel: (value: ProxyLogLevel) => void;
  onUpdatePort: (port: keyof ProxyPorts, value: number) => void;
  ports?: ProxyPorts;
  validationErrors: ValidationErrors;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr),minmax(0,1.05fr)]">
      <div className="space-y-6">
        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Gateway & Logs</Card.Title>
            <Card.Description>
              Control the listener host plus the runtime verbosity used across gateway services.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-5 p-5 pt-0">
            <ConfigTextField
              description="Public bind address for the external gateway listener."
              label="Gateway host"
              onChange={onUpdateGatewayHost}
              placeholder="127.0.0.1"
              value={gatewayHost}
            />

            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">Log level</p>
                <p className="text-sm leading-6 text-slate-600">
                  Pick the amount of runtime detail you want from the managed processes.
                </p>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {LOG_LEVEL_OPTIONS.map((option) => (
                  <Button
                    className="h-auto justify-start px-4 py-3 text-left"
                    key={option.value}
                    onPress={() => onUpdateLogLevel(option.value)}
                    variant={logLevel === option.value ? "primary" : "outline"}
                  >
                    <span className="flex flex-col items-start gap-1">
                      <span className="font-medium text-slate-900">{option.label}</span>
                      <span className="text-xs leading-5 text-slate-500">{option.description}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <Card.Root variant="default">
          <Card.Header className="p-5 pb-3">
            <Card.Title>Ports</Card.Title>
            <Card.Description>
              These listeners must stay unique. Validation will flag collisions and invalid ranges.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4 p-5 pt-0">
            {validationErrors.ports.length > 0 ? (
              <InlineAlert
                description={validationErrors.ports.join(" • ")}
                status="warning"
                title="Port validation"
              />
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <ConfigNumberField
                description="External model gateway listener."
                label="Gateway port"
                onChange={(value) => onUpdatePort("gateway", value)}
                value={ports?.gateway ?? 12000}
              />
              <ConfigNumberField
                description="Internal routing listener used by the LLM gateway filter."
                label="Internal port"
                onChange={(value) => onUpdatePort("internal", value)}
                value={ports?.internal ?? 12001}
              />
              <ConfigNumberField
                description="Brightstaff runtime listener used by the proxy process."
                label="Brightstaff port"
                onChange={(value) => onUpdatePort("brightstaff", value)}
                value={ports?.brightstaff ?? 9091}
              />
              <ConfigNumberField
                description="Envoy admin and diagnostics listener."
                label="Admin port"
                onChange={(value) => onUpdatePort("admin", value)}
                value={ports?.admin ?? 9901}
              />
            </div>
          </Card.Content>
        </Card.Root>
      </div>

      <Card.Root variant="default">
        <Card.Header className="flex flex-col gap-4 p-5">
          <SectionIntro
            actions={
              <Button onPress={onAddAlias} variant="secondary">
                Add alias
              </Button>
            }
            description="Map friendly names to fully-qualified provider/model targets. Aliases are normalized into the generated Plano config."
            eyebrow="Model Aliases"
            title="Alias routing"
          />
        </Card.Header>
        <Card.Content className="space-y-4 p-5 pt-0">
          {aliasEntries.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/65 px-5 py-8 text-sm leading-6 text-slate-600">
              No aliases defined yet. Add one if you want stable logical names like `chat-default`
              or `vision`.
            </div>
          ) : (
            aliasEntries.map((alias, index) => (
              <div
                className="grid gap-4 rounded-[28px] border border-white/80 bg-white/80 p-4 shadow-sm lg:grid-cols-[minmax(0,0.8fr),minmax(0,1fr),auto]"
                key={`${alias.name}-${index}`}
              >
                <ConfigTextField
                  description="Alias exposed to clients."
                  label="Alias"
                  onChange={(value) => onUpdateAlias(index, "name", value)}
                  placeholder="chat-default"
                  value={alias.name}
                />
                <ConfigTextField
                  description="Fully-qualified target such as `openai/gpt-4.1-mini`."
                  label="Target"
                  onChange={(value) => onUpdateAlias(index, "target", value)}
                  placeholder="openai/gpt-4.1-mini"
                  value={alias.target}
                />
                <div className="flex items-end">
                  <Button onPress={() => onRemoveAlias(index)} variant="danger-soft">
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card.Content>
      </Card.Root>
    </div>
  );
}
