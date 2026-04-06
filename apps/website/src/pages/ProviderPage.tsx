import { useState } from "react";
import {
  Input,
  ListBox,
  ListBoxItem,
  Select,
  Switch,
  TextField,
  useOverlayState,
} from "@heroui/react";
import type { Key } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { useProxyConfigStore, useProxyUIStore } from "../stores";
import { PROVIDER_LIBRARY } from "../components/config/data";
import { ProviderPresetModal } from "../components/ProviderPresetModal";
import type { ProxyProviderInterface } from "@proxy-up/proxy/browser";
import type { UIProvider } from "../stores/types";
import { generateUUID } from "../stores/types";
import { SectionHeading, SettingsContainer, SettingRow } from "../components/common";

function ProviderItem({
  provider,
  isSelected,
  onSelect,
  onRemove,
}: {
  provider: UIProvider;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("provider");

  const modelCount = provider.models.length;
  const firstModel = provider.models[0];

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
        <p className="text-sm font-medium truncate">{provider.name || t("item.unnamed")}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {modelCount === 0
            ? t("item.noModel")
            : modelCount === 1
              ? `1 model · ${firstModel}`
              : `${modelCount} models`}
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
  const { selectedProviderId, setSelectedProvider } = useProxyUIStore();
  const presetModalState = useOverlayState();

  const handleAddPreset = (provider: UIProvider) => {
    addProvider(provider);
    setSelectedProvider(provider.id);
  };

  const handleAddCustom = () => {
    const newIndex = config.providers.length;
    const newProvider: UIProvider = {
      id: generateUUID(),
      name: t("newProvider", { index: newIndex + 1, defaultValue: `Provider ${newIndex + 1}` }),
      models: [""],
    };
    addProvider(newProvider);
    setSelectedProvider(newProvider.id);
  };

  const handleRemove = (providerId: string) => {
    const index = config.providers.findIndex((p) => p.id === providerId);
    removeProvider(providerId);

    // 自动调整选中状态
    if (selectedProviderId === providerId) {
      const remaining = config.providers.filter((p) => p.id !== providerId);
      if (remaining.length > 0) {
        // 选中同一个索引位置的 provider（或前一个）
        const newIndex = Math.min(index, remaining.length - 1);
        setSelectedProvider(remaining[newIndex].id);
      } else {
        setSelectedProvider(null);
      }
    }
  };

  return (
    <>
      <aside className="w-64 shrink-0 bg-secondary flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {t("sidebar.heading")}
          </span>
          <button
            type="button"
            onClick={() => presetModalState.open()}
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
            config.providers.map((provider) => (
              <ProviderItem
                key={provider.id}
                provider={provider}
                isSelected={selectedProviderId === provider.id}
                onSelect={() => setSelectedProvider(provider.id)}
                onRemove={() => handleRemove(provider.id)}
              />
            ))
          )}
        </div>
      </aside>
      <ProviderPresetModal
        isOpen={presetModalState.isOpen}
        onClose={() => presetModalState.close()}
        onSelectPreset={handleAddPreset}
        onSelectCustom={handleAddCustom}
        providerCount={config.providers.length}
      />
    </>
  );
}

function ModelList({ provider }: { provider: UIProvider }) {
  const { t } = useTranslation("provider");
  const { addModel, removeModel, updateModel } = useProxyConfigStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddModel = () => {
    addModel(provider.id, "");
    // 自动进入编辑状态
    const newIndex = provider.models.length;
    setEditingIndex(newIndex);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {t("models.heading")}
        </h3>
        <button
          type="button"
          onClick={handleAddModel}
          className="text-gray-500 hover:text-gray-900 hover:bg-surface-tertiary rounded p-1 transition-colors flex items-center gap-1"
          aria-label={t("aria.addModel")}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          <span className="text-xs">{t("models.add")}</span>
        </button>
      </div>

      <div className="bg-surface rounded-lg border border-gray-100">
        {provider.models.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">{t("models.empty")}</p>
        ) : (
          provider.models.map((model, index) => {
            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-b-0"
              >
                {/* Model input or display */}
                {isEditing ? (
                  <TextField
                    value={model}
                    onChange={(v) => updateModel(provider.id, index, v)}
                    onBlur={() => setEditingIndex(null)}
                  >
                    <Input
                      variant="secondary"
                      className="flex-1"
                      placeholder={t("models.placeholder")}
                      autoFocus
                    />
                  </TextField>
                ) : (
                  <span className="flex-1 text-sm text-gray-900 truncate">
                    {model || t("models.emptyModel")}
                  </span>
                )}

                {/* Edit and delete buttons */}
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditingIndex(index)}
                      className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                      aria-label={t("aria.editModel")}
                    >
                      <PencilIcon className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeModel(provider.id, index)}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                    aria-label={t("aria.removeModel")}
                  >
                    <TrashIcon className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProviderPanel() {
  const { t } = useTranslation("provider");
  const { config, updateProvider } = useProxyConfigStore();
  const { selectedProviderId } = useProxyUIStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  if (selectedProviderId === null || !config.providers.find((p) => p.id === selectedProviderId)) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-sm">{t("panel.unselected.primary")}</p>
          <p className="text-sm">{t("panel.unselected.secondary")}</p>
        </div>
      </div>
    );
  }

  const provider = config.providers.find((p) => p.id === selectedProviderId);
  if (!provider) {
    // This should never happen due to earlier check, but handle gracefully
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-sm">{t("panel.unselected.primary")}</p>
      </div>
    );
  }

  const update = (patch: Partial<UIProvider>) => {
    updateProvider(provider.id, patch);
  };

  const handleTypeChange = (key: Key | null) => {
    if (key == null) return;
    const providerInterface = key as ProxyProviderInterface;
    const meta = PROVIDER_LIBRARY.find((m) => m.providerInterface === providerInterface);
    update({
      providerInterface,
      // 为所有空 model 自动填充示例值
      models: provider.models.map((m) => m || meta?.modelExample || ""),
      // Only prefill baseUrl when the new type requires it; preserve any existing user value otherwise
      ...(meta?.requiresBaseUrl && !provider.baseUrl ? { baseUrl: meta.baseUrlExample ?? "" } : {}),
    });
  };

  const meta = PROVIDER_LIBRARY.find((m) => m.providerInterface === provider.providerInterface);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 max-w-2xl bg-secondary min-h-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {provider.name || t("item.unnamed")}
        </h1>
        <p className="text-gray-500 text-sm mb-6">{meta?.note ?? t("panel.defaultDescription")}</p>

        <SectionHeading>{t("basic.heading")}</SectionHeading>
        <SettingsContainer>
          <SettingRow label={t("basic.name.label")} description={t("basic.name.description")}>
            <TextField value={provider.name ?? ""} onChange={(v) => update({ name: v })}>
              <Input
                variant="secondary"
                className="w-44"
                placeholder={t("basic.name.placeholder")}
              />
            </TextField>
          </SettingRow>

          <SettingRow label={t("basic.type.label")} description={t("basic.type.description")}>
            <Select
              variant="secondary"
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
                  variant="secondary"
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
                variant="secondary"
                className="w-52"
                placeholder={meta?.baseUrlExample ?? t("basic.baseUrl.placeholder")}
              />
            </TextField>
          </SettingRow>
        </SettingsContainer>

        {/* Models List */}
        <div className="mt-6">
          <ModelList provider={provider} />
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
          <div className="mt-1">
            <SettingsContainer>
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
            </SettingsContainer>
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
