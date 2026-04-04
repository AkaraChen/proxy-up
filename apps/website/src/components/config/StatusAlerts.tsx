import { InlineAlert } from "./shared";

export function StatusAlerts({
  error,
  hasGeneratedConfig,
  issueCount,
}: {
  error: string | null;
  hasGeneratedConfig: boolean;
  issueCount: number;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {issueCount > 0 ? (
        <InlineAlert
          description="Provider uniqueness, missing base URLs, and port collisions are surfaced immediately so invalid combinations stand out before you run the gateway."
          status="warning"
          title={`${issueCount} validation issue${issueCount === 1 ? "" : "s"} need attention`}
        />
      ) : (
        <InlineAlert
          description="The current form state passes the UI-level validation rules."
          status="success"
          title="Configuration shape looks good"
        />
      )}

      {error ? (
        <InlineAlert description={error} status="danger" title="Generated config preview failed" />
      ) : hasGeneratedConfig ? (
        <InlineAlert
          description="Envoy, Plano, normalized providers, and service URLs are all generated from the same deferred config snapshot shown below."
          status="accent"
          title="Preview is live"
        />
      ) : (
        <InlineAlert
          description="Add at least one valid provider to unlock the generated runtime preview."
          status="accent"
          title="Preview is waiting for a provider"
        />
      )}
    </div>
  );
}
