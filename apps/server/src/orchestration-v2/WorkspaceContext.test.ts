import { assert, it } from "@effect/vitest";
import {
  CheckpointScopeId,
  NodeId,
  ProviderThreadId,
  RunId,
  ThreadId,
  type OrchestrationV2CheckpointScope,
} from "@marp/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { describe, expect, vi } from "vite-plus/test";

import * as ServerSettings from "../serverSettings.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as CheckpointService from "./CheckpointService.ts";
import * as WorkspaceContext from "./WorkspaceContext.ts";

const scope: OrchestrationV2CheckpointScope = {
  id: CheckpointScopeId.make("checkpoint-scope:workspace-context"),
  threadId: ThreadId.make("thread:workspace-context"),
  runId: RunId.make("run:workspace-context:1"),
  nodeId: NodeId.make("node:workspace-context:1"),
  parentScopeId: null,
  providerThreadId: ProviderThreadId.make("provider-thread:workspace-context"),
  kind: "root_run",
  ordinalWithinParent: 0,
  advancesAppRunCount: true,
  cwd: "/home/user/app",
  createdAt: DateTime.makeUnsafe("2026-10-29T00:00:00.000Z"),
};

const change = (path: string): CheckpointService.WorkspaceFileChange => ({
  path,
  status: "modified",
  additions: 3,
  deletions: 1,
});

function makeLayer(input: {
  readonly diffWorkspace: CheckpointService.CheckpointServiceV2["Service"]["diffWorkspace"];
  readonly share?: boolean;
}) {
  const listFiles = vi.fn(() => "src/index.ts\0src/lib/util.ts\0README.md\0");
  const execute = (request: GitVcsDriver.ExecuteGitInput) =>
    Effect.succeed({
      exitCode: 0,
      stdout: request.args.includes("rev-parse") ? "abc123\n" : listFiles(),
      stderr: "",
      stdoutTruncated: false,
      stderrTruncated: false,
    } as GitVcsDriver.ExecuteGitResult);
  const layer = WorkspaceContext.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(CheckpointService.CheckpointServiceV2)({ diffWorkspace: input.diffWorkspace }),
        Layer.mock(GitVcsDriver.GitVcsDriver)({ execute }),
        ServerSettings.layerTest({ shareWorkspaceContext: input.share ?? true }),
      ),
    ),
  );
  return { layer, listFiles };
}

describe("renderProjectLayout", () => {
  it("compresses a large repository under the line and byte caps", () => {
    const paths = [
      ...Array.from({ length: 30 }, (_, app) =>
        Array.from({ length: 200 }, (_, file) => `apps/app-${app}/src/file-${file}.ts`),
      ).flat(),
      "services/api/src/main/java/com/acme/App.java",
      "package.json",
    ];
    const layout = WorkspaceContext.renderProjectLayout(paths, false)!;
    const lines = layout.split("\n");

    expect(lines[0]).toBe("Project layout (6002 files; folders show file counts):");
    expect(lines.length).toBeLessThanOrEqual(120);
    expect(Buffer.byteLength(layout)).toBeLessThanOrEqual(1_500);
    expect(lines).toContain("apps/ (6000)");
    expect(lines).toContain("package.json");
    // Single-folder chains fold into one line.
    expect(layout).toContain("services/api/src/main/java/com/acme/ (1)");
    expect(layout).toMatch(/\+\d+ more/);
  });

  it("marks a partial listing", () => {
    expect(WorkspaceContext.renderProjectLayout(["a.ts"], true)).toBe(
      "Project layout (1+ files; folders show file counts):\na.ts",
    );
  });
});

describe("renderChangedFiles", () => {
  it("lists at most 30 files and counts the rest", () => {
    const text = WorkspaceContext.renderChangedFiles(
      Array.from({ length: 45 }, (_, index) => change(`src/file-${index}.ts`)),
    )!;
    const lines = text.split("\n");

    expect(lines).toHaveLength(32);
    expect(lines[1]).toBe("- modified src/file-0.ts (+3/-1)");
    expect(lines.at(-1)).toBe("- +15 more files");
  });
});

describe("WorkspaceContextV2.forTurn", () => {
  it.effect("sends the layout on the first turn only, and reuses it for the same HEAD", () => {
    const diffWorkspace = vi.fn(() => Effect.succeed([change("src/index.ts")]));
    const { layer, listFiles } = makeLayer({ diffWorkspace });
    return Effect.gen(function* () {
      const context = yield* WorkspaceContext.WorkspaceContextV2;
      const first = yield* context.forTurn({ scope, runOrdinal: 1 });
      yield* context.forTurn({ scope, runOrdinal: 1 });
      const second = yield* context.forTurn({
        scope,
        runOrdinal: 2,
        open: {
          file: "src/index.ts",
          selection: { path: "src/index.ts", startLine: 4, endLine: 9 },
        },
      });

      assert.deepEqual(
        first.map((section) => section.key),
        ["layout"],
      );
      assert.strictEqual(listFiles.mock.calls.length, 1);
      expect(diffWorkspace).toHaveBeenCalledTimes(1);
      assert.deepEqual(second, [
        {
          key: "changes",
          text: "Changed since your last turn by the user or another tool (lines added/removed):\n- modified src/index.ts (+3/-1)",
        },
        {
          key: "open",
          text: "Open in Marp:\n- File: src/index.ts\n- Selected: src/index.ts lines 4-9",
        },
      ]);
    }).pipe(Effect.provide(layer));
  });

  it.effect("skips changes without a checkpoint and when the diff runs over budget", () =>
    Effect.gen(function* () {
      const missing = yield* Effect.gen(function* () {
        return yield* (yield* WorkspaceContext.WorkspaceContextV2).forTurn({
          scope,
          runOrdinal: 3,
        });
      }).pipe(Effect.provide(makeLayer({ diffWorkspace: () => Effect.succeed(null) }).layer));
      assert.deepEqual(missing, []);

      const slow = yield* Effect.gen(function* () {
        const context = yield* WorkspaceContext.WorkspaceContextV2;
        const fiber = yield* Effect.forkChild(context.forTurn({ scope, runOrdinal: 3 }));
        yield* TestClock.adjust(WorkspaceContext.WORKSPACE_CONTEXT_BUDGET);
        return yield* Fiber.join(fiber);
      }).pipe(Effect.provide(makeLayer({ diffWorkspace: () => Effect.never }).layer));
      assert.deepEqual(slow, []);
    }),
  );

  it.effect("sends nothing when sharing is off", () =>
    Effect.gen(function* () {
      const context = yield* WorkspaceContext.WorkspaceContextV2;
      const sections = yield* context.forTurn({
        scope,
        runOrdinal: 1,
        open: { file: "src/index.ts" },
      });
      assert.deepEqual(sections, []);
    }).pipe(
      Effect.provide(
        makeLayer({ diffWorkspace: () => Effect.succeed([change("a.ts")]), share: false }).layer,
      ),
    ),
  );
});
