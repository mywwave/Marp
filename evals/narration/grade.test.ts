import { assert, it } from "vite-plus/test";

import { gradeNarration, type NarrationExpect, type NarrationRun } from "./grade.ts";

const expect: NarrationExpect = {
  leadShare: 0.5,
  leadMaxWords: 12,
  finalMinWords: 3,
  finalMaxWords: 20,
  firstBatchMin: 2,
  textMust: ["```\\d+:\\d+:\\S+"],
  textMustNot: ["^#{1,6} "],
};
const failed = (run: NarrationRun) =>
  gradeNarration(expect, run)
    .filter((check) => !check.pass)
    .map((check) => check.check);

it("passes short notes before each batch, parallel reads and a short close", () => {
  assert.deepEqual(
    failed({
      steps: [
        { text: "", tools: 2 },
        { text: "Found the cap in client.ts; fixing it.", tools: 1 },
        { text: "Fixed the retry cap:\n```7:12:src/client.ts\n…\n```", tools: 0 },
      ],
      finalText: "Fixed the retry cap; the loop now stops.",
      ended: true,
    }),
    [],
  );
});

it("names every rule a silent, serial, rambling run breaks", () => {
  assert.deepEqual(
    failed({
      steps: [
        { text: "", tools: 1 },
        { text: "", tools: 1 },
        { text: "", tools: 1 },
        {
          text: "I am now going to look very carefully through every remaining file in the repository.",
          tools: 1,
        },
        { text: "## Summary\nDone.", tools: 0 },
      ],
      finalText: "## Summary\nDone.",
      ended: true,
    }),
    [
      "leadShare >= 0.5",
      "leadMaxWords <= 12",
      "firstBatchMin >= 2",
      "textMust /```\\d+:\\d+:\\S+/",
      "textMustNot /^#{1,6} /",
    ],
  );
});

it("fails the closing checks when the turn never ended", () => {
  const checks = gradeNarration(
    { finalMinWords: 1, finalMaxWords: 50 },
    { steps: [{ text: "", tools: 1 }], finalText: "", ended: false },
  );
  assert.deepEqual(
    checks.map((check) => check.pass),
    [false, false],
  );
});
