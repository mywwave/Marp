import { useAtomValue } from "@effect/atom-react";
import type { EnvironmentConnectionSummary } from "@marp/client-runtime/state/presentation";
import type { EnvironmentId } from "@marp/contracts";
import { useNavigate } from "@tanstack/react-router";
import { memo } from "react";

import { environmentCatalog } from "../../connection/catalog";
import { observeVisibleAnimation } from "../../lib/visibleAnimation";
import { environmentSummaries } from "../../state/presentation";
import { usePrimaryEnvironmentId, useEnvironmentMachines } from "../../state/environments";
import { useAtomCommand } from "../../state/use-atom-command";
import { cn } from "~/lib/utils";
import { ActivityShimmerOverlay } from "../chat/TimelineRowParts";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { InlineButton } from "../ui/button";
import { useSidebar } from "../ui/sidebar";

const EMPTY_ENVIRONMENT_IDS: ReadonlySet<EnvironmentId> = new Set();

// The first attempt is "connecting"; only a lost or failing connection reads as offline.
function isOffline(environment: EnvironmentConnectionSummary): boolean {
  return (
    environment.isEnabled &&
    (environment.connectionState === "reconnecting" ||
      environment.connectionState === "offline" ||
      environment.connectionState === "error")
  );
}

/** Enabled environments whose connection is lost, for dimming their rows and projects. */
export function useOfflineEnvironmentIds(): ReadonlySet<EnvironmentId> {
  const environments = useAtomValue(environmentSummaries.environmentsAtom);
  const offline = environments.filter(isOffline);
  return offline.length === 0
    ? EMPTY_ENVIRONMENT_IDS
    : new Set(offline.map((environment) => environment.environmentId));
}

/** Under an offline project's header: the reconnect is real work, so its label shimmers. */
export const SidebarReconnectingRow = memo(function SidebarReconnectingRow(props: {
  environmentId: EnvironmentId;
  label: string | null;
}) {
  const retryNow = useAtomCommand(environmentCatalog.retryNow, { reportFailure: false });
  const text = props.label ? `Reconnecting to ${props.label}…` : "Reconnecting…";
  return (
    <li className="flex h-7 list-none items-center gap-2 ps-9 pe-3 text-xs text-muted-foreground">
      <span ref={observeVisibleAnimation} role="status" className="relative min-w-0 truncate">
        {text}
        <ActivityShimmerOverlay>{text}</ActivityShimmerOverlay>
      </span>
      <InlineButton tone="muted" onClick={() => void retryNow(props.environmentId)}>
        Retry now
      </InlineButton>
    </li>
  );
});

/** The bottom card: which machine this is, and whether every machine is reachable. */
export const SidebarMachineCard = memo(function SidebarMachineCard() {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const environments = useAtomValue(environmentSummaries.environmentsAtom);
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const machineById = useEnvironmentMachines();
  const enabled = environments.filter((environment) => environment.isEnabled);
  const primary =
    environments.find((environment) => environment.environmentId === primaryEnvironmentId) ??
    enabled[0];
  if (primary === undefined) return null;
  const offlineCount = enabled.filter(isOffline).length;
  const subtitle =
    offlineCount > 0
      ? `${offlineCount} ${offlineCount === 1 ? "machine" : "machines"} offline`
      : enabled.length > 1
        ? `This device · ${enabled.length} machines`
        : "This device";
  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
    void navigate({ to: "/settings/connections" });
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${primary.environmentLabel}, ${subtitle}. Open connections`}
      className="flex h-14 w-full shrink-0 cursor-pointer items-center gap-2 rounded-md bg-muted px-3 text-left outline-none transition-colors duration-150 hover:bg-sidebar-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
    >
      <EnvironmentMachineIcon
        aria-hidden
        kind={machineById.get(primary.environmentId) ?? "server"}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {primary.environmentLabel}
        </span>
        <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          offlineCount > 0 ? "bg-warning" : "bg-success",
        )}
      />
    </button>
  );
});
