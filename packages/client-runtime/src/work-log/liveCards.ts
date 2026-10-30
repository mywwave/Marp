import type {
  OrchestrationV2PendingBackgroundTask,
  OrchestrationV2PlanStep,
  OrchestrationV2RunStatus,
  OrchestrationV2ThreadShell,
  OrchestrationV2TurnItem,
  RunId,
} from "@marp/contracts";
import * as DateTime from "effect/DateTime";

import type { ThreadStructureTurnItem } from "../state/models.ts";
import { workEventStepText } from "./eventPresentation.ts";
import {
  presentPendingBackgroundWork,
  type PendingBackgroundWorkItem,
} from "../state/threadExecution.ts";

type TodoListItem = Extract<ThreadStructureTurnItem, { readonly type: "todo_list" }>;

/** Each todo update rewrites its run's whole list, so only the run's latest one is current. */
export function supersededTodoListIds(
  items: ReadonlyArray<{
    readonly id: string;
    readonly type: string;
    readonly runId: RunId | null;
  }>,
): ReadonlySet<string> {
  const latestByRun = new Map<RunId | null, string>();
  const superseded = new Set<string>();
  for (const item of items) {
    if (item.type !== "todo_list") continue;
    const previous = latestByRun.get(item.runId);
    if (previous !== undefined) superseded.add(previous);
    latestByRun.set(item.runId, item.id);
  }
  return superseded;
}

export function latestRunTodoList(
  items: ReadonlyArray<ThreadStructureTurnItem>,
  runId: RunId | null,
): TodoListItem | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index]!;
    if (item.type === "todo_list" && item.runId === runId) return item;
  }
  return null;
}

export type PlanStepState = "pending" | "running" | "completed" | "cancelled";

export interface PlanProgress {
  readonly steps: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly state: PlanStepState;
  }>;
  readonly done: number;
  readonly total: number;
  /** The step in progress, else the next pending one; null once nothing is left. */
  readonly current: { readonly id: string; readonly text: string } | null;
}

const STOPPED_RUN_STATUSES = new Set<OrchestrationV2RunStatus>([
  "interrupted",
  "failed",
  "cancelled",
  "rolled_back",
]);

/**
 * `runStatus` is the owning run's: once it stopped short, unfinished steps read as cancelled;
 * once it ended normally, nothing is in progress any more.
 */
export function presentPlanProgress(
  steps: ReadonlyArray<OrchestrationV2PlanStep>,
  runStatus: OrchestrationV2RunStatus | null,
): PlanProgress {
  const stopped = runStatus !== null && STOPPED_RUN_STATUSES.has(runStatus);
  const ended = stopped || runStatus === "completed";
  const presented = steps.map((step) => ({
    id: step.id,
    text: step.text,
    state:
      step.status === "completed"
        ? ("completed" as const)
        : stopped
          ? ("cancelled" as const)
          : step.status === "running" && !ended
            ? ("running" as const)
            : ("pending" as const),
  }));
  const current =
    presented.find((step) => step.state === "running") ??
    presented.find((step) => step.state === "pending") ??
    null;
  return {
    steps: presented,
    done: presented.filter((step) => step.state === "completed").length,
    total: presented.length,
    current: current === null ? null : { id: current.id, text: current.text },
  };
}

/** Cursor's to-do title: docked, the step in progress and its place; else how many are done. */
export function planProgressTitle(progress: PlanProgress, docked: boolean): string {
  const running = progress.steps.find((step) => step.state === "running");
  if (docked && running) return `${running.text}, ${progress.done + 1} of ${progress.total}`;
  if (progress.done === 0) return `${progress.total} To-dos`;
  const count = `${progress.done} of ${progress.total}`;
  return docked ? `${count} To-dos Completed` : `${count} Done`;
}

export type SubagentCardState = "running" | "waiting" | "done" | "failed" | "stopped" | "idle";

export function subagentCardState(status: OrchestrationV2TurnItem["status"]): SubagentCardState {
  switch (status) {
    case "pending":
    case "running":
      return "running";
    case "waiting":
      return "waiting";
    case "completed":
      return "done";
    case "failed":
      return "failed";
    case "cancelled":
    case "interrupted":
      return "stopped";
    case "idle":
      return "idle";
  }
}

function firstLine(text: string | null | undefined, maxLength: number): string | null {
  const line = text
    ?.split("\n")
    .map((candidate) =>
      candidate
        .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
        .replace(/[`*_#>]/gu, "")
        .replace(/^\s*[-+]\s+/u, "")
        .replace(/\s+/gu, " ")
        .trim(),
    )
    .find((candidate) => candidate.length > 0);
  if (line === undefined) return null;
  return line.length > maxLength ? `${line.slice(0, maxLength).trimEnd()}…` : line;
}

// Claude reports a running shell step as "Running <raw command>".
const PROGRESS_COMMAND = /^Running (.+)$/u;

/** A provider progress line in work-log terms: a raw command reads as the step it performs. */
function subagentProgressStep(progress: string | null | undefined): string | null {
  const line = progress
    ?.split("\n")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  const command = line === undefined ? undefined : PROGRESS_COMMAND.exec(line)?.[1]?.trim();
  if (command === undefined || command.length === 0) return firstLine(progress, 160);
  return workEventStepText(
    {
      id: "subagent-progress",
      createdAt: "",
      label: "",
      tone: "tool",
      itemType: "command_execution",
      command,
    },
    true,
  );
}

/**
 * The live subagent's current step: the provider's own progress line, else what its child thread
 * shows (a request waiting on you, then its latest reply), else nothing to say yet.
 */
export function subagentCurrentStep(input: {
  readonly status: OrchestrationV2TurnItem["status"];
  readonly progress: string | null | undefined;
  readonly child?:
    | Pick<OrchestrationV2ThreadShell, "pendingRuntimeRequest" | "latestVisibleMessage">
    | null
    | undefined;
}): string | null {
  const state = subagentCardState(input.status);
  if (state !== "running" && state !== "waiting") return null;
  const request = input.child?.pendingRuntimeRequest;
  if (request != null && request.blocking !== false) {
    return request.kind === "user_input" ? "Waiting for response" : "Waiting for approval";
  }
  const progress = subagentProgressStep(input.progress);
  if (progress !== null) return progress;
  const message = input.child?.latestVisibleMessage;
  if (message?.role === "assistant") return firstLine(message.text, 160);
  return state === "waiting" ? "Waiting" : null;
}

const SUBAGENT_STATE_LABELS = {
  running: "Planning next moves",
  waiting: "Waiting",
  done: "Completed",
  failed: "Stopped with error",
  stopped: "Stopped",
  idle: "Idle",
} as const satisfies Record<SubagentCardState, string>;

/** Cursor's subagent status: the live step, "Starting up" before its thread exists, else how it ended. */
export function subagentStatusLabel(
  state: SubagentCardState,
  step: string | null,
  started: boolean,
): string {
  if (state !== "running" && state !== "waiting") return SUBAGENT_STATE_LABELS[state];
  return step ?? (started ? SUBAGENT_STATE_LABELS[state] : "Starting up");
}

export type BackgroundTaskState = "running" | "done" | "failed" | "stopped";

export interface BackgroundTaskRow {
  readonly id: string;
  readonly kind: PendingBackgroundWorkItem["kind"];
  readonly label: string;
  readonly state: BackgroundTaskState;
  readonly startedAt: string | null;
  readonly childThreadId: PendingBackgroundWorkItem["childThreadId"];
  /** A subagent's latest progress line. */
  readonly activity: string | null;
}

export interface BackgroundTasksSummary {
  readonly title: string;
  readonly running: number;
  readonly done: number;
  readonly waiting: boolean;
  readonly rows: ReadonlyArray<BackgroundTaskRow>;
}

const BACKGROUND_NOTIFICATION_KINDS = new Set([
  "subagent",
  "command",
  "monitor",
  "background_task",
]);

const NOTIFICATION_STATES: Record<string, BackgroundTaskState | undefined> = {
  completed: "done",
  unknown: "done",
  failed: "failed",
  cancelled: "stopped",
};

function itemTime(item: ThreadStructureTurnItem): DateTime.Utc | null {
  return item.startedAt ?? ("updatedAt" in item ? item.updatedAt : null);
}

/**
 * Background commands and subagents still running after the foreground turn, with the ones that
 * finished since the oldest of them started.
 */
export function summarizeBackgroundTasks(
  tasks: ReadonlyArray<OrchestrationV2PendingBackgroundTask>,
  turnItems: ReadonlyArray<ThreadStructureTurnItem>,
): BackgroundTasksSummary | null {
  const presentation = presentPendingBackgroundWork(tasks);
  if (presentation === null) return null;
  const running = presentation.items.map((task): BackgroundTaskRow => {
    // Same key derivePendingBackgroundWork gives turn-item tasks.
    let item: ThreadStructureTurnItem | undefined;
    for (let index = turnItems.length - 1; index >= 0 && item === undefined; index -= 1) {
      const candidate = turnItems[index]!;
      if ((candidate.nativeItemRef?.nativeId || candidate.id) === task.taskId) item = candidate;
    }
    const startedAt = item === undefined ? null : itemTime(item);
    return {
      id: task.taskId,
      kind: task.kind,
      label: task.label,
      state: "running",
      startedAt: startedAt === null ? null : DateTime.formatIso(startedAt),
      childThreadId:
        task.childThreadId ??
        (item?.type === "subagent" ? (item.childThreadId ?? undefined) : undefined),
      activity: item?.type === "subagent" ? subagentProgressStep(item.progress) : null,
    };
  });
  const startedAtMs = running.flatMap((row) =>
    row.startedAt === null ? [] : [Date.parse(row.startedAt)],
  );
  const windowStartMs = startedAtMs.length === 0 ? null : Math.min(...startedAtMs);
  const finished =
    windowStartMs === null
      ? []
      : turnItems.flatMap((item): BackgroundTaskRow[] => {
          if (item.type !== "notification") return [];
          const state = NOTIFICATION_STATES[item.outcome];
          const at = itemTime(item);
          if (
            state === undefined ||
            !BACKGROUND_NOTIFICATION_KINDS.has(item.source.kind) ||
            at === null ||
            DateTime.toEpochMillis(at) < windowStartMs
          ) {
            return [];
          }
          return [
            {
              id: item.id,
              kind: item.source.kind === "subagent" ? "subagent" : "command",
              label: firstLine(item.summary, 160) ?? item.summary,
              state,
              startedAt: null,
              childThreadId: "childThreadId" in item.source ? item.source.childThreadId : undefined,
              activity: null,
            },
          ];
        });
  const onlySubagents = running.every((row) => row.kind === "subagent");
  const lead = presentation.waiting
    ? onlySubagents
      ? running.length === 1
        ? "Waiting for subagent"
        : "Waiting for subagents"
      : "Waiting for background tasks"
    : "Monitoring background tasks";
  const counts = [
    `${running.length} running`,
    ...(finished.length > 0 ? [`${finished.length} done`] : []),
  ];
  return {
    title: `${lead} · ${counts.join(" · ")}`,
    running: running.length,
    done: finished.length,
    waiting: presentation.waiting,
    rows: [...running, ...finished],
  };
}

/** Mid-turn silence this long reads as the provider stalling, not thinking. */
const RESPONSE_STALL_MS = 20_000;

export function responseStalled(lastActivityAt: string | null, nowMs: number): boolean {
  const lastMs = lastActivityAt === null ? Number.NaN : Date.parse(lastActivityAt);
  return Number.isFinite(lastMs) && nowMs - lastMs >= RESPONSE_STALL_MS;
}
