import { Button, toast } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { PlayIcon, StopIcon, ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import {
  useStatus,
  useStartGateway,
  useStopGateway,
  useRestartGateway,
  useUpdateConfig,
} from "../api/hooks";
import { useProxyConfigStore, useProxyUIStore } from "../stores";

function getErrorMessage(error: unknown, defaultMessage: string): string {
  return error instanceof Error ? error.message : defaultMessage;
}

export function GatewayControls() {
  const { t } = useTranslation("gateway");
  const { data: status } = useStatus();

  const { config, getProvidersOptions } = useProxyConfigStore();
  const { isStarting, setStarting, setError } = useProxyUIStore();

  const startMutation = useStartGateway();
  const stopMutation = useStopGateway();
  const restartMutation = useRestartGateway();
  const saveMutation = useUpdateConfig();

  const isRunning = status?.running ?? false;
  const isProcessing =
    isStarting ||
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    saveMutation.isPending;

  const handleStart = async () => {
    try {
      setStarting(true);
      setError(null);
      await startMutation.mutateAsync();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to start gateway"));
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      setError(null);
      await stopMutation.mutateAsync();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to stop gateway"));
    }
  };

  const handleRestart = async () => {
    try {
      setStarting(true);
      setError(null);
      await restartMutation.mutateAsync();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to restart gateway"));
    } finally {
      setStarting(false);
    }
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Convert UI config to server config format
      const serverConfig = {
        providers: getProvidersOptions(),
        ports: config.ports,
        gatewayHost: config.gatewayHost,
        logLevel: config.logLevel,
        modelAliases: config.modelAliases,
        artifacts: config.artifacts,
        cleanupOnStop: config.cleanupOnStop,
        workDir: config.workDir,
      };

      await saveMutation.mutateAsync(serverConfig);
      toast.success(t("controls.saveSuccess"));
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save config");
      setError(message);
      toast.danger(message);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save button - always visible */}
      <Button variant="ghost" size="sm" isDisabled={saveMutation.isPending} onPress={handleSave}>
        <CheckIcon className="size-4" aria-hidden="true" />
        {t("controls.save")}
      </Button>

      {/* Control buttons based on state */}
      {!isRunning ? (
        <Button variant="primary" size="sm" isDisabled={isProcessing} onPress={handleStart}>
          <PlayIcon className="size-4" aria-hidden="true" />
          {t("controls.start")}
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" isDisabled={isProcessing} onPress={handleStop}>
            <StopIcon className="size-4" aria-hidden="true" />
            {t("controls.stop")}
          </Button>
          <Button variant="ghost" size="sm" isDisabled={isProcessing} onPress={handleRestart}>
            <ArrowPathIcon className="size-4" aria-hidden="true" />
            {t("controls.restart")}
          </Button>
        </>
      )}
    </div>
  );
}
