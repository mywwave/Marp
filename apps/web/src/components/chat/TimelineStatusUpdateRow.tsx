import { MilestoneIcon } from "lucide-react";

import type { TimelineRow } from "./timelineRowContext";

/** The agent's progress note: the summary, then its next step, muted and clamped to two lines. */
export function TimelineStatusUpdateRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "status-update" }>;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 px-1 py-0.5 text-xs text-muted-foreground">
      <MilestoneIcon aria-hidden className="mt-0.5 size-3 shrink-0" />
      <p className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]">
        <span className="text-foreground/80">{row.status.summary}</span>
        {row.status.next ? <span className="opacity-80"> · Next: {row.status.next}</span> : null}
      </p>
    </div>
  );
}
