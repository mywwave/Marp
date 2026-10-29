import { RunId } from "@marp/contracts";
import { describe, expect, it } from "vite-plus/test";

import type { TimelineEntry } from "../../session-logic";
import { activeTurnWait, withLatestTodoLists } from "./timelineLiveCards.logic";

const RUN = RunId.make("run-1");

function work(id: string, itemType: string, runId: RunId | null = RUN): TimelineEntry {
  return {
    id,
    kind: "work",
    createdAt: `2026-10-01T00:00:0${id.length % 10}.000Z`,
    entry: { id, createdAt: "2026-10-01T00:00:00.000Z", label: id, tone: "tool", itemType, runId },
  } as TimelineEntry;
}

function subagent(id: string, status: string): TimelineEntry {
  return {
    id,
    kind: "event",
    createdAt: "2026-10-01T00:00:05.000Z",
    projectedItem: {
      item: { type: "subagent", runId: RUN, status, updatedAt: null },
    },
  } as unknown as TimelineEntry;
}

describe("withLatestTodoLists", () => {
  const entries = [
    work("todo-1", "todo_list"),
    work("read", "dynamic_tool"),
    work("todo-2", "todo_list"),
  ];

  it("keeps only a settled run's latest todo update", () => {
    expect(withLatestTodoLists(entries, null).map((entry) => entry.id)).toEqual(["read", "todo-2"]);
  });

  it("leaves the live run's plan to the docked card", () => {
    expect(withLatestTodoLists(entries, RUN).map((entry) => entry.id)).toEqual(["read"]);
  });
});

describe("activeTurnWait", () => {
  it("waits on a live subagent of the turn and dates its last event", () => {
    const entries = [work("a", "dynamic_tool"), subagent("child", "running")];
    expect(activeTurnWait(entries, RUN)).toEqual({
      waitingForSubagent: true,
      lastActivityAt: "2026-10-01T00:00:05.000Z",
    });
    expect(activeTurnWait([subagent("child", "completed")], RUN).waitingForSubagent).toBe(false);
    expect(activeTurnWait(entries, RunId.make("other")).lastActivityAt).toBeNull();
  });
});
