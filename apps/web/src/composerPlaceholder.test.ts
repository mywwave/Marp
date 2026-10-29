import { describe, expect, it } from "vite-plus/test";

import { resolveComposerPlaceholder } from "./composerPlaceholder";

describe("resolveComposerPlaceholder", () => {
  it.each([
    [{}, "Ask Claude to…"],
    [{ running: true }, "Steer Claude, or queue a follow-up…"],
    [{ newThread: true, running: true }, "Describe a task, paste an error, or @ a file…"],
    [
      { planFollowUp: true, running: true },
      "Add feedback to refine the plan, or leave this blank to implement it",
    ],
    [
      { approvalPending: true, question: "custom" as const, running: true },
      "Tell Claude what to do instead…",
    ],
    [{ question: "choice-only" as const }, "Choose an option above"],
    [
      { projectSelectionRequired: true, newThread: true },
      "Choose a project above to start a thread",
    ],
    [
      { providerUnavailable: true, newThread: true },
      "Enable a provider in Settings to send a message",
    ],
  ])("%o -> %s", (state, expected) => {
    expect(resolveComposerPlaceholder({ agentName: "Claude", ...state })).toBe(expected);
  });

  it("names the agent generically when no provider is selected", () => {
    expect(resolveComposerPlaceholder({ agentName: null })).toBe("Ask the agent to…");
  });
});
