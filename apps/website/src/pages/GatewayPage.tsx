import { Input, ListBox, ListBoxItem, Select, Switch, TextField } from "@heroui/react";
import type { Key } from "react";
import { useProxyConfigStore } from "../stores";
import { LOG_LEVEL_OPTIONS } from "../components/config/data";
import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "@proxy-up/proxy/browser";
import type { ProxyLogLevel } from "@proxy-up/proxy/browser";
import { SectionHeading, SettingRow } from "../components/common";

function GatewayPage() {
  const {
    config,
    updateGatewayHost,
    updatePorts,
    updateLogLevel,
    updateCleanupOnStop,
    updateWorkDir,
  } = useProxyConfigStore();

  const gatewayPort = config.ports?.gateway ?? DEFAULT_GATEWAY_PORT;
  const gatewayHost = config.gatewayHost ?? DEFAULT_GATEWAY_HOST;
  const logLevel = config.logLevel ?? "info";
  const cleanupOnStop = config.cleanupOnStop ?? true;
  const workDir = config.workDir ?? "";

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Gateway</h1>
      <p className="text-gray-500 text-sm mb-6">
        Configure the core settings for your proxy gateway.
      </p>

      <SectionHeading>Network</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow label="Host" description="The address the gateway binds to.">
          <TextField value={gatewayHost} onChange={(v) => updateGatewayHost(v)}>
            <Input className="w-44" placeholder={DEFAULT_GATEWAY_HOST} />
          </TextField>
        </SettingRow>
        <SettingRow label="Port" description="The port the gateway listens on.">
          <TextField
            value={String(gatewayPort)}
            onChange={(v) => {
              const n = parseInt(v, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 65535) {
                updatePorts({ ...config.ports, gateway: n });
              }
            }}
          >
            <Input
              className="w-28"
              type="number"
              min={1}
              max={65535}
              placeholder={String(DEFAULT_GATEWAY_PORT)}
            />
          </TextField>
        </SettingRow>
      </div>

      <SectionHeading>Logging</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow label="Log Level" description="Controls the verbosity of gateway output.">
          <Select
            selectedKey={logLevel}
            onSelectionChange={(key: Key | null) =>
              key != null && updateLogLevel(key as ProxyLogLevel)
            }
          >
            <Select.Trigger className="w-32">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {LOG_LEVEL_OPTIONS.map((opt) => (
                  <ListBoxItem id={opt.value} key={opt.value}>
                    {opt.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </SettingRow>
      </div>

      <SectionHeading>Behavior</SectionHeading>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
        <SettingRow
          label="Cleanup on Stop"
          description="Remove the working directory when the gateway stops."
        >
          <Switch isSelected={cleanupOnStop} onChange={updateCleanupOnStop}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </SettingRow>
        <SettingRow
          label="Work Directory"
          description="Directory used for runtime files. Leave empty to use a temporary directory."
        >
          <TextField
            value={workDir}
            onChange={(v) => updateWorkDir(v.trim() === "" ? undefined : v)}
          >
            <Input className="w-52" placeholder="(temporary)" />
          </TextField>
        </SettingRow>
      </div>
    </div>
  );
}

export default GatewayPage;
