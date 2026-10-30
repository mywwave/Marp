import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@marp/client-runtime/environment";
import { formatSubagentDisplayTitle } from "@marp/client-runtime/state/subagent-display";
import {
  subagentCardState,
  subagentCurrentStep,
  subagentStatusLabel,
  type SubagentCardState,
} from "@marp/client-runtime/work-log/live-cards";
import type { EnvironmentId, OrchestrationV2TurnItem, ThreadId } from "@marp/contracts";
import { formatModelSlugName } from "@marp/shared/model";
import * as DateTime from "effect/DateTime";
import { CheckIcon, HourglassIcon, XIcon } from "lucide-react";
import { use, useEffect, useState } from "react";

import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";
import { useQuietThreadShell } from "../../state/entities";
import { environmentThreadDetails, threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { toastManager } from "../ui/toast";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { AgentElapsed } from "./AgentElapsed";
import { SubagentPreviewContext } from "./subagentPreviewContext";
import { ActivityShimmerOverlay } from "./TimelineRowParts";

type SubagentItem = Extract<OrchestrationV2TurnItem, { readonly type: "subagent" }>;

/** Fast steps would flicker past unread; each label stays at least this long. */
const STEP_MIN_HOLD_MS = 700;

/** `value`, but each shown value is held for `minHoldMs` before the next one replaces it. */
function useHeldValue<T>(value: T, minHoldMs = STEP_MIN_HOLD_MS): T {
  const [shown, setShown] = useState(value);
  const [holding, setHolding] = useState(true);
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- ends the shown value's hold once its time has passed
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setHolding(false), minHoldMs);
    return () => clearTimeout(timer);
  }, [holding, minHoldMs]);
  if (!holding && !Object.is(value, shown)) {
    setShown(value);
    setHolding(true);
  }
  return shown;
}

/** The status text: held between swaps, faded in on change, swept while live. */
export function SubagentStatusText({
  label,
  shimmer,
  failed = false,
}: {
  label: string;
  shimmer: boolean;
  failed?: boolean;
}) {
  const shown = useHeldValue(label);
  return (
    <span
      key={shown}
      ref={shimmer ? observeVisibleAnimation : undefined}
      data-subagent-status-text
      className={cn(
        "relative min-w-0 max-w-1/2 shrink-0 overflow-hidden truncate transition-opacity duration-fast ease-out starting:opacity-0 motion-reduce:transition-none",
        failed ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {shown}
      {shimmer ? <ActivityShimmerOverlay>{shown}</ActivityShimmerOverlay> : null}
    </span>
  );
}

function SubagentIndicator({ state }: { state: SubagentCardState }) {
  return (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
      {state === "running" ? (
        <span className="flex text-info-foreground">
          <Spinner size="sm" />
        </span>
      ) : state === "waiting" ? (
        <HourglassIcon className="size-3.5 text-icon-muted" />
      ) : state === "done" ? (
        <CheckIcon className="size-3.5 text-icon-muted" />
      ) : state === "failed" ? (
        <XIcon className="size-3.5 text-destructive" />
      ) : (
        <span className="size-1.5 rounded-full bg-muted-foreground" />
      )}
    </span>
  );
}

function isoOrNull(value: DateTime.Utc | null): string | null {
  return value === null ? null : DateTime.formatIso(value);
}

/**
 * One subagent on one line: state, title, model, its current step, and time. The step comes from
 * the provider's progress line or the child's shell, which every client already holds; the
 * child's timeline loads only while its preview is open.
 */
export function SubagentTaskRow({
  item,
  environmentId,
  onOpenThread,
}: {
  item: SubagentItem;
  environmentId: EnvironmentId;
  onOpenThread: (threadId: ThreadId) => void;
}) {
  const openPreview = use(SubagentPreviewContext);
  const parentRef = scopeThreadRef(environmentId, item.threadId);
  const agent = useAtomValue(
    environmentThreadDetails.threadAtom(parentRef),
    (thread) => thread?.projection.subagents.find((agent) => agent.id === item.subagentId) ?? null,
  );
  const interruptTurn = useAtomCommand(threadEnvironment.interruptTurn);
  const [stopping, setStopping] = useState(false);
  const status = agent?.status ?? item.status;
  const state = subagentCardState(status);
  const title = formatSubagentDisplayTitle(agent?.title ?? item.title ?? "Subagent");
  const childThreadId = agent?.childThreadId ?? item.childThreadId;
  const child = useQuietThreadShell(
    childThreadId === null ? null : scopeThreadRef(environmentId, childThreadId),
  );
  const live = state === "running" || state === "waiting";
  const step = subagentCurrentStep({
    status,
    progress: agent?.progress ?? item.progress,
    child: child?.source,
  });
  const label = subagentStatusLabel(state, step, childThreadId !== null);
  const timing = {
    status,
    startedAt: isoOrNull(agent?.startedAt ?? item.startedAt),
    completedAt: isoOrNull(agent?.completedAt ?? item.completedAt),
  };
  const model = agent?.model ?? null;
  const open = () => {
    if (childThreadId === null) return;
    if (openPreview === null) {
      onOpenThread(childThreadId);
      return;
    }
    openPreview({
      environmentId,
      parentThreadId: item.threadId,
      subagentId: item.subagentId,
      childThreadId,
      title,
    });
  };
  const stop = async () => {
    if (stopping) return;
    setStopping(true);
    const result = await interruptTurn({
      environmentId,
      input: { threadId: item.threadId, subagentId: item.subagentId },
    });
    setStopping(false);
    if (result._tag === "Failure") {
      toastManager.add({ type: "error", title: "Could not stop subagent" });
    }
  };

  return (
    <div
      data-subagent-task-nested-row={state}
      data-v2-item-type="subagent"
      className="group/subagent-row relative flex min-w-0 items-center rounded-sm transition-colors hover:bg-muted"
    >
      <button
        type="button"
        disabled={childThreadId === null}
        aria-haspopup="dialog"
        aria-label={`Preview ${title}`}
        onClick={open}
        className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70 disabled:cursor-default"
      >
        <SubagentIndicator state={state} />
        <span className="min-w-0 truncate text-foreground">{title}</span>
        {model === null ? null : (
          <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground">
            {formatModelSlugName(model)}
          </span>
        )}
        <SubagentStatusText
          label={label}
          shimmer={state === "running"}
          failed={state === "failed"}
        />
        <span className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums">
          <AgentElapsed agent={timing} />
        </span>
      </button>
      {/* Over the time on hover or focus; beside it on touch, where nothing hovers. */}
      <div
        data-subagent-task-actions
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 rounded-sm bg-muted px-1 opacity-0 transition-opacity group-hover/subagent-row:pointer-events-auto group-hover/subagent-row:opacity-100 group-focus-within/subagent-row:pointer-events-auto group-focus-within/subagent-row:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:static pointer-coarse:bg-transparent pointer-coarse:opacity-100"
      >
        {childThreadId === null ? null : (
          <Button size="xs" variant="ghost-muted" onClick={() => onOpenThread(childThreadId)}>
            Open
          </Button>
        )}
        {live ? (
          <Button size="xs" variant="ghost-muted" disabled={stopping} onClick={() => void stop()}>
            {stopping ? "Stopping..." : "Stop"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
