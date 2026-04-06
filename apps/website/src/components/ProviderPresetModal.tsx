import { Button, Chip, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { PROVIDER_PRESETS } from "./config/data";
import type { ProviderPreset } from "./config/types";
import type { UIProvider } from "../stores/types";
import { generateUUID } from "../stores/types";

interface ProviderPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (provider: UIProvider) => void;
  onSelectCustom: () => void;
  providerCount: number;
}

function PresetCard({ preset, onSelect }: { preset: ProviderPreset; onSelect: () => void }) {
  const { t } = useTranslation("provider");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-2 p-4 rounded-xl bg-surface border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{preset.label}</span>
        <Chip size="sm" variant="secondary">
          {preset.providerInterface}
        </Chip>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{preset.description}</p>
      <p className="text-xs text-gray-400 mt-1">
        {t("preset.modelExample")}: <span className="font-mono">{preset.modelExample}</span>
      </p>
    </button>
  );
}

export function ProviderPresetModal({
  isOpen,
  onClose,
  onSelectPreset,
  onSelectCustom,
  providerCount,
}: ProviderPresetModalProps) {
  const { t } = useTranslation("provider");

  const handleSelectPreset = (preset: ProviderPreset) => {
    const newProvider: UIProvider = {
      id: generateUUID(),
      name: `${preset.label} ${providerCount + 1}`,
      providerInterface: preset.providerInterface,
      baseUrl: preset.baseUrl,
      models: [preset.modelExample],
      defaultModel: providerCount === 0 ? 0 : undefined,
    };
    onSelectPreset(newProvider);
    onClose();
  };

  const handleSelectCustom = () => {
    onSelectCustom();
    onClose();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container placement="center">
        <Modal.Dialog className="sm:max-w-[480px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{t("preset.title")}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PROVIDER_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.label}
                  preset={preset}
                  onSelect={() => handleSelectPreset(preset)}
                />
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onPress={handleSelectCustom}>
              {t("preset.skip")}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
