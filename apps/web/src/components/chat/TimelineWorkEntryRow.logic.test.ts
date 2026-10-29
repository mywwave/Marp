import { ThreadId, TurnItemId, type OrchestrationV2TurnItem } from "@marp/contracts";
import * as DateTime from "effect/DateTime";
import { describe, expect, it } from "vite-plus/test";

import { workEntryIconName } from "./TimelineWorkEntryRow.logic";
import type { TimelineWorkEntry } from "./timelineRowContext";

function command(input: string): TimelineWorkEntry {
  const structuredPayload = {
    id: TurnItemId.make(`item-${input}`),
    threadId: ThreadId.make("thread"),
    runId: null,
    nodeId: null,
    providerThreadId: null,
    providerTurnId: null,
    nativeItemRef: null,
    parentItemId: null,
    ordinal: 1,
    status: "completed",
    title: null,
    startedAt: null,
    completedAt: null,
    updatedAt: DateTime.makeUnsafe("2026-10-01T00:00:00.000Z"),
    type: "command_execution",
    input,
  } satisfies OrchestrationV2TurnItem;
  return {
    id: `entry-${input}`,
    createdAt: "2026-10-01T00:00:00.000Z",
    label: input,
    tone: "tool",
    itemType: "command_execution",
    toolLifecycleStatus: "completed",
    command: input,
    structuredPayload,
  };
}

describe("workEntryIconName", () => {
  it.each([
    ["cat /tmp/t.txt", "eye"],
    ["rg token src", "search"],
    ["ls src", "search"],
    ["pnpm test", "terminal"],
  ] as const)("gives %s the %s icon", (input, icon) => {
    expect(workEntryIconName(command(input))).toBe(icon);
  });
});
