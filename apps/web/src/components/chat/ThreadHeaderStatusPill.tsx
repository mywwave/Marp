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

export function ThreadHeaderStatusPill({ status }: { status: ThreadHeaderStatus }) {
  const startedAt = status.family === "working" ? status.startedAt : null;
  return (
    <Badge variant={BADGE_VARIANT[status.family]} data-thread-header-status={status.family}>
      <StatusIcon status={status} />
      {status.label}
      {startedAt ? (
        <>
          <span aria-hidden>·</span>
          <span
            className="tabular-nums"
            ref={tickTextContent(() => formatWorkingTimerNow(startedAt), true)}
          />
        </>
      ) : null}
    </Badge>
  );
}
