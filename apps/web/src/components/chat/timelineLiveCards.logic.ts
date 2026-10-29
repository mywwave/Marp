import type { RunId } from "@marp/contracts";
import { isLiveSubagentTurnItem } from "@marp/client-runtime/state/subagentRuntime";
import { supersededTodoListIds } from "@marp/client-runtime/work-log/live-cards";
import * as DateTime from "effect/DateTime";

import type { TimelineEntry } from "../../session-logic";

function isTodoListEntry(entry: TimelineEntry): entry is Extract<TimelineEntry, { kind: "work" }> {
  return entry.kind === "work" && entry.entry.itemType === "todo_list";
}

/**
 * One plan card per run: earlier todo updates drop out, and the live run's card sits above the
 * composer instead, so the timeline gains it at its last update once the run ends.
 */
export function withLatestTodoLists(
  entries: ReadonlyArray<TimelineEntry>,
  liveRunId: RunId | null,
): ReadonlyArray<TimelineEntry> {
  const todoLists = entries.flatMap((entry) =>
    isTodoListEntry(entry)
      ? [{ id: entry.id, type: "todo_list", runId: entry.entry.runId ?? null }]
      : [],
  );
  if (todoLists.length === 0) return entries;
  const superseded = supersededTodoListIds(todoLists);
  return entries.filter(
    (entry) =>
      !isTodoListEntry(entry) ||
      !(superseded.has(entry.id) || (liveRunId !== null && entry.entry.runId === liveRunId)),
  );
}

function entryRunId(entry: TimelineEntry): RunId | null {
  switch (entry.kind) {
    case "message":
      return entry.message.runId ?? null;
    case "work":
      return entry.entry.runId ?? null;
    case "event":
      return entry.projectedItem.item.runId;
    case "html-render":
    case "mcp-app":
      return entry.runId;
    case "proposed-plan":
      return null;
  }
}

function entryLastActivityAt(entry: TimelineEntry): string {
  if (entry.kind === "message") return entry.createdAt;
  const item = entry.kind === "work" ? entry.entry.projectedItem?.item : undefined;
  const updatedAt =
    entry.kind === "event"
      ? entry.projectedItem.item.updatedAt
      : item !== undefined && "updatedAt" in item
        ? item.updatedAt
        : null;
  return updatedAt === null ? entry.createdAt : DateTime.formatIso(updatedAt);
}

/**
 * What the live turn's idle row says: a live subagent it waits on, and its last event's time,
 * null while a reply streams (streamed text is activity, and rows keep through text deltas).
 */
export function activeTurnWait(
  entries: ReadonlyArray<TimelineEntry>,
  runId: RunId | null,
): { readonly waitingForSubagent: boolean; readonly lastActivityAt: string | null } {
  let waitingForSubagent = false;
  let streaming = false;
  let lastActivityAt: string | null = null;
  for (const entry of entries) {
    if (runId === null || entryRunId(entry) !== runId) continue;
    if (entry.kind === "event" && isLiveSubagentTurnItem(entry.projectedItem.item)) {
      waitingForSubagent = true;
    }
    if (entry.kind === "message" && entry.message.streaming) streaming = true;
    const activityAt = entryLastActivityAt(entry);
    if (lastActivityAt === null || activityAt > lastActivityAt) lastActivityAt = activityAt;
  }
  return { waitingForSubagent, lastActivityAt: streaming ? null : lastActivityAt };
}
