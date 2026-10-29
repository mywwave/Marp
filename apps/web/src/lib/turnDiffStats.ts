import type { TurnDiffFileChange } from "../types";

/** A turn's line totals across its changed files, for the "Changes +N −M" pill. */
export function summarizeTurnDiffStats(files: ReadonlyArray<TurnDiffFileChange>) {
  let additions = 0;
  let deletions = 0;
  for (const file of files) {
    additions += file.additions;
    deletions += file.deletions;
  }
  return { additions, deletions };
}
