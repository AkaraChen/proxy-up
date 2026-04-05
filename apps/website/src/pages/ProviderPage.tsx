import { useState } from "react";
import { Input, ListBox, ListBoxItem, Select, Switch, TextField } from "@heroui/react";
import type { Key } from "react";
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
  return (
    <div
      className={[
        "group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      ].join(" ")}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name || "Unnamed Provider"}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {model ? `1 model · ${model}` : "No model configured"}
        </p>
      </div>
      <button
        type="button"
        className="ml-2 shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove provider"
      >
        <TrashIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function ProviderSidebar() {
  const { config, addProvider, removeProvider } = useProxyConfigStore();
  const { selectedProviderIndex, setSelectedProvider } = useProxyUIStore();

  const handleAdd = () => {
    const newIndex = config.providers.length;
    addProvider({
      default: newIndex === 0,
      model: "",
      name: `Provider ${newIndex + 1}`,
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
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white/60 backdrop-blur-sm flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Providers
        </span>
        <button
          type="button"
          onClick={handleAdd}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded p-1 transition-colors"
          aria-label="Add provider"
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="flex-1 overflow-auto py-2 px-2">
        {config.providers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8 px-3 leading-relaxed">
            No providers yet.
            <br />
            Click + to add one.
          </p>
        ) : (
          config.providers.map((provider, index) => (
            <ProviderItem
              key={index}
              name={provider.name ?? `Provider ${index + 1}`}
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
  const { config, updateProvider } = useProxyConfigStore();
  const { selectedProviderIndex } = useProxyUIStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (selectedProviderIndex === null || selectedProviderIndex >= config.providers.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-sm">Select a provider to configure it,</p>
          <p className="text-sm">or click + to add a new one.</p>
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
          {provider.name || "Unnamed Provider"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {meta?.note ?? "Configure the settings for this provider."}
        </p>

        <SectionHeading>Basic</SectionHeading>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
          <SettingRow label="Name" description="A display name for this provider.">
            <TextField value={provider.name ?? ""} onChange={(v) => update({ name: v })}>
              <Input className="w-44" placeholder="e.g. My OpenAI" />
            </TextField>
          </SettingRow>

          <SettingRow label="Type" description="The provider interface to use for this entry.">
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

          <SettingRow
            label="API Key"
            description="The secret key used to authenticate with the provider."
          >
            <div className="flex items-center gap-1">
              <TextField
                value={provider.apiKey ?? ""}
                onChange={(v) => update({ apiKey: v || undefined })}
              >
                <Input
                  className="w-44"
                  type={showApiKey ? "text" : "password"}
                  placeholder="sk-…"
                  autoComplete="off"
                />
              </TextField>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-400 hover:text-gray-700 p-1 transition-colors"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
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
            label="Base URL"
            description={
              meta?.requiresBaseUrl
                ? "Required for this provider type."
                : "Override the built-in endpoint. Leave empty to use the default."
            }
          >
            <TextField
              value={provider.baseUrl ?? ""}
              onChange={(v) => update({ baseUrl: v || undefined })}
            >
              <Input className="w-52" placeholder={meta?.baseUrlExample ?? "https://…"} />
            </TextField>
          </SettingRow>

          <SettingRow label="Model" description="The model identifier to route requests to.">
            <TextField value={provider.model} onChange={(v) => update({ model: v })}>
              <Input className="w-44" placeholder={meta?.modelExample ?? "model-id"} />
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
          Advanced
        </button>

        {showAdvanced && (
          <div className="mt-1 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white px-4">
            <SettingRow
              label="Default Provider"
              description="Mark this provider as the default for all gateway requests."
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
              label="Passthrough Auth"
              description="Forward the client's Authorization header directly to the upstream."
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
    <div className="flex h-full">
      <ProviderSidebar />
      <ProviderPanel />
    </div>
  );
}

export default ProviderPage;
