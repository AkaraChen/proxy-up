import { Input, Select, SelectItem, Switch } from "@heroui/react";
import type { ReactNode } from "react";
import { useProxyConfigStore } from "../stores";
import { LOG_LEVEL_OPTIONS } from "../components/config/data";
import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "@proxy-up/proxy/browser";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1 mt-6 first:mt-0">
      {children}
    </h2>
  );
}

function GatewayPage() {
  const { config, updateGatewayHost, updatePorts, updateLogLevel, updateCleanupOnStop, updateWorkDir } =
    useProxyConfigStore();

  const gatewayPort = config.ports?.gateway ?? DEFAULT_GATEWAY_PORT;
  const gatewayHost = config.gatewayHost ?? DEFAULT_GATEWAY_HOST;
  const logLevel = config.logLevel ?? "info";
  const cleanupOnStop = config.cleanupOnStop ?? true;
  const workDir = config.workDir ?? "";

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Gateway</h1>
      <p className="text-gray-500 text-sm mb-6">Configure the core settings for your proxy gateway.</p>

      <SectionHeading>Network</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow label="Host" description="The address the gateway binds to.">
          <Input
            aria-label="Gateway host"
            className="w-44"
            size="sm"
            value={gatewayHost}
            placeholder={DEFAULT_GATEWAY_HOST}
            onValueChange={(v) => updateGatewayHost(v)}
          />
        </SettingRow>
        <SettingRow label="Port" description="The port the gateway listens on.">
          <Input
            aria-label="Gateway port"
            className="w-28"
            size="sm"
            type="number"
            min={1}
            max={65535}
            value={String(gatewayPort)}
            placeholder={String(DEFAULT_GATEWAY_PORT)}
            onValueChange={(v) => {
              const n = parseInt(v, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 65535) {
                updatePorts({ ...config.ports, gateway: n });
              }
            }}
          />
        </SettingRow>
      </div>

      <SectionHeading>Logging</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow
          label="Log Level"
          description="Controls the verbosity of gateway output."
        >
          <Select
            aria-label="Log level"
            className="w-36"
            size="sm"
            selectedKeys={[logLevel]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) updateLogLevel(selected as typeof logLevel);
            }}
          >
            {LOG_LEVEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} textValue={opt.label}>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-gray-400">{opt.description}</p>
                </div>
              </SelectItem>
            ))}
          </Select>
        </SettingRow>
      </div>

      <SectionHeading>Behavior</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow
          label="Cleanup on Stop"
          description="Remove the working directory when the gateway stops."
        >
          <Switch
            aria-label="Cleanup on stop"
            size="sm"
            isSelected={cleanupOnStop}
            onValueChange={(v) => updateCleanupOnStop(v)}
          />
        </SettingRow>
        <SettingRow
          label="Work Directory"
          description="Directory used for runtime files. Leave empty to use a temporary directory."
        >
          <Input
            aria-label="Work directory"
            className="w-52"
            size="sm"
            value={workDir}
            placeholder="(temporary)"
            onValueChange={(v) => updateWorkDir(v.trim() === "" ? undefined : v)}
          />
        </SettingRow>
      </div>
    </div>
  );
}

export default GatewayPage;

