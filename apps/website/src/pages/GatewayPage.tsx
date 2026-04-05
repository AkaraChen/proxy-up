import { Input, ListBox, ListBoxItem, Select, Switch, TextField } from "@heroui/react";
import type { Key } from "react";
import { useTranslation } from "react-i18next";
import { useProxyConfigStore } from "../stores";
import { LOG_LEVEL_OPTIONS } from "../components/config/data";
import { DEFAULT_GATEWAY_HOST, DEFAULT_GATEWAY_PORT } from "@proxy-up/proxy/browser";
import type { ProxyLogLevel } from "@proxy-up/proxy/browser";
import { SectionHeading, SettingsContainer, SettingRow } from "../components/common";

function GatewayPage() {
  const { t } = useTranslation("gateway");
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

  const logLevelOptions = LOG_LEVEL_OPTIONS.map((opt) => ({
    ...opt,
    label: t(`logLevels.${opt.value}.label`),
    description: t(`logLevels.${opt.value}.description`),
  }));

  return (
    <div className="p-6 max-w-2xl bg-secondary min-h-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t("title")}</h1>
      <p className="text-gray-500 text-sm mb-6">{t("description")}</p>

      <SectionHeading>{t("network.heading")}</SectionHeading>
      <SettingsContainer>
        <SettingRow label={t("network.host.label")} description={t("network.host.description")}>
          <TextField value={gatewayHost} onChange={(v) => updateGatewayHost(v)}>
            <Input className="w-44" placeholder={DEFAULT_GATEWAY_HOST} />
          </TextField>
        </SettingRow>
        <SettingRow label={t("network.port.label")} description={t("network.port.description")}>
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
      </SettingsContainer>

      <SectionHeading>{t("logging.heading")}</SectionHeading>
      <SettingsContainer>
        <SettingRow label={t("logging.level.label")} description={t("logging.level.description")}>
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
                {logLevelOptions.map((opt) => (
                  <ListBoxItem id={opt.value} key={opt.value}>
                    {opt.label}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </SettingRow>
      </SettingsContainer>

      <SectionHeading>{t("behavior.heading")}</SectionHeading>
      <SettingsContainer>
        <SettingRow
          label={t("behavior.cleanup.label")}
          description={t("behavior.cleanup.description")}
        >
          <Switch isSelected={cleanupOnStop} onChange={updateCleanupOnStop}>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch>
        </SettingRow>
        <SettingRow
          label={t("behavior.workDir.label")}
          description={t("behavior.workDir.description")}
        >
          <TextField
            value={workDir}
            onChange={(v) => updateWorkDir(v.trim() === "" ? undefined : v)}
          >
            <Input className="w-52" placeholder={t("behavior.workDir.placeholder")} />
          </TextField>
        </SettingRow>
      </SettingsContainer>
    </div>
  );
}

export default GatewayPage;
