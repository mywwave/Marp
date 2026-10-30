import { useAtomValue } from "@effect/atom-react";
import { scopeThreadRef } from "@marp/client-runtime/environment";
import type { ThreadStructureTurnItem } from "@marp/client-runtime/state/models";
import {
  latestRunTodoList,
  planProgressTitle,
  presentPlanProgress,
  type PlanProgress,
} from "@marp/client-runtime/work-log/live-cards";
import type { OrchestrationV2TurnItem, RunId } from "@marp/contracts";
import { CheckIcon, ChevronUpIcon, CircleIcon, ListTodoIcon, XIcon } from "lucide-react";
import { use, useState } from "react";

import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";
import { environmentThreadDetails } from "../../state/threads";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { ActivityShimmerOverlay } from "./TimelineRowParts";
import { TimelineRowCtx, type TimelineWorkEntry } from "./timelineRowContext";

/** Rows are one fixed line and the list caps at this many, so its height is known up front. */
const STEP_ROW_PX = 24;
const MAX_VISIBLE_STEPS = 7;

function StepIcon({ state }: { state: PlanProgress["steps"][number]["state"] }) {
  switch (state) {
    case "completed":
      return <CheckIcon aria-hidden className="size-3.5 text-success" />;
    case "running":
      return (
        <span className="flex text-info-foreground">
          <Spinner size="sm" />
        </span>
      );
    case "cancelled":
      return <XIcon aria-hidden className="size-3.5 text-icon-muted" />;
    case "pending":
      return <CircleIcon aria-hidden className="size-3 text-icon-muted" />;
  }
}

const STATE_LABELS = {
  completed: "completed",
  running: "in progress",
  cancelled: "cancelled",
  pending: "pending",
} as const;

function StepList({ progress }: { progress: PlanProgress }) {
  return (
    <ol
      aria-label="Plan steps"
      className="overflow-y-auto px-3"
      style={{ maxHeight: STEP_ROW_PX * MAX_VISIBLE_STEPS }}
    >
      {progress.steps.map((step) => (
        <li
          key={step.id}
          className="flex min-w-0 items-center gap-2"
          style={{ height: STEP_ROW_PX }}
          aria-label={`${step.text}, ${STATE_LABELS[step.state]}`}
        >
          <span className="flex size-4 shrink-0 items-center justify-center">
            <StepIcon state={step.state} />
          </span>
          <span
            ref={step.state === "running" ? observeVisibleAnimation : undefined}
            className={cn(
              "relative min-w-0 overflow-hidden truncate text-sm",
              step.state === "completed" || step.state === "pending"
                ? "text-muted-foreground"
                : step.state === "cancelled"
                  ? "text-muted-foreground line-through"
                  : "text-secondary-label",
            )}
          >
            {step.text}
            {step.state === "running" ? (
              <ActivityShimmerOverlay>{step.text}</ActivityShimmerOverlay>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * One card for a run's todo list. Docked above the composer it opens upward from a one-line
 * header, so the header stays put; in the timeline it opens downward like any other card.
 */
export function PlanProgressCard({
  progress,
  docked = false,
  onStop,
  stopDisabled = false,
}: {
  progress: PlanProgress;
  docked?: boolean;
  /** Present while the plan's turn can still be stopped. */
  onStop?: (() => void) | undefined;
  stopDisabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(!docked);
  const list = expanded ? <StepList progress={progress} /> : null;
  return (
    <section
      aria-label="Plan"
      data-plan-card={docked ? "docked" : "timeline"}
      className={cn(
        "min-w-0 overflow-hidden text-sm",
        docked
          ? "rounded-2xl bg-card pt-1 shadow-composer dark:shadow-composer-dark"
          : "my-1 rounded-field bg-muted pb-1",
      )}
    >
      {docked ? list : null}
      <div className="flex h-8 min-w-0 items-center gap-1 pe-1.5">
        <button
          type="button"
          data-plan-card-header
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-field ps-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
        >
          <ListTodoIcon aria-hidden className="size-4 shrink-0 text-icon-muted" />
          <span className="min-w-0 truncate text-foreground tabular-nums">
            {planProgressTitle(progress, docked)}
          </span>
          <ChevronUpIcon
            aria-hidden
            className={cn(
              "ms-auto size-3.5 shrink-0 text-icon-muted transition-transform duration-150",
              expanded === docked ? "rotate-0" : "rotate-180",
            )}
          />
        </button>
        {onStop ? (
          <Button size="xs" variant="ghost-muted" disabled={stopDisabled} onClick={onStop}>
            Stop
          </Button>
        ) : null}
      </div>
      {docked ? null : list}
    </section>
  );
}

/** A settled run's plan where it last changed; its run's outcome decides cancelled steps. */
export function TimelinePlanCard({ workEntry }: { workEntry: TimelineWorkEntry }) {
  const item = workEntry.projectedItem?.item;
  return item?.type === "todo_list" ? <SettledPlanCard item={item} /> : null;
}

function SettledPlanCard({
  item,
}: {
  item: Extract<OrchestrationV2TurnItem, { readonly type: "todo_list" }>;
}) {
  const ctx = use(TimelineRowCtx);
  const runStatus = useAtomValue(
    environmentThreadDetails.threadAtom(
      scopeThreadRef(ctx.activeThreadEnvironmentId, item.threadId),
    ),
    (thread) => thread?.projection.runs.find((run) => run.id === item.runId)?.status ?? null,
  );
  return <PlanProgressCard progress={presentPlanProgress(item.steps, runStatus ?? "completed")} />;
}

/** The live run's plan, pinned above the composer until the run ends. */
export function DockedPlanCard({
  turnItems,
  runId,
  onStop,
  stopDisabled,
}: {
  turnItems: ReadonlyArray<ThreadStructureTurnItem>;
  runId: RunId | null;
  onStop: () => void;
  stopDisabled: boolean;
}) {
  const todo = runId === null ? null : latestRunTodoList(turnItems, runId);
  if (todo === null || todo.steps.length === 0) return null;
  return (
    <div className="pb-2">
      <PlanProgressCard
        key={runId}
        docked
        progress={presentPlanProgress(todo.steps, null)}
        onStop={onStop}
        stopDisabled={stopDisabled}
      />
    </div>
  );
}
