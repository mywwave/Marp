import { describe, expect, it } from "vite-plus/test";

import { summarizeTurnDiffStats } from "./turnDiffStats";

describe("summarizeTurnDiffStats", () => {
  it("adds up every file the turn changed", () => {
    expect(
      summarizeTurnDiffStats([
        { path: "src/a.ts", kind: "modified", additions: 12, deletions: 3 },
        { path: "src/new.ts", kind: "added", additions: 40, deletions: 0 },
        { path: "old.ts", kind: "deleted", additions: 0, deletions: 9 },
      ]),
    ).toEqual({ additions: 52, deletions: 12 });
  });
});
