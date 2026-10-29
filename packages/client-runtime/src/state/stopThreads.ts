import type { EnvironmentId } from "@marp/contracts";

import type { EnvironmentThreadShell } from "./models.ts";
import { threadRuntimeHasInterruptibleRun } from "./threadExecution.ts";

type StoppableThread = Pick<
  EnvironmentThreadShell,
  "environmentId" | "id" | "lineage" | "runtime" | "pendingBackgroundTasks" | "deletedAt"
>;

/** A thread Stop would act on: a live run, or background work left by the last one. */
export function threadIsStoppable(thread: StoppableThread): boolean {
  return (
    thread.deletedAt === null &&
    (threadRuntimeHasInterruptibleRun(thread.runtime) || thread.pendingBackgroundTasks.length > 0)
  );
}

export interface StopThreadsPlan<T> {
  /** Every running thread this connection can stop, cascaded children included. */
  readonly running: ReadonlyArray<T>;
  /** The threads to interrupt. */
  readonly targets: ReadonlyArray<T>;
  /** Running children left out of `targets`, each mapped to the target whose Stop reaches it. */
  readonly stoppedBy: ReadonlyMap<T, T>;
  /** Running threads on environments where this connection cannot operate threads. */
  readonly skipped: ReadonlyArray<{
    readonly environmentId: EnvironmentId;
    readonly count: number;
  }>;
}

/**
 * `threads` may include idle ones: they are only used to walk a child up to its running ancestor.
 * `cascades` says whether a parent's Stop also stops its subagent threads on that environment.
 */
export function planStopThreads<T extends StoppableThread>(
  threads: ReadonlyArray<T>,
  options: {
    readonly canStop: (environmentId: EnvironmentId) => boolean;
    readonly cascades: (environmentId: EnvironmentId) => boolean;
  },
): StopThreadsPlan<T> {
  const running: T[] = [];
  const skippedCounts = new Map<EnvironmentId, number>();
  const runningKeys = new Set<string>();
  const byKey = new Map<string, T>();
  for (const thread of threads) byKey.set(`${thread.environmentId}\n${thread.id}`, thread);
  for (const thread of threads) {
    if (!threadIsStoppable(thread)) continue;
    if (!options.canStop(thread.environmentId)) {
      skippedCounts.set(thread.environmentId, (skippedCounts.get(thread.environmentId) ?? 0) + 1);
      continue;
    }
    running.push(thread);
    runningKeys.add(`${thread.environmentId}\n${thread.id}`);
  }
  // The topmost running subagent ancestor whose Stop reaches this thread, if any.
  const stoppingAncestor = (thread: T): T | undefined => {
    if (!options.cascades(thread.environmentId)) return undefined;
    const seen = new Set<string>();
    let found: T | undefined;
    let current: T | undefined = thread;
    while (current?.lineage.relationshipToParent === "subagent") {
      const parentId = current.lineage.parentThreadId;
      if (parentId === null) break;
      const parentKey = `${thread.environmentId}
${parentId}`;
      if (seen.has(parentKey)) break;
      seen.add(parentKey);
      current = byKey.get(parentKey);
      if (current !== undefined && runningKeys.has(parentKey)) found = current;
    }
    return found;
  };
  const targets: T[] = [];
  const stoppedBy = new Map<T, T>();
  for (const thread of running) {
    const ancestor = stoppingAncestor(thread);
    if (ancestor === undefined) targets.push(thread);
    else stoppedBy.set(thread, ancestor);
  }
  return {
    running,
    targets,
    stoppedBy,
    skipped: [...skippedCounts].map(([environmentId, count]) => ({ environmentId, count })),
  };
}

export interface StopThreadsOutcome<T> {
  readonly stopped: ReadonlyArray<T>;
  readonly failed: ReadonlyArray<{ readonly thread: T; readonly message: string }>;
  readonly skipped: StopThreadsPlan<T>["skipped"];
}

/**
 * Interrupts every target at once. `interrupt` resolves to an error message, or null on success.
 * A covered child shares its ancestor's outcome, so counts match the threads the user was shown.
 */
export async function runStopThreadsPlan<T extends StoppableThread>(
  plan: StopThreadsPlan<T>,
  interrupt: (thread: T) => Promise<string | null>,
): Promise<StopThreadsOutcome<T>> {
  const results = await Promise.all(
    plan.targets.map(async (thread) => {
      try {
        return { thread, message: await interrupt(thread) };
      } catch (error) {
        return { thread, message: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
  const failures = new Map<T, string>();
  for (const result of results) {
    if (result.message !== null) failures.set(result.thread, result.message);
  }
  const stopped: T[] = [];
  const failed: Array<{ thread: T; message: string }> = [];
  for (const thread of plan.running) {
    const message = failures.get(plan.stoppedBy.get(thread) ?? thread);
    if (message === undefined) stopped.push(thread);
    else failed.push({ thread, message });
  }
  return { stopped, failed, skipped: plan.skipped };
}

const threadsLabel = (count: number) => `${count} ${count === 1 ? "thread" : "threads"}`;

export function stopThreadsConfirmTitle(count: number): string {
  return `Stop ${count} running ${count === 1 ? "thread" : "threads"}?`;
}

export interface StopThreadsPreviewGroup<T> {
  readonly environmentId: EnvironmentId;
  readonly threads: ReadonlyArray<T>;
}

/** Up to `limit` threads for the confirmation, grouped by environment in first-seen order. */
export function buildStopThreadsPreview<T extends Pick<EnvironmentThreadShell, "environmentId">>(
  running: ReadonlyArray<T>,
  limit = 5,
): {
  readonly groups: ReadonlyArray<StopThreadsPreviewGroup<T>>;
  readonly more: number;
  readonly multipleEnvironments: boolean;
} {
  const ordered = new Map<EnvironmentId, T[]>();
  for (const thread of running) {
    const group = ordered.get(thread.environmentId);
    if (group) group.push(thread);
    else ordered.set(thread.environmentId, [thread]);
  }
  // Group order keeps machines together, so the cut takes whole machines first.
  const shown = [...ordered.values()].flat().slice(0, limit);
  const groups: StopThreadsPreviewGroup<T>[] = [];
  for (const thread of shown) {
    const last = groups.at(-1);
    if (last?.environmentId === thread.environmentId) (last.threads as T[]).push(thread);
    else groups.push({ environmentId: thread.environmentId, threads: [thread] });
  }
  return { groups, more: running.length - shown.length, multipleEnvironments: ordered.size > 1 };
}

export interface StopThreadsSummary {
  readonly type: "success" | "warning" | "error";
  readonly title: string;
  readonly description: string | null;
}

export function summarizeStopThreads<T extends Pick<EnvironmentThreadShell, "title">>(
  outcome: StopThreadsOutcome<T>,
  environmentLabel: (environmentId: EnvironmentId) => string,
): StopThreadsSummary {
  const total = outcome.stopped.length + outcome.failed.length;
  const lines = outcome.failed
    .slice(0, 3)
    .map(({ thread, message }) => `${thread.title || "Untitled thread"}: ${message}`);
  if (outcome.failed.length > 3) lines.push(`+${outcome.failed.length - 3} more failed`);
  for (const { environmentId, count } of outcome.skipped) {
    lines.push(
      `${threadsLabel(count)} on ${environmentLabel(environmentId)} not stopped: this connection can't stop threads there.`,
    );
  }
  const description = lines.length > 0 ? lines.join("\n") : null;
  if (outcome.failed.length === 0) {
    return {
      type: outcome.skipped.length > 0 ? "warning" : "success",
      title: `Stopped ${threadsLabel(total)}`,
      description,
    };
  }
  return {
    type: outcome.stopped.length === 0 ? "error" : "warning",
    title: `Stopped ${outcome.stopped.length} of ${total} · ${outcome.failed.length} failed`,
    description,
  };
}
