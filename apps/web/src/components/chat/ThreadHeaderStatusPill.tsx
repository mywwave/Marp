import {
  CheckIcon,
  CircleAlertIcon,
  HandIcon,
  ListChecksIcon,
  MessageCircleQuestionIcon,
} from "lucide-react";

import { tickTextContent } from "~/lib/tickTextContent";
import { Badge } from "../ui/badge";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { ThreadHeaderStatus } from "./threadHeaderStatus";
import { formatWorkingTimerNow } from "./TimelineWorkGroupRows.logic";

const BADGE_VARIANT = {
  working: "info",
  "needs-you": "warning",
  failed: "error",
  done: "success",
} as const;

function StatusIcon({ status }: { status: ThreadHeaderStatus }) {
  switch (status.label) {
    case "Working":
      return <Spinner size="xs" />;
    case "Approval needed":
      return <HandIcon aria-hidden />;
    case "Question":
      return <MessageCircleQuestionIcon aria-hidden />;
    case "Plan ready":
      return <ListChecksIcon aria-hidden />;
    case "Failed":
      return <CircleAlertIcon aria-hidden />;
    case "Done":
      return <CheckIcon aria-hidden />;
  }
}

export function ThreadHeaderStatusPill({
  status,
  liveStatus,
}: {
  status: ThreadHeaderStatus;
  /** The agent's latest status update, shown on hover while it works. */
  liveStatus?: { readonly summary: string; readonly next?: string | undefined } | null;
}) {
  const startedAt = status.family === "working" ? status.startedAt : null;
  const pill = (
    <Badge variant={BADGE_VARIANT[status.family]} data-thread-header-status={status.family}>
      {/* Keyed so a status change remounts the icon and replays its one-shot entry. */}
      <span
        key={status.label}
        className="inline-flex transition-[scale,opacity] duration-enter ease-spring starting:scale-60 starting:opacity-0 motion-reduce:transition-none"
      >
        <StatusIcon status={status} />
      </span>
      {status.label}
      {startedAt ? (
        <>
          <span aria-hidden>·</span>
          <span
            className="min-w-[4ch] tabular-nums"
            ref={tickTextContent(() => formatWorkingTimerNow(startedAt), true)}
          />
        </>
      ) : null}
    </Badge>
  );
  if (status.family !== "working" || !liveStatus) return pill;
  return (
    <Tooltip>
      <TooltipTrigger render={pill} />
      <TooltipPopup side="bottom" className="max-w-80">
        <span className="block">{liveStatus.summary}</span>
        {liveStatus.next ? (
          <span className="block text-muted-foreground">Next: {liveStatus.next}</span>
        ) : null}
      </TooltipPopup>
    </Tooltip>
  );
}
