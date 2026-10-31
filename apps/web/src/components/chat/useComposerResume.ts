import {
  type EnvironmentId,
  type ProviderInteractionMode,
  type RunId,
  type RuntimeMode,
} from "@marp/contracts";
import type { EnvironmentThreadShell } from "@marp/client-runtime/state/shell";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@marp/client-runtime/state/runtime";
import { useState } from "react";
import { newMessageId } from "~/lib/utils";
import type { ComposerHandleRef } from "../../composerHandleContext";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import type { makeThreadErrorSetter } from "../ChatView.logic";
import { draftSendState } from "./chatViewSend";
import type { useTimelineFollow } from "./useTimelineFollow";
import type { useUsageLimitsPanel } from "./useUsageLimitsPanel";

const RESUME_PROMPT = "Continue where you left off.";

interface ComposerResumeInput {
  readonly environmentId: EnvironmentId;
  readonly routeThreadKey: string;
  readonly currentRouteThreadKeyRef: { readonly current: string | null };
  readonly activeThread: EnvironmentThreadShell | undefined;
  readonly resumableRunId: RunId | null;
  /** The failed turn's prompt, when the server cannot resume it but a resend is safe. */
  readonly retryPrompt: string | null;
  readonly hasHeldQueuedRuns: boolean;
  readonly isSendBusy: boolean;
  readonly isRevertingCheckpoint: boolean;
  readonly threadDetailLoading: boolean;
  readonly activeEnvironmentUnavailable: boolean;
  readonly runtimeMode: RuntimeMode;
  readonly interactionMode: ProviderInteractionMode;
  readonly localCheckoutBranchMismatch: { readonly currentBranch: string } | null;
  readonly composerRef: ComposerHandleRef;
  readonly persistThreadSettingsForNextTurn: (input: {
    threadId: EnvironmentThreadShell["id"];
    createdAt: string;
    branch?: string;
    runtimeMode: RuntimeMode;
    interactionMode: ProviderInteractionMode;
  }) => Promise<AtomCommandResult<void, unknown>>;
  readonly clearUsageLimitsFor: ReturnType<typeof useUsageLimitsPanel>["clearFor"];
  readonly scrollToEnd: ReturnType<typeof useTimelineFollow>["scrollToEnd"];
  readonly setThreadError: ReturnType<typeof makeThreadErrorSetter>;
}

/**
 * Resumes an interrupted run ("Continue where you left off.") and/or releases the turns held
 * in its queue, or retries a failed turn by sending its prompt again. Shares the per-route send
 * lock with the composer's send paths.
 */
export function useComposerResume(input: ComposerResumeInput) {
  const {
    environmentId,
    routeThreadKey,
    currentRouteThreadKeyRef,
    activeThread,
    resumableRunId,
    retryPrompt,
    hasHeldQueuedRuns,
    isSendBusy,
    isRevertingCheckpoint,
    threadDetailLoading,
    activeEnvironmentUnavailable,
    runtimeMode,
    interactionMode,
    localCheckoutBranchMismatch,
    composerRef,
    persistThreadSettingsForNextTurn,
    clearUsageLimitsFor,
    scrollToEnd,
    setThreadError,
  } = input;
  const startThreadTurn = useOrchestrationCommand(threadEnvironment.startTurn, {
    reportFailure: false,
  });
  const resumeThreadQueue = useOrchestrationCommand(threadEnvironment.resumeThreadQueue, {
    reportFailure: false,
  });
  const [resumingThreadKeys, setResumingThreadKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const isResuming = resumingThreadKeys.has(routeThreadKey);
  const { sendInFlight: sendInFlightRef } = draftSendState(routeThreadKey);

  const run = async (mode: "resume" | "retry") => {
    if (
      !activeThread ||
      (mode === "resume" ? resumableRunId === null && !hasHeldQueuedRuns : retryPrompt === null) ||
      isSendBusy ||
      isResuming ||
      isRevertingCheckpoint ||
      threadDetailLoading ||
      activeEnvironmentUnavailable ||
      sendInFlightRef.current
    ) {
      return;
    }
    const threadId = activeThread.id;
    sendInFlightRef.current = true;
    setResumingThreadKeys((current) => new Set(current).add(routeThreadKey));
    setThreadError(threadId, null);
    // Commands settle into a result, so this always runs.
    const resume = async () => {
      if (mode === "resume" && resumableRunId === null) {
        return resumeThreadQueue({ environmentId, input: { threadId } });
      }
      // Read before the first await: the composer follows the route, so after the user switches
      // threads it holds the other thread's model.
      const modelSelection = composerRef.current?.getSendContext().selectedModelSelection;
      const createdAt = new Date().toISOString();
      const settingsResult = await persistThreadSettingsForNextTurn({
        threadId,
        createdAt,
        ...(localCheckoutBranchMismatch
          ? { branch: localCheckoutBranchMismatch.currentBranch }
          : {}),
        runtimeMode,
        interactionMode,
      });
      if (settingsResult._tag === "Failure") return settingsResult;
      const turnResult = await startThreadTurn({
        environmentId,
        input: {
          threadId,
          ...(mode === "resume" && resumableRunId !== null
            ? { manualContinuationOfRunId: resumableRunId }
            : {}),
          ...(modelSelection ? { modelSelection } : {}),
          message: {
            messageId: newMessageId(),
            role: "user",
            text: mode === "retry" && retryPrompt !== null ? retryPrompt : RESUME_PROMPT,
            attachments: [],
          },
          runtimeMode,
          interactionMode,
          dispatchMode: "start",
        },
      });
      if (turnResult._tag === "Failure" || mode === "retry" || !hasHeldQueuedRuns) {
        return turnResult;
      }
      clearUsageLimitsFor(routeThreadKey);
      return resumeThreadQueue({ environmentId, input: { threadId } });
    };
    const result = await resume();
    if (result._tag === "Failure") {
      if (!isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        setThreadError(
          threadId,
          error instanceof Error
            ? error.message
            : mode === "retry"
              ? "Could not retry the turn."
              : "Could not resume thread.",
        );
      }
    } else {
      clearUsageLimitsFor(routeThreadKey);
      if (currentRouteThreadKeyRef.current === routeThreadKey) scrollToEnd();
    }
    sendInFlightRef.current = false;
    setResumingThreadKeys((current) => {
      const next = new Set(current);
      next.delete(routeThreadKey);
      return next;
    });
  };

  return {
    onResume: () => run("resume"),
    onRetryFailedTurn: () => run("retry"),
    isResuming,
  };
}
