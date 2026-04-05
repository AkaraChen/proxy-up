import { useState } from "react";
import { Input, ListBox, ListBoxItem, Select, Switch, TextField } from "@heroui/react";
import type { Key } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useProxyConfigStore, useProxyUIStore } from "../stores";
import { PROVIDER_LIBRARY } from "../components/config/data";
import type { ProxyProviderInterface, ProxyProviderOptions } from "@proxy-up/proxy/browser";
import { SectionHeading, SettingRow } from "../components/common";

function ProviderItem({
  name,
  model,
  isSelected,
  onSelect,
  onRemove,
}: {
  name: string;
  model: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("provider");

  return (
    <div
      className={[
        "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-surface text-gray-900"
          : "text-gray-600 hover:bg-surface-tertiary hover:text-gray-900",
      ].join(" ")}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name || t("item.unnamed")}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {model ? `1 model · ${model}` : t("item.noModel")}
        </p>
      </div>
      <button
        type="button"
        className="ml-2 shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={t("aria.removeProvider")}
      >
        <TrashIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function ProviderSidebar() {
  const { t } = useTranslation("provider");
  const { config, addProvider, removeProvider } = useProxyConfigStore();
  const { selectedProviderIndex, setSelectedProvider } = useProxyUIStore();

  const handleAdd = () => {
    const newIndex = config.providers.length;
    addProvider({
      default: newIndex === 0,
      model: "",
      name: t("newProvider", { index: newIndex + 1, defaultValue: `Provider ${newIndex + 1}` }),
    });
    setSelectedProvider(newIndex);
  };

  const handleRemove = (index: number) => {
    removeProvider(index);
    if (selectedProviderIndex === index) {
      setSelectedProvider(index > 0 ? index - 1 : null);
    } else if (selectedProviderIndex !== null && selectedProviderIndex > index) {
      setSelectedProvider(selectedProviderIndex - 1);
    }
  };

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-secondary flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t("sidebar.heading")}
        </span>
        <button
          type="button"
          onClick={handleAdd}
          className="text-gray-500 hover:text-gray-900 hover:bg-surface-tertiary rounded p-1 transition-colors"
          aria-label={t("aria.addProvider")}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-auto py-2 px-2">
        {config.providers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8 px-3 leading-relaxed">
            {t("sidebar.empty")}
          </p>
        ) : (
          config.providers.map((provider, index) => (
            <ProviderItem
              key={index}
              name={
                provider.name ??
                t("newProvider", { index: index + 1, defaultValue: `Provider ${index + 1}` })
              }
              model={provider.model}
              isSelected={selectedProviderIndex === index}
              onSelect={() => setSelectedProvider(index)}
              onRemove={() => handleRemove(index)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ProviderPanel() {
  const { t } = useTranslation("provider");
  const { config, updateProvider } = useProxyConfigStore();
  const { selectedProviderIndex } = useProxyUIStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (selectedProviderIndex === null || selectedProviderIndex >= config.providers.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-sm">{t("panel.unselected.primary")}</p>
          <p className="text-sm">{t("panel.unselected.secondary")}</p>
        </div>
      </div>
    );
  }

  const provider = config.providers[selectedProviderIndex];

  const update = (patch: Partial<ProxyProviderOptions>) => {
    updateProvider(selectedProviderIndex, patch);
  };

  const handleTypeChange = (key: Key | null) => {
    if (key == null) return;
    const providerInterface = key as ProxyProviderInterface;
    const meta = PROVIDER_LIBRARY.find((m) => m.providerInterface === providerInterface);
    update({
      providerInterface,
      model: meta?.modelExample ?? provider.model,
      // Only prefill baseUrl when the new type requires it; preserve any existing user value otherwise
      ...(meta?.requiresBaseUrl ? { baseUrl: meta.baseUrlExample ?? "" } : {}),
    });
  };

  const meta = PROVIDER_LIBRARY.find((m) => m.providerInterface === provider.providerInterface);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {provider.name || t("item.unnamed")}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{meta?.note ?? t("panel.defaultDescription")}</p>

        <SectionHeading>{t("basic.heading")}</SectionHeading>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-surface px-4">
          <SettingRow label={t("basic.name.label")} description={t("basic.name.description")}>
            <TextField value={provider.name ?? ""} onChange={(v) => update({ name: v })}>
              <Input className="w-44" placeholder={t("basic.name.placeholder")} />
            </TextField>
          </SettingRow>

          <SettingRow label={t("basic.type.label")} description={t("basic.type.description")}>
            <Select
              selectedKey={provider.providerInterface ?? null}
              onSelectionChange={handleTypeChange}
            >
              <Select.Trigger className="w-44">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PROVIDER_LIBRARY.map((opt) => (
                    <ListBoxItem id={opt.providerInterface} key={opt.providerInterface}>
                      {opt.label}
                    </ListBoxItem>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </SettingRow>

          <SettingRow label={t("basic.apiKey.label")} description={t("basic.apiKey.description")}>
            <div className="flex items-center gap-1">
              <TextField
                value={provider.apiKey ?? ""}
                onChange={(v) => update({ apiKey: v || undefined })}
              >
                <Input
                  className="w-44"
                  type={showApiKey ? "text" : "password"}
                  placeholder={t("basic.apiKey.placeholder")}
                  autoComplete="off"
                />
              </TextField>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-400 hover:text-gray-700 p-1 transition-colors"
                aria-label={showApiKey ? t("aria.hideApiKey") : t("aria.showApiKey")}
              >
                {showApiKey ? (
                  <EyeSlashIcon className="size-4" aria-hidden="true" />
                ) : (
                  <EyeIcon className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </SettingRow>

          <SettingRow
            label={t("basic.baseUrl.label")}
            description={
              meta?.requiresBaseUrl
                ? t("basic.baseUrl.description.required")
                : t("basic.baseUrl.description.optional")
            }
          >
            <TextField
              value={provider.baseUrl ?? ""}
              onChange={(v) => update({ baseUrl: v || undefined })}
            >
              <Input
                className="w-52"
                placeholder={meta?.baseUrlExample ?? t("basic.baseUrl.placeholder")}
              />
            </TextField>
          </SettingRow>

          <SettingRow label={t("basic.model.label")} description={t("basic.model.description")}>
            <TextField value={provider.model} onChange={(v) => update({ model: v })}>
              <Input
                className="w-44"
                placeholder={meta?.modelExample ?? t("basic.model.placeholder")}
              />
            </TextField>
          </SettingRow>
        </div>

        <button
          type="button"
          className="mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? (
            <ChevronDownIcon className="size-3.5" aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="size-3.5" aria-hidden="true" />
          )}
          {t("advanced.heading")}
        </button>

        {showAdvanced && (
          <div className="mt-1 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
            <SettingRow
              label={t("advanced.defaultProvider.label")}
              description={t("advanced.defaultProvider.description")}
            >
              <Switch
                isSelected={provider.default ?? false}
                onChange={(v) => update({ default: v })}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </SettingRow>

            <SettingRow
              label={t("advanced.passthroughAuth.label")}
              description={t("advanced.passthroughAuth.description")}
            >
              <Switch
                isSelected={provider.passthroughAuth ?? false}
                onChange={(v) => update({ passthroughAuth: v })}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            </SettingRow>
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderPage() {
  return (
    <div className="flex h-full bg-secondary">
      <ProviderSidebar />
      <ProviderPanel />
    </div>
  );
}

export default ProviderPage;
