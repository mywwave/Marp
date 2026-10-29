import type {
  OrchestrationV2ConversationMessage,
  OrchestrationV2ProviderFailureClass,
  OrchestrationV2Run,
} from "@marp/contracts";
import {
  latestExecutedRun,
  latestRootProviderFailure,
} from "@marp/shared/orchestrationV2ThreadError";

// Failures a fresh attempt can clear. A rejected request or a denied permission fails again.
const RETRYABLE_FAILURE_CLASSES = new Set<OrchestrationV2ProviderFailureClass>([
  "transport_error",
  "provider_error",
  "unknown",
]);

/**
 * The prompt to send again when the latest turn failed in a way the server cannot resume. Only a
 * plain typed prompt qualifies: attachments and attached context would not survive a resend.
 */
export function retryablePromptForFailedTurn(input: {
  readonly runs: ReadonlyArray<OrchestrationV2Run>;
  readonly messages: ReadonlyArray<OrchestrationV2ConversationMessage>;
  readonly turnItems: Parameters<typeof latestRootProviderFailure>[1];
}): string | null {
  const run = latestExecutedRun(input.runs);
  if (run?.status !== "failed" || run.delegatedTaskId !== undefined) return null;
  const failure = latestRootProviderFailure(run, input.turnItems);
  if (failure === null || !RETRYABLE_FAILURE_CLASSES.has(failure.class)) return null;
  const message = input.messages.find((candidate) => candidate.id === run.userMessageId);
  if (
    message === undefined ||
    message.role !== "user" ||
    message.attachments.length > 0 ||
    message.context !== undefined ||
    message.workflowScript === true ||
    message.senderThreadId !== undefined ||
    message.scheduledTaskId !== undefined
  ) {
    return null;
  }
  return message.text.trim().length > 0 ? message.text : null;
}
