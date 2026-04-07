import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import type { ProviderPreset } from "./config/types";
import type { UIProvider } from "../stores/types";
import { generateUUID } from "../stores/types";
import { useProviderRegistry } from "../api/registry";

interface ProviderPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (provider: UIProvider) => void;
  onSelectCustom: () => void;
}

function PresetCard({ preset, onSelect }: { preset: ProviderPreset; onSelect: () => void }) {
  const { t } = useTranslation("provider");
  const modelCount = preset.models.length;
  const firstModel = preset.models[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="px-4 py-3 rounded-lg bg-surface border border-gray-100 hover:border-gray-200 hover:bg-surface-secondary transition-all text-left"
    >
      <span className="block text-sm font-medium text-gray-900">{preset.label}</span>
      <span className="block mt-1 text-xs text-gray-500 truncate">
        {modelCount === 0
          ? t("item.noModel")
          : modelCount === 1
            ? firstModel
            : `${modelCount} models · ${firstModel}`}
      </span>
    </button>
  );
}

export function ProviderPresetModal({
  isOpen,
  onClose,
  onSelectPreset,
  onSelectCustom,
}: ProviderPresetModalProps) {
  const { t } = useTranslation("provider");
  const { data: presets = [] } = useProviderRegistry();

  const handleSelectPreset = (preset: ProviderPreset) => {
    const newProvider: UIProvider = {
      id: generateUUID(),
      name: `${preset.label}`,
      providerInterface: preset.providerInterface,
      baseUrl: preset.baseUrl,
      models: preset.models.length > 0 ? [...preset.models] : [""],
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
            <div className="flex flex-col gap-3">
              {presets.map((preset) => (
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
