import {
  MessageId,
  NodeId,
  ProviderInstanceId,
  RunId,
  ThreadId,
  TurnItemId,
  type OrchestrationV2ConversationMessage,
  type OrchestrationV2ProviderFailureClass,
  type OrchestrationV2Run,
  type OrchestrationV2TurnItem,
} from "@marp/contracts";
import * as DateTime from "effect/DateTime";
import { describe, expect, it } from "vite-plus/test";

import { retryablePromptForFailedTurn } from "./retryFailedTurn";

const now = DateTime.makeUnsafe("2026-10-29T10:00:00.000Z");
const threadId = ThreadId.make("thread");

const failedRun: OrchestrationV2Run = {
  id: RunId.make("run"),
  threadId,
  ordinal: 1,
  providerInstanceId: ProviderInstanceId.make("claude"),
  modelSelection: { instanceId: ProviderInstanceId.make("claude"), model: "claude-haiku" },
  providerThreadId: null,
  userMessageId: MessageId.make("prompt"),
  rootNodeId: NodeId.make("root"),
  activeAttemptId: null,
  status: "failed",
  requestedAt: now,
  startedAt: now,
  completedAt: now,
  checkpointId: null,
  contextHandoffId: null,
};

const prompt: OrchestrationV2ConversationMessage = {
  createdBy: "user",
  creationSource: "web",
  id: MessageId.make("prompt"),
  threadId,
  runId: failedRun.id,
  nodeId: null,
  role: "user",
  text: "Fix the flaky test",
  attachments: [],
  streaming: false,
  createdAt: now,
  updatedAt: now,
};

function failure(failureClass: OrchestrationV2ProviderFailureClass): OrchestrationV2TurnItem {
  return {
    id: TurnItemId.make("error"),
    threadId,
    runId: failedRun.id,
    nodeId: failedRun.rootNodeId,
    providerThreadId: null,
    providerTurnId: null,
    nativeItemRef: null,
    parentItemId: null,
    ordinal: 1,
    type: "error",
    status: "failed",
    title: null,
    startedAt: now,
    completedAt: now,
    updatedAt: now,
    failure: { class: failureClass, message: "stream closed", code: null, retryable: null },
  };
}

describe("retryablePromptForFailedTurn", () => {
  it("resends the prompt of a turn that failed on a transient error", () => {
    for (const failureClass of ["transport_error", "provider_error", "unknown"] as const) {
      expect(
        retryablePromptForFailedTurn({
          runs: [failedRun],
          messages: [prompt],
          turnItems: [failure(failureClass)],
        }),
      ).toBe("Fix the flaky test");
    }
  });

  it("offers nothing for failures a resend repeats or the server resumes", () => {
    for (const failureClass of ["validation_error", "permission_error", "usage_limit"] as const) {
      expect(
        retryablePromptForFailedTurn({
          runs: [failedRun],
          messages: [prompt],
          turnItems: [failure(failureClass)],
        }),
      ).toBeNull();
    }
  });

  it("offers nothing once a later turn ran or when the prompt would not survive a resend", () => {
    const turnItems = [failure("transport_error")];
    const later = {
      ...failedRun,
      id: RunId.make("later"),
      ordinal: 2,
      status: "completed" as const,
    };
    expect(
      retryablePromptForFailedTurn({ runs: [failedRun, later], messages: [prompt], turnItems }),
    ).toBeNull();
    const attachment = {
      type: "file" as const,
      id: "file-1",
      name: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 4,
    };
    for (const message of [
      { ...prompt, attachments: [attachment] },
      { ...prompt, senderThreadId: ThreadId.make("parent") },
      { ...prompt, text: "   " },
    ]) {
      expect(
        retryablePromptForFailedTurn({ runs: [failedRun], messages: [message], turnItems }),
      ).toBeNull();
    }
  });
});
