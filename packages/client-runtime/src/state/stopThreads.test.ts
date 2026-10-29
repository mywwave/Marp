import { EnvironmentId, ProviderInstanceId, RunId, ThreadId } from "@marp/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildStopThreadsPreview,
  planStopThreads,
  runStopThreadsPlan,
  summarizeStopThreads,
} from "./stopThreads.ts";

const laptop = EnvironmentId.make("laptop");
const server = EnvironmentId.make("server");

function thread(
  id: string,
  options: {
    environmentId?: EnvironmentId;
    running?: boolean;
    background?: boolean;
    parent?: string;
    relationship?: "fork" | "subagent";
  } = {},
) {
  return {
    id: ThreadId.make(id),
    environmentId: options.environmentId ?? laptop,
    title: id,
    deletedAt: null,
    lineage: {
      parentThreadId: options.parent === undefined ? null : ThreadId.make(options.parent),
      relationshipToParent:
        options.parent === undefined ? null : (options.relationship ?? "subagent"),
      rootThreadId: ThreadId.make(options.parent ?? id),
    },
    pendingBackgroundTasks: options.background ? [{} as never] : [],
    runtime:
      options.running === false
        ? null
        : {
            status: "running" as const,
            activeRunId: RunId.make(`run-${id}`),
            providerInstanceId: ProviderInstanceId.make("codex"),
            providerName: "Codex",
            lastError: null,
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
  };
}

const everywhere = { canStop: () => true, cascades: () => true };
const ids = (threads: ReadonlyArray<{ id: string }>) => threads.map((entry) => entry.id);

describe("planStopThreads", () => {
  it("collects running threads and background work across environments", () => {
    const plan = planStopThreads(
      [
        thread("a"),
        thread("idle", { running: false }),
        thread("background", { running: false, background: true }),
        thread("b", { environmentId: server }),
      ],
      everywhere,
    );
    expect(ids(plan.running)).toEqual(["a", "background", "b"]);
    expect(ids(plan.targets)).toEqual(["a", "background", "b"]);
    expect(plan.skipped).toEqual([]);
  });

  it("skips environments this connection cannot operate and counts them", () => {
    const plan = planStopThreads(
      [thread("a"), thread("b", { environmentId: server }), thread("c", { environmentId: server })],
      { ...everywhere, canStop: (environmentId) => environmentId !== server },
    );
    expect(ids(plan.targets)).toEqual(["a"]);
    expect(plan.skipped).toEqual([{ environmentId: server, count: 2 }]);
  });

  it("stops subagents through a running ancestor, even past an idle one", () => {
    const threads = [
      thread("root"),
      thread("child", { parent: "root" }),
      thread("idle-child", { parent: "root", running: false }),
      thread("grandchild", { parent: "idle-child" }),
      thread("fork", { parent: "root", relationship: "fork" }),
      thread("orphan", { parent: "missing" }),
    ];
    const plan = planStopThreads(threads, everywhere);
    expect(ids(plan.running)).toEqual(["root", "child", "grandchild", "fork", "orphan"]);
    expect(ids(plan.targets)).toEqual(["root", "fork", "orphan"]);
    expect(plan.stoppedBy.get(plan.running[2]!)?.id).toBe("root");
  });

  it("interrupts children directly where a parent's Stop does not cascade", () => {
    const plan = planStopThreads([thread("root"), thread("child", { parent: "root" })], {
      ...everywhere,
      cascades: () => false,
    });
    expect(ids(plan.targets)).toEqual(["root", "child"]);
  });
});

describe("runStopThreadsPlan", () => {
  it("interrupts each target once and gives covered children their ancestor's outcome", async () => {
    const plan = planStopThreads(
      [
        thread("root"),
        thread("child", { parent: "root" }),
        thread("b", { environmentId: server }),
        thread("denied", { environmentId: EnvironmentId.make("guest") }),
      ],
      { ...everywhere, canStop: (environmentId) => environmentId !== "guest" },
    );
    const interrupted: string[] = [];
    const outcome = await runStopThreadsPlan(plan, async (target) => {
      interrupted.push(target.id);
      if (target.id === "root") return "Provider exited.";
      return null;
    });
    expect(interrupted).toEqual(["root", "b"]);
    expect(ids(outcome.stopped)).toEqual(["b"]);
    expect(outcome.failed.map(({ thread, message }) => [thread.id, message])).toEqual([
      ["root", "Provider exited."],
      ["child", "Provider exited."],
    ]);
    expect(outcome.skipped).toEqual([{ environmentId: "guest", count: 1 }]);
  });

  it("records a thrown interrupt as a failure", async () => {
    const plan = planStopThreads([thread("a")], everywhere);
    const outcome = await runStopThreadsPlan(plan, async () => {
      throw new Error("Socket closed.");
    });
    expect(outcome.failed).toEqual([{ thread: plan.running[0], message: "Socket closed." }]);
  });
});

describe("summarizeStopThreads", () => {
  const label = (environmentId: EnvironmentId) => (environmentId === server ? "Server" : "Laptop");

  it.each([
    {
      name: "all stopped",
      outcome: { stopped: [thread("a"), thread("b")], failed: [], skipped: [] },
      expected: { type: "success", title: "Stopped 2 threads", description: null },
    },
    {
      name: "one stopped",
      outcome: { stopped: [thread("a")], failed: [], skipped: [] },
      expected: { type: "success", title: "Stopped 1 thread", description: null },
    },
    {
      name: "partial failure",
      outcome: {
        stopped: [thread("a"), thread("b")],
        failed: [{ thread: thread("c"), message: "Provider exited." }],
        skipped: [],
      },
      expected: {
        type: "warning",
        title: "Stopped 2 of 3 · 1 failed",
        description: "c: Provider exited.",
      },
    },
    {
      name: "all failed",
      outcome: { stopped: [], failed: [{ thread: thread("c"), message: "Offline." }], skipped: [] },
      expected: { type: "error", title: "Stopped 0 of 1 · 1 failed", description: "c: Offline." },
    },
    {
      name: "permission skip",
      outcome: {
        stopped: [thread("a")],
        failed: [],
        skipped: [{ environmentId: server, count: 2 }],
      },
      expected: {
        type: "warning",
        title: "Stopped 1 thread",
        description: "2 threads on Server not stopped: this connection can't stop threads there.",
      },
    },
  ])("$name", ({ outcome, expected }) => {
    expect(summarizeStopThreads(outcome, label)).toEqual(expected);
  });
});

describe("buildStopThreadsPreview", () => {
  it("shows up to five threads grouped by machine, then the rest as a count", () => {
    const preview = buildStopThreadsPreview([
      thread("a"),
      thread("s1", { environmentId: server }),
      thread("b"),
      thread("c"),
      thread("s2", { environmentId: server }),
      thread("s3", { environmentId: server }),
      thread("d"),
    ]);
    expect(preview.multipleEnvironments).toBe(true);
    expect(preview.groups.map((group) => [group.environmentId, ids(group.threads)])).toEqual([
      [laptop, ["a", "b", "c", "d"]],
      [server, ["s1"]],
    ]);
    expect(preview.more).toBe(2);
  });
});
