/** What the empty composer invites, by the moment it is in; the first matching state wins. */
export function resolveComposerPlaceholder(input: {
  readonly agentName: string | null;
  readonly approvalPending?: boolean;
  readonly question?: "choice-only" | "custom" | null;
  readonly planFollowUp?: boolean;
  readonly projectSelectionRequired?: boolean;
  readonly providerUnavailable?: boolean;
  readonly newThread?: boolean;
  readonly running?: boolean;
}): string {
  const agent = input.agentName ?? "the agent";
  if (input.approvalPending) return `Tell ${agent} what to do instead…`;
  if (input.question === "choice-only") return "Choose an option above";
  if (input.question === "custom") {
    return "Type your own answer, or leave this blank to use the selected option";
  }
  if (input.planFollowUp) {
    return "Add feedback to refine the plan, or leave this blank to implement it";
  }
  if (input.projectSelectionRequired) return "Choose a project above to start a thread";
  if (input.providerUnavailable) return "Enable a provider in Settings to send a message";
  if (input.newThread) return "Describe a task, paste an error, or @ a file…";
  if (input.running) return `Steer ${agent}, or queue a follow-up…`;
  return `Ask ${agent} to…`;
}
