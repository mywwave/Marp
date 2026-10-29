import { useNavigate } from "@tanstack/react-router";
import { resolveEnvironmentMachineKind } from "@marp/contracts";
import {
  ChevronRightIcon,
  CircleCheckIcon,
  DownloadIcon,
  PlugIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import {
  useEnvironmentProviders,
  useEnvironments,
  usePrimaryEnvironmentId,
} from "../../state/environments";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { Button } from "../ui/button";
import { SettingsPageContainer } from "./settingsLayout";
import {
  buildSettingsOverview,
  type OverviewAttentionItem,
  type OverviewProviderLine,
} from "./settingsOverview.logic";
import type { SettingsPath } from "./settingsSearch";

const TONE_DOT: Record<OverviewProviderLine["tone"], string> = {
  ready: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  off: "bg-muted-foreground/50",
};

function AttentionIcon({ item }: { item: OverviewAttentionItem }) {
  const className = cn(
    "mt-0.5 size-4 shrink-0",
    item.tone === "danger"
      ? "text-destructive"
      : item.tone === "warning"
        ? "text-warning"
        : "text-info",
  );
  if (item.kind === "provider-update") return <DownloadIcon aria-hidden className={className} />;
  if (item.kind === "provider-signed-out") return <PlugIcon aria-hidden className={className} />;
  return <TriangleAlertIcon aria-hidden className={className} />;
}

function OverviewCard({
  title,
  to,
  linkLabel,
  children,
}: {
  title: string;
  to: SettingsPath;
  linkLabel: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-base text-foreground">{title}</h2>
        <Button
          size="xs"
          variant="ghost-muted"
          className="ms-auto"
          onClick={() => void navigate({ to, replace: true })}
        >
          {linkLabel}
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function OverviewLine({
  icon,
  label,
  meta,
}: {
  icon?: ReactNode;
  label: ReactNode;
  meta: ReactNode;
}) {
  return (
    <div className="flex min-h-8 min-w-0 items-center gap-2 text-sm">
      {icon}
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
        {meta}
      </span>
    </div>
  );
}

/** The settings landing page: what needs attention, then a summary per area. */
export function SettingsOverviewPanel() {
  const navigate = useNavigate();
  const { environments } = useEnvironments();
  const providersByEnvironment = useEnvironmentProviders();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const overview = buildSettingsOverview({
    environments: environments.map((environment) => ({
      environmentId: environment.environmentId,
      label: environment.label,
      phase: environment.connection.phase,
    })),
    providersByEnvironment,
    primaryEnvironmentId,
  });
  const activeProviders = overview.providers.filter((line) => line.enabled);
  const disabledProviderCount = overview.providers.length - activeProviders.length;
  const machineKindById = new Map(
    environments.map((environment) => [
      environment.environmentId,
      resolveEnvironmentMachineKind(environment.serverConfig),
    ]),
  );
  const openTarget = (item: OverviewAttentionItem) => {
    if (item.kind === "machine-offline") {
      void navigate({ to: "/settings/connections", replace: true });
      return;
    }
    void navigate({
      to: "/settings/providers",
      search: { machine: item.environmentId },
      replace: true,
    });
  };

  return (
    <SettingsPageContainer width="wide">
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <h2 className="font-semibold text-base text-foreground">Needs attention</h2>
          {overview.attention.length > 0 ? (
            <span className="text-muted-foreground text-sm">{overview.attention.length}</span>
          ) : null}
        </div>
        {overview.attention.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm">
            <CircleCheckIcon aria-hidden className="size-4 shrink-0 text-success" />
            <span className="font-medium text-foreground">All set.</span>
            <span className="text-muted-foreground">Every machine and provider is working.</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {overview.attention.map((item) => (
              <li
                key={item.key}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-4 py-3 text-sm",
                  item.tone === "danger"
                    ? "bg-error-surface"
                    : item.tone === "warning"
                      ? "bg-warning-surface"
                      : "bg-muted",
                )}
              >
                <AttentionIcon item={item} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-muted-foreground">{item.detail}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openTarget(item)}>
                  {item.kind === "machine-offline"
                    ? "Open machines"
                    : item.kind === "provider-update"
                      ? "Update"
                      : item.kind === "provider-signed-out"
                        ? "Sign in"
                        : "Open providers"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <OverviewCard title="Agents" to="/settings/providers" linkLabel="Providers">
          {activeProviders.length === 0 ? (
            <p className="py-1 text-muted-foreground text-sm">No providers turned on yet.</p>
          ) : (
            activeProviders.map((line) => (
              <OverviewLine
                key={line.key}
                icon={
                  <ProviderInstanceIcon
                    driverKind={line.driver}
                    displayName={line.name}
                    size="compact"
                  />
                }
                label={line.name}
                meta={
                  <>
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", TONE_DOT[line.tone])}
                    />
                    {line.detail}
                  </>
                }
              />
            ))
          )}
          {disabledProviderCount > 0 ? (
            <OverviewLine
              label={<span className="text-muted-foreground">Turned off</span>}
              meta={`${disabledProviderCount} ${disabledProviderCount === 1 ? "provider" : "providers"}`}
            />
          ) : null}
        </OverviewCard>
        <OverviewCard title="Machines" to="/settings/connections" linkLabel="Machines">
          {overview.machines.map((machine) => (
            <OverviewLine
              key={machine.environmentId}
              icon={
                <EnvironmentMachineIcon
                  kind={machineKindById.get(machine.environmentId) ?? "server"}
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
              }
              label={machine.label}
              meta={
                <>
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      machine.phase === "connected" ? "bg-success" : "bg-destructive",
                    )}
                  />
                  {machine.isPrimary
                    ? "This device"
                    : machine.phase === "connected"
                      ? "Online"
                      : "Offline"}
                </>
              }
            />
          ))}
        </OverviewCard>
        <OverviewCard title="Jump to" to="/settings/general" linkLabel="General">
          {(
            [
              ["/settings/providers", "Add a provider"],
              ["/settings/threads", "Default model for new threads"],
              ["/settings/keybindings", "Keybindings"],
              ["/settings/access", "Pair a device"],
              ["/settings/archived", "Archived threads"],
            ] as const
          ).map(([to, label]) => (
            <OverviewLine
              key={to}
              label={
                <button
                  type="button"
                  className="cursor-pointer text-start hover:underline"
                  onClick={() => void navigate({ to, replace: true })}
                >
                  {label}
                </button>
              }
              meta={<ChevronRightIcon aria-hidden className="size-3.5" />}
            />
          ))}
        </OverviewCard>
      </div>
    </SettingsPageContainer>
  );
}
