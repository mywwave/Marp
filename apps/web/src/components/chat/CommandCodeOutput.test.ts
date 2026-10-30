import { describe, expect, it } from "vite-plus/test";

import { commandCodeLanguage, commandCodeTarget } from "./CommandCodeOutput";

describe("commandCodeTarget", () => {
  it.each([
    ["sed -n '120,180p' src/a.ts", { path: "src/a.ts", startLine: 120 }],
    ["cat src/a.ts", { path: "src/a.ts", startLine: 1 }],
    ["head -40 src/a.ts", { path: "src/a.ts", startLine: 1 }],
    ["tail -n 20 src/a.ts", { path: "src/a.ts", startLine: null }],
    ["cat src/a.ts | tail -5", { path: "src/a.ts", startLine: null }],
    ["wc -l src/a.ts", undefined],
    ["cat a.ts b.ts", undefined],
    ["rg foo src", undefined],
    ["pnpm test", undefined],
  ])("%s", (command, target) => {
    expect(commandCodeTarget(command)).toEqual(target);
  });
});

describe("commandCodeLanguage", () => {
  const target = { path: "src/a.ts", startLine: 1 };
  it.each([
    ["const a = 1;\n", "typescript"],
    ["     1\tconst a = 1;\n     2\tconst b = 2;\n", null],
  ])("%j", (text, language) => {
    expect(commandCodeLanguage(target, text)).toBe(language);
  });

  it("leaves plain text files plain", () => {
    expect(commandCodeLanguage({ path: "notes", startLine: 1 }, "hello")).toBeNull();
  });
});
