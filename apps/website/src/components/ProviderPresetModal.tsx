import { Button, Modal } from "@heroui/react";
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className="px-4 py-3 rounded-lg bg-surface border border-gray-100 hover:border-gray-200 hover:bg-surface-secondary transition-all text-left"
    >
      <span className="text-sm font-medium text-gray-900">{preset.label}</span>
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
