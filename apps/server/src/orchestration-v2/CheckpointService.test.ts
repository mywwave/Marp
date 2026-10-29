// @effect-diagnostics nodeBuiltinImport:off
import * as NodePath from "node:path";

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  CheckpointScopeId,
  NodeId,
  ProviderThreadId,
  RunId,
  ThreadId,
  type OrchestrationV2CheckpointScope,
  VcsProcessTimeoutError,
  VcsUnsupportedOperationError,
} from "@marp/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";

import * as CheckpointStore from "../checkpointing/CheckpointStore.ts";
import * as VcsDriverRegistry from "../vcs/VcsDriverRegistry.ts";
import * as VcsProcess from "../vcs/VcsProcess.ts";
import * as CheckpointService from "./CheckpointService.ts";
import * as IdAllocator from "@marp/provider-core/server/IdAllocator";

it.effect(
  "skips unsupported baseline and turn checkpoints without swallowing capture failures",
  () =>
    Effect.gen(function* () {
      const scope: OrchestrationV2CheckpointScope = {
        id: CheckpointScopeId.make("checkpoint-scope:capture-failure"),
        threadId: ThreadId.make("thread:capture-failure"),
        runId: RunId.make("run:capture-failure:1"),
        nodeId: NodeId.make("node:capture-failure:1"),
        parentScopeId: null,
        providerThreadId: ProviderThreadId.make("provider-thread:capture-failure"),
        kind: "root_run",
        ordinalWithinParent: 0,
        advancesAppRunCount: true,
        cwd: "/repo/ignored",
        createdAt: DateTime.makeUnsafe("2026-07-28T00:00:00.000Z"),
      };
      for (const captureError of [
        new VcsProcessTimeoutError({
          operation: "test.capture",
          command: "git",
          cwd: scope.cwd,
          timeoutMs: 30000,
        }),
        new VcsUnsupportedOperationError({
          operation: "test.capture",
          kind: "git",
          detail: "The workspace directory is ignored by its Git repository.",
        }),
      ]) {
        const layerTest = CheckpointService.layer.pipe(
          Layer.provide(
            Layer.mergeAll(
              IdAllocator.layer,
              Layer.mock(CheckpointStore.CheckpointStore)({
                isGitRepository: () => Effect.succeed(true),
                hasCheckpointRef: () => Effect.succeed(false),
                captureCheckpoint: () => Effect.fail(captureError),
              }),
            ),
          ),
          Layer.provideMerge(NodeCrypto.layer),
        );
        yield* Effect.gen(function* () {
          const checkpoints = yield* CheckpointService.CheckpointServiceV2;
          const baseline = yield* Effect.result(
            checkpoints.captureBaseline({ scope, ordinalWithinScope: 0 }),
          );
          const checkpoint = yield* checkpoints.capture({
            scope,
            ordinalWithinScope: 1,
            runId: scope.runId!,
            nodeId: scope.nodeId!,
            appRunOrdinal: 1,
            capturedAt: scope.createdAt,
          });

          assert.deepEqual(
            { baseline: baseline._tag, turn: checkpoint.status, files: checkpoint.files },
            captureError._tag === "VcsUnsupportedOperationError"
              ? { baseline: "Success", turn: "missing", files: [] }
              : { baseline: "Failure", turn: "error", files: [] },
          );
          if (baseline._tag === "Failure") {
            assert.strictEqual(baseline.failure.cause, captureError);
          } else {
            const materialized = yield* checkpoints.materializeBaselineCheckpoint({
              scope,
              ordinalWithinScope: 0,
            });
            assert.strictEqual(materialized.status, "missing");
          }
        }).pipe(Effect.provide(layerTest));
      }
    }),
);

const layerVcsProcess = VcsProcess.layer.pipe(Layer.provide(NodeServices.layer));
const layerRealGit = CheckpointService.layer.pipe(
  Layer.provide(IdAllocator.layer),
  Layer.provideMerge(
    CheckpointStore.layer.pipe(
      Layer.provide(VcsDriverRegistry.layer.pipe(Layer.provide(layerVcsProcess))),
    ),
  ),
  Layer.provideMerge(layerVcsProcess),
  Layer.provideMerge(NodeCrypto.layer),
  Layer.provideMerge(NodeServices.layer),
);

it.layer(layerRealGit)("CheckpointService.diffWorkspace", (it) => {
  it.effect("lists only what changed after the checkpoint, untracked files included", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const vcsProcess = yield* VcsProcess.VcsProcess;
      const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "workspace-diff-" });
      const git = (...args: ReadonlyArray<string>) =>
        vcsProcess.run({ operation: "test.git", command: "git", cwd, args, timeoutMs: 10_000 });
      const write = (path: string, text: string) =>
        fileSystem.writeFileString(NodePath.join(cwd, path), text);
      yield* git("init");
      yield* git("config", "user.email", "test@test.com");
      yield* git("config", "user.name", "Test");
      yield* write("keep.txt", "a\nb\nc\n");
      yield* write("gone.txt", "x\n");
      yield* write("old-name.txt", "same contents\nacross a rename\n");
      yield* git("add", ".");
      yield* git("commit", "-m", "initial");
      // Agent work never added to the index still belongs to the checkpoint.
      yield* write("agent-new.txt", "from the agent\n");
      const scope: OrchestrationV2CheckpointScope = {
        id: CheckpointScopeId.make("checkpoint-scope:workspace-diff"),
        threadId: ThreadId.make("thread:workspace-diff"),
        runId: RunId.make("run:workspace-diff:1"),
        nodeId: NodeId.make("node:workspace-diff:1"),
        parentScopeId: null,
        providerThreadId: ProviderThreadId.make("provider-thread:workspace-diff"),
        kind: "root_run",
        ordinalWithinParent: 0,
        advancesAppRunCount: true,
        cwd,
        createdAt: DateTime.makeUnsafe("2026-10-29T00:00:00.000Z"),
      };
      const checkpoints = yield* CheckpointService.CheckpointServiceV2;

      assert.strictEqual(
        yield* checkpoints.diffWorkspace({ scope, fromOrdinalWithinScope: 1 }),
        null,
      );
      yield* checkpoints.capture({
        scope,
        runId: scope.runId!,
        nodeId: scope.nodeId!,
        ordinalWithinScope: 1,
        appRunOrdinal: 1,
        capturedAt: scope.createdAt,
      });
      assert.deepEqual(yield* checkpoints.diffWorkspace({ scope, fromOrdinalWithinScope: 1 }), []);

      yield* write("keep.txt", "a\nB\nc\nd\n");
      yield* fileSystem.remove(NodePath.join(cwd, "gone.txt"));
      yield* git("mv", "old-name.txt", "new-name.txt");
      yield* write("user-new.txt", "1\n2\n");
      const changes = yield* checkpoints.diffWorkspace({ scope, fromOrdinalWithinScope: 1 });

      assert.deepEqual(changes, [
        { path: "gone.txt", status: "deleted", additions: 0, deletions: 1 },
        { path: "keep.txt", status: "modified", additions: 2, deletions: 1 },
        {
          path: "new-name.txt",
          previousPath: "old-name.txt",
          status: "renamed",
          additions: 0,
          deletions: 0,
        },
        { path: "user-new.txt", status: "added", additions: 2, deletions: 0 },
      ]);
      // The scratch ref is gone, so it never shows up as a checkpoint.
      const refs = yield* git("for-each-ref", "--format=%(refname)", "refs/marp");
      assert.notInclude(refs.stdout, "/workspace-");
    }),
  );
});
