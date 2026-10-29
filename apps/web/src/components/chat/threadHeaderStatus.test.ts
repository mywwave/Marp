import { describe, expect, it } from "vite-plus/test";

import { resolveThreadHeaderStatus } from "./threadHeaderStatus";

const idle = {
  awaiting: null,
  planReady: false,
  working: false,
  workStartedAt: null,
  latestRunStatus: null,
} as const;

describe("resolveThreadHeaderStatus", () => {
  it.each([
    [{ ...idle, awaiting: "approval", working: true }, "Approval needed"],
    [{ ...idle, awaiting: "input", working: true }, "Question"],
    [{ ...idle, working: true, planReady: true, latestRunStatus: "failed" }, "Working"],
    [{ ...idle, planReady: true, latestRunStatus: "completed" }, "Plan ready"],
    [{ ...idle, latestRunStatus: "failed" }, "Failed"],
    [{ ...idle, latestRunStatus: "completed" }, "Done"],
    [{ ...idle, latestRunStatus: "interrupted" }, null],
    [idle, null],
  ] as const)("%j shows %s", (input, label) => {
    expect(resolveThreadHeaderStatus(input)?.label ?? null).toBe(label);
  });
});
