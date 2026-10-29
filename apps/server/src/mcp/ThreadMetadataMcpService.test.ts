import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, it } from "@effect/vitest";
import {
  CommandId,
  EnvironmentId,
  MessageId,
  ProjectId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
} from "@marp/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as ProviderAdapter from "@marp/provider-core/server/ProviderAdapter";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import { CodexProviderCapabilitiesV2 } from "../orchestration-v2/Adapters/CodexAdapterV2.ts";
import * as Orchestrator from "../orchestration-v2/Orchestrator.ts";
import * as ProjectionStore from "../orchestration-v2/ProjectionStore.ts";
import * as ProviderAdapterRegistry from "../orchestration-v2/ProviderAdapterRegistry.ts";
import * as ThreadManagement from "../orchestration-v2/ThreadManagementService.ts";
import * as ProviderReplayHarness from "../orchestration-v2/testkit/ProviderReplayHarness.ts";
import type * as McpInvocationContext from "./McpInvocationContext.ts";
import * as ThreadMetadataMcpService from "./ThreadMetadataMcpService.ts";

const instanceId = ProviderInstanceId.make("codex");
const threadId = ThreadId.make("thread:status-update");
const adapter = {
  instanceId,
  driver: ProviderDriverKind.make("codex"),
  getCapabilities: () => Effect.succeed(CodexProviderCapabilitiesV2),
  planSelectionTransition: () => Effect.succeed({ type: "apply_on_next_turn" as const }),
  openSession: () => Effect.die("No provider process needed for status updates"),
} as ProviderAdapter.ProviderAdapterV2["Service"];
const layerDatabase = SqlitePersistence.layerMemory;
const layerOrchestrator = Layer.mergeAll(
  layerDatabase,
  ProjectionStore.layer.pipe(Layer.provide(layerDatabase)),
  ProviderReplayHarness.layerWithRegistry(
    { name: "status-update" },
    ProviderAdapterRegistry.layerFromAdapters([adapter]),
    { databaseLayer: layerDatabase, runEffectWorker: false },
  ),
);
/** The service reads and writes through the real orchestrator and projections. */
const layerThreads = Layer.effect(
  ThreadManagement.ThreadManagementService,
  Effect.gen(function* () {
    const orchestrator = yield* Orchestrator.OrchestratorV2;
    const projections = yield* ProjectionStore.ProjectionStoreV2;
    return ThreadManagement.ThreadManagementService.of({
      dispatch: orchestrator.dispatch,
      getThreadShell: projections.getThreadShell,
    } as unknown as ThreadManagement.ThreadManagementService["Service"]);
  }),
);
const layerTest = ThreadMetadataMcpService.layer.pipe(
  Layer.provideMerge(layerThreads),
  Layer.provideMerge(layerOrchestrator),
  Layer.provide(NodeCrypto.layer),
);

const scope: McpInvocationContext.McpInvocationScope = {
  environmentId: EnvironmentId.make("environment:status-update"),
  requestNamespace: "provider-session-status-update",
  thread: {
    threadId,
    providerSessionId: "provider-session-status-update",
    providerInstanceId: instanceId,
  },
  client: undefined,
  capabilities: new Set(["orchestration"]),
  issuedAt: 1,
};

it.layer(layerTest)((it) => {
  it.effect("posts a status update onto the thread's active run", () =>
    Effect.gen(function* () {
      const orchestrator = yield* Orchestrator.OrchestratorV2;
      const projections = yield* ProjectionStore.ProjectionStoreV2;
      const service = yield* ThreadMetadataMcpService.ThreadMetadataMcpService;
      yield* orchestrator.dispatch({
        type: "thread.create",
        commandId: CommandId.make("create-status-update"),
        threadId,
        projectId: ProjectId.make("project:status-update"),
        title: "Status update",
        modelSelection: { instanceId, model: "gpt-5.1-codex" },
        runtimeMode: "full-access",
        interactionMode: "default",
        branch: null,
        worktreePath: null,
        createdBy: "user",
        creationSource: "web",
      });
      const idle = yield* Effect.flip(service.postStatus(scope, { summary: "Reading the code" }));
      assert.equal(idle.code, "parent_not_active");

      yield* orchestrator.dispatch({
        type: "message.dispatch",
        commandId: CommandId.make("start-status-update"),
        threadId,
        messageId: MessageId.make("message:status-update"),
        text: "Refactor the parser",
        attachments: [],
        dispatchMode: { type: "start_immediately" },
        createdBy: "user",
        creationSource: "web",
      });
      const runId = (yield* projections.getThreadShell(threadId))?.activeRunId;
      assert.isString(runId);

      assert.deepEqual(
        yield* service.postStatus(scope, {
          summary: "Splitting the tokenizer",
          next: "Port the tests",
        }),
        { posted: true },
      );
      assert.deepEqual((yield* projections.getThread(threadId)).statusUpdate, {
        runId: runId!,
        summary: "Splitting the tokenizer",
        next: "Port the tests",
      });
      assert.deepEqual((yield* projections.getThreadShell(threadId))?.liveStatus, {
        summary: "Splitting the tokenizer",
        next: "Port the tests",
      });
    }),
  );
});
