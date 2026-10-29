import type { OrchestrationV2RunStatus } from "@marp/contracts";

export type ThreadHeaderStatus =
  | { readonly family: "working"; readonly label: "Working"; readonly startedAt: string | null }
  | {
      readonly family: "needs-you";
      readonly label: "Approval needed" | "Question" | "Plan ready";
    }
  | { readonly family: "failed"; readonly label: "Failed" }
  | { readonly family: "done"; readonly label: "Done" };

/** One header pill per thread: a waiting decision outranks work, work outranks the last outcome. */
export function resolveThreadHeaderStatus(input: {
  readonly awaiting: "approval" | "input" | null;
  readonly planReady: boolean;
  readonly working: boolean;
  readonly workStartedAt: string | null;
  readonly latestRunStatus: OrchestrationV2RunStatus | null;
}): ThreadHeaderStatus | null {
  if (input.awaiting === "approval") return { family: "needs-you", label: "Approval needed" };
  if (input.awaiting === "input") return { family: "needs-you", label: "Question" };
  if (input.working) return { family: "working", label: "Working", startedAt: input.workStartedAt };
  if (input.planReady) return { family: "needs-you", label: "Plan ready" };
  if (input.latestRunStatus === "failed") return { family: "failed", label: "Failed" };
  if (input.latestRunStatus === "completed") return { family: "done", label: "Done" };
  return null;
}
