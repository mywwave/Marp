import { describe, expect, it } from "vite-plus/test";

import {
  MessageId,
  NodeId,
  PlanId,
  ProviderDriverKind,
  ProviderInstanceId,
  RunId,
  ThreadId,
  TurnItemId,
  type OrchestrationV2PlanStep,
  type OrchestrationV2TurnItem,
} from "@marp/contracts";
import * as DateTime from "effect/DateTime";

import {
  latestRunTodoList,
  presentPlanProgress,
  responseStalled,
  subagentCurrentStep,
  summarizeBackgroundTasks,
  supersededTodoListIds,
} from "./liveCards.js";
import { workEventStepText } from "./eventPresentation.js";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const BASE_ITEM = {
  threadId: ThreadId.make("thread"),
  runId: RunId.make("run-1"),
  nodeId: null,
  providerThreadId: null,
  providerTurnId: null,
  nativeItemRef: null,
  parentItemId: null,
  ordinal: 1,
  status: "completed",
  title: null,
  startedAt: at("2026-10-01T00:00:00.000Z"),
  completedAt: null,
  updatedAt: at("2026-10-01T00:00:00.000Z"),
} as const;

function todo(
  id: string,
  steps: ReadonlyArray<OrchestrationV2PlanStep>,
  runId = BASE_ITEM.runId,
): OrchestrationV2TurnItem {
  return {
    ...BASE_ITEM,
    id: TurnItemId.make(id),
    runId,
    type: "todo_list",
    planId: PlanId.make(id),
    steps,
  };
}

const step = (id: string, status: OrchestrationV2PlanStep["status"]): OrchestrationV2PlanStep => ({
  id,
  text: `Step ${id}`,
  status,
});

describe("plan progress", () => {
  it("folds successive todo updates into the run's latest list", () => {
    const first = todo("todo-1", [step("a", "running"), step("b", "pending")]);
    const second = todo("todo-2", [step("a", "completed"), step("b", "running")]);
    const otherRun = todo("todo-3", [step("c", "pending")], RunId.make("run-2"));
    const items = [first, otherRun, second];

    expect([...supersededTodoListIds(items)]).toEqual(["todo-1"]);
    expect(latestRunTodoList(items, BASE_ITEM.runId)?.id).toBe("todo-2");
    expect(latestRunTodoList(items, RunId.make("missing"))).toBeNull();
  });

  it("counts done steps and names the current one while the run is live", () => {
    const progress = presentPlanProgress(
      [step("a", "completed"), step("b", "running"), step("c", "pending")],
      "running",
    );
    expect(progress.steps.map((entry) => entry.state)).toEqual(["completed", "running", "pending"]);
    expect([progress.done, progress.total, progress.current?.id]).toEqual([1, 3, "b"]);
  });

  it("cancels unfinished steps of a stopped run and settles them after a normal end", () => {
    const steps = [step("a", "completed"), step("b", "running"), step("c", "pending")];
    expect(presentPlanProgress(steps, "interrupted").steps.map((entry) => entry.state)).toEqual([
      "completed",
      "cancelled",
      "cancelled",
    ]);
    expect(presentPlanProgress(steps, "completed").steps.map((entry) => entry.state)).toEqual([
      "completed",
      "pending",
      "pending",
    ]);
  });
});

describe("subagent card", () => {
  it("prefers a blocking child request, then provider progress, then the child's reply", () => {
    const child = {
      pendingRuntimeRequest: null,
      latestVisibleMessage: {
        id: MessageId.make("message"),
        role: "assistant" as const,
        text: "\n**Looking** at `session.ts`\nmore",
        updatedAt: at("2026-10-01T00:00:00.000Z"),
      },
    };
    expect(
      subagentCurrentStep({ status: "running", progress: "Reading the last commits", child }),
    ).toBe("Reading the last commits");
    expect(subagentCurrentStep({ status: "running", progress: undefined, child })).toBe(
      "Looking at session.ts",
    );
    expect(
      subagentCurrentStep({
        status: "running",
        progress: "Reading",
        child: {
          ...child,
          pendingRuntimeRequest: {
            id: "request" as never,
            kind: "command",
            createdAt: at("2026-10-01T00:00:00.000Z"),
          },
        },
      }),
    ).toBe("Waiting for approval");
    expect(subagentCurrentStep({ status: "completed", progress: "Reading", child })).toBeNull();
  });

  it("labels a provider's command step like its work-log row, never as the raw command", () => {
    const step = (progress: string) => subagentCurrentStep({ status: "running", progress });
    const workLog = (command: string, description?: string) =>
      workEventStepText(
        {
          id: "command",
          createdAt: "",
          label: "",
          tone: "tool",
          itemType: "command_execution",
          command,
          ...(description === undefined
            ? {}
            : {
                structuredPayload: {
                  type: "command_execution",
                  input: command,
                  description,
                } as never,
              }),
        },
        true,
      );
    expect(step("Install the web dependencies")).toBe(
      workLog("pnpm install", "Install the web dependencies"),
    );
    expect(step("Running cat apps/web/src/main.tsx")).toBe(workLog("cat apps/web/src/main.tsx"));
    expect(step("Running cat apps/web/src/main.tsx")).toBe("Reading main.tsx");
    expect(step('Running grep -rln "orphan" --include=*.go backend/')).toBe(
      "Grepping orphan in backend",
    );
    expect(step("Running cd /c/Users/me/worktrees/t3 && go test ./...")).toBe("Running tests");
  });
});

describe("background tasks", () => {
  it("counts running tasks and the ones that finished since the oldest started", () => {
    const subagent: OrchestrationV2TurnItem = {
      ...BASE_ITEM,
      id: TurnItemId.make("subagent-item"),
      nativeItemRef: {
        driver: ProviderDriverKind.make("claudeAgent"),
        nativeId: "task-1",
        strength: "strong",
      },
      status: "running",
      startedAt: at("2026-10-01T00:01:00.000Z"),
      type: "subagent",
      subagentId: NodeId.make("subagent"),
      origin: "provider_native",
      driver: ProviderDriverKind.make("claudeAgent"),
      providerInstanceId: ProviderInstanceId.make("claude"),
      childThreadId: null,
      prompt: "Explore",
      progress: "Reading files",
      result: null,
    };
    const notification = (id: string, iso: string, outcome: "completed" | "updated") =>
      ({
        ...BASE_ITEM,
        id: TurnItemId.make(id),
        startedAt: at(iso),
        type: "notification",
        source: { kind: "command" },
        outcome,
        summary: `Command ${id} finished`,
      }) satisfies OrchestrationV2TurnItem;
    const summary = summarizeBackgroundTasks(
      [
        { kind: "subagent", taskId: "task-1", description: "Explore the timeline" },
        { kind: "command", taskId: "task-2", description: "npm test" },
      ],
      [
        notification("before", "2026-10-01T00:00:30.000Z", "completed"),
        subagent,
        notification("after", "2026-10-01T00:02:00.000Z", "completed"),
        notification("progress", "2026-10-01T00:02:30.000Z", "updated"),
      ],
    );
    // A subagent holds the agent's completion; commands alone are only monitored.
    expect(summary?.title).toBe("Waiting for background tasks · 2 running · 1 done");
    expect(summary?.rows.map((row) => [row.id, row.state, row.activity])).toEqual([
      ["task-1", "running", "Reading files"],
      ["task-2", "running", null],
      ["after", "done", null],
    ]);
    expect(
      summarizeBackgroundTasks([{ kind: "command", taskId: "task-2", description: "npm test" }], [])
        ?.title,
    ).toBe("Monitoring background tasks · 1 running");
    expect(summarizeBackgroundTasks([], [])).toBeNull();
  });

  it("says it waits on subagents", () => {
    expect(
      summarizeBackgroundTasks([{ kind: "subagent", taskId: "task-1", description: "Explore" }], [])
        ?.title,
    ).toBe("Waiting for subagent · 1 running");
  });
});

describe("waiting rows", () => {
  it("reads 20 seconds of mid-turn silence as a stalled response", () => {
    const last = "2026-10-01T00:00:00.000Z";
    expect(responseStalled(last, Date.parse(last) + 19_999)).toBe(false);
    expect(responseStalled(last, Date.parse(last) + 20_000)).toBe(true);
    expect(responseStalled(null, Date.parse(last) + 60_000)).toBe(false);
  });
});
