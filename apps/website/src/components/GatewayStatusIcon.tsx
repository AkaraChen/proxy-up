import { useStatus } from "../api/hooks";
import { useProxyUIStore } from "../stores";
import { useTranslation } from "react-i18next";

export function GatewayStatusIcon() {
  const { t } = useTranslation("gateway");
  // Poll status every 3 seconds
  const { data: status } = useStatus({ refetchInterval: 3000 });
  const { isStarting } = useProxyUIStore();

  // Determine status
  const isRunning = status?.running ?? false;
  const statusColor = isRunning ? "bg-green-500" : "bg-red-500";
  const statusText = isStarting
    ? t("status.starting")
    : isRunning
      ? t("status.running")
      : t("status.stopped");

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${statusColor} ${isStarting ? "animate-pulse" : ""}`}
          aria-label={statusText}
        />
        <span className="text-xs text-gray-600">{statusText}</span>
      </div>
    </div>
  );
}
