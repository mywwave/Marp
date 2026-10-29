import { type ReactNode, useEffectEvent, useLayoutEffect, useState } from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { cn } from "~/lib/utils";
import { type TimestampFormat } from "@marp/contracts/settings";
import { formatChatTimestampTooltip, formatDayAwareTimestamp } from "../../timestampFormat";

export const MESSAGE_HEADING_LEVEL = 3;

export function MessageAuthorHeading({ children }: { children: string }) {
  return <h3 className="sr-only select-none">{children}</h3>;
}

export function TimelineRowTimestamp({
  createdAt,
  timestampFormat,
  className,
  alwaysVisible = false,
}: {
  createdAt: string;
  timestampFormat: TimestampFormat;
  className?: string;
  alwaysVisible?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              // Stays in flow so revealing it never re-truncates the label or moves the chevron.
              "me-1 shrink-0 whitespace-nowrap rounded-md text-muted-foreground text-xs tabular-nums",
              alwaysVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0 transition-opacity duration-100 group-hover/timeline-row:pointer-events-auto group-hover/timeline-row:opacity-100 group-hover/timeline-row:duration-150 group-focus-within/timeline-row:pointer-events-auto group-focus-within/timeline-row:opacity-100 group-focus-within/timeline-row:duration-150",
              className,
            )}
          />
        }
      >
        {formatDayAwareTimestamp(createdAt, timestampFormat)}
      </TooltipTrigger>
      <TooltipPopup>{formatChatTimestampTooltip(createdAt, timestampFormat)}</TooltipPopup>
    </Tooltip>
  );
}

export function ActivityShimmerOverlay({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="live-activity-focus pointer-events-none absolute inset-y-0 select-none"
    >
      <span className="live-activity-focus-counter block">
        <span className="live-activity-focus-aligned block text-foreground">{children}</span>
      </span>
    </span>
  );
}

/** True once a spinner this mount showed gave way to the finished icon. */
export function useSpinnerFinished(spinning: boolean): boolean {
  const [spun, setSpun] = useState(spinning);
  if (spinning && !spun) setSpun(true);
  return spun && !spinning;
}

/**
 * True once an approval card this mount showed resolved into its compact row. `onResolved` runs
 * then, before paint, so the timeline anchors the reader while the card shrinks.
 */
export function useApprovalResolved(pending: boolean, onResolved: (() => void) | undefined) {
  const [phase, setPhase] = useState<"none" | "pending" | "resolved">(pending ? "pending" : "none");
  if (pending && phase !== "pending") setPhase("pending");
  else if (!pending && phase === "pending") setPhase("resolved");
  const notifyResolved = useEffectEvent(() => onResolved?.());
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- pins the timeline's scroll anchor in the commit that shrinks the card, before LegendList measures it
  useLayoutEffect(() => {
    if (phase === "resolved") notifyResolved();
  }, [phase]);
  return phase === "resolved";
}
