/** One model response: its visible text and how many tools it called. */
export type NarrationStep = { readonly text: string; readonly tools: number };

export type NarrationRun = {
  readonly steps: ReadonlyArray<NarrationStep>;
  /** The final answer, when the agent ended its turn. */
  readonly finalText: string;
  readonly ended: boolean;
};

/** How the agent talks while it works, and what its visible text must or must not say. */
export type NarrationExpect = {
  /** Least share of tool-calling responses, after the first, that carry a note to the user. */
  readonly leadShare?: number;
  /** Most words in any one of those notes. */
  readonly leadMaxWords?: number;
  /** Final answer word bounds: a summary was written, and it stayed short. */
  readonly finalMinWords?: number;
  readonly finalMaxWords?: number;
  /** Least tool calls in the first tool-calling response: independent reads go out together. */
  readonly firstBatchMin?: number;
  /** Multiline regexes on all visible text. */
  readonly textMust?: ReadonlyArray<string>;
  readonly textMustNot?: ReadonlyArray<string>;
};

export type NarrationCheck = { readonly check: string; readonly pass: boolean };

const words = (value: string) => value.split(/\s+/).filter(Boolean).length;

export const gradeNarration = (
  expect: NarrationExpect,
  run: NarrationRun,
): ReadonlyArray<NarrationCheck> => {
  const checks: Array<NarrationCheck> = [];
  const add = (check: string, pass: boolean) => checks.push({ check, pass });
  // The first response may open straight into its reads; every later batch follows a result.
  const batches = run.steps.filter((step) => step.tools > 0);
  const later = batches.slice(1);
  if (expect.leadShare !== undefined) {
    const share = later.length === 0 ? 1 : later.filter((step) => step.text).length / later.length;
    add(`leadShare >= ${expect.leadShare}`, share >= expect.leadShare);
  }
  if (expect.leadMaxWords !== undefined) {
    const max = expect.leadMaxWords;
    add(
      `leadMaxWords <= ${max}`,
      batches.every((step) => words(step.text) <= max),
    );
  }
  const final = words(run.finalText);
  if (expect.finalMinWords !== undefined)
    add(`finalMinWords >= ${expect.finalMinWords}`, run.ended && final >= expect.finalMinWords);
  if (expect.finalMaxWords !== undefined)
    add(`finalMaxWords <= ${expect.finalMaxWords}`, run.ended && final <= expect.finalMaxWords);
  if (expect.firstBatchMin !== undefined)
    add(
      `firstBatchMin >= ${expect.firstBatchMin}`,
      (batches[0]?.tools ?? 0) >= expect.firstBatchMin,
    );
  const text = [...run.steps.map((step) => step.text), run.finalText].join("\n\n");
  for (const pattern of expect.textMust ?? [])
    add(`textMust /${pattern}/`, new RegExp(pattern, "m").test(text));
  for (const pattern of expect.textMustNot ?? [])
    add(`textMustNot /${pattern}/`, !new RegExp(pattern, "m").test(text));
  return checks;
};
