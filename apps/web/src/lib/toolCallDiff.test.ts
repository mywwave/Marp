import { describe, expect, it } from "vite-plus/test";
import { getRenderablePatch, resolveFileDiffPath } from "./diffRendering";
import {
  changedLinesScrollLeft,
  firstChangedLine,
  toolCallDiff,
  toolCallFileDiff,
} from "./toolCallDiff";

describe("toolCallDiff", () => {
  it("renders recorded hunks without reading a repository, including renamed paths", () => {
    for (const changes of [
      undefined,
      [{ operation: "update", oldPath: "old.ts", path: "new.ts" }],
    ]) {
      const { patch } = toolCallDiff({
        fileName: "old.ts",
        diffStr: "@@ -1 +1 @@\n-before\n+after\n",
        ...(changes ? { changes } : {}),
      });
      const rendered = getRenderablePatch(patch);
      expect(rendered?.kind).toBe("files");
      if (rendered?.kind !== "files") throw new Error("Expected a file diff");
      expect(rendered.files).toHaveLength(1);
      expect(resolveFileDiffPath(rendered.files[0]!)).toBe(changes ? "new.ts" : "old.ts");
      expect(rendered.files[0]!.additionLines.join("")).toContain("after");
      expect(rendered.files[0]!.deletionLines.join("")).toContain("before");
    }
  });

  it("renders added and deleted file contents as a file diff", () => {
    for (const operation of ["add", "delete"]) {
      for (const [content, ending] of [
        ["first\nsecond", ""],
        ["@@ -0,0 +1 @@\n+content", "\n"],
        ["@@ -1 +0,0 @@\n-content", "\n"],
        ["first\nsecond", "\n"],
        ["--- notes\nsecond", "\n"],
        ["diff --git notes\nsecond", "\n"],
        ["--- a/embedded.ts\n+++ b/embedded.ts\n@@ -1 +1 @@\n-before\n+after", "\n"],
        [
          "diff --git a/embedded.ts b/embedded.ts\n--- a/embedded.ts\n+++ b/embedded.ts\n@@ -1 +1 @@\n-before\n+after",
          "\n",
        ],
      ] as const) {
        const recordedContent = `${content}${ending}`;
        const rendered = getRenderablePatch(
          toolCallDiff({
            fileName: "file with spaces.ts",
            diffStr: recordedContent,
            changes: [{ operation, path: "file with spaces.ts" }],
          }).patch,
        );
        expect(rendered?.kind).toBe("files");
        if (rendered?.kind !== "files") throw new Error("Expected a file diff");
        expect(resolveFileDiffPath(rendered.files[0]!)).toBe("file with spaces.ts");
        const file = rendered.files[0]!;
        const lines = content.split("\n").length;
        expect(file.additionLines).toHaveLength(operation === "add" ? lines : 0);
        expect(file.deletionLines).toHaveLength(operation === "delete" ? lines : 0);
        expect((operation === "add" ? file.additionLines : file.deletionLines).join("")).toBe(
          recordedContent.replace(/\n$/, ""),
        );
      }
    }
  });

  it("keeps content-only writes out of the patch and preserves empty recorded content", () => {
    for (const operation of ["add", "delete"]) {
      expect(
        toolCallDiff({
          fileName: "empty.ts",
          diffStr: "",
          changes: [{ operation, path: "empty.ts" }],
        }).content,
      ).toEqual([
        {
          label: operation === "add" ? "Recorded content after" : "Recorded content before",
          text: "",
        },
      ]);
    }
    expect(toolCallDiff({ fileName: "a.ts", oldStr: "before", newStr: "" })).toEqual({
      patch: undefined,
      content: [
        { label: "Recorded content before", text: "before" },
        { label: "Recorded content after", text: "" },
      ],
      truncated: false,
    });
    expect(toolCallDiff({ fileName: "a.ts", newStr: "after" }).content).toEqual([
      { label: "Recorded content after", text: "after" },
    ]);
  });

  it("removes transport truncation markers before converting file contents", () => {
    const suffix = "\n… output truncated for transport";
    const diff = toolCallDiff({
      fileName: "a.ts",
      diffStr: `first\nsecond${suffix}`,
      changes: [{ operation: "add", path: "a.ts" }],
    });
    expect(diff.truncated).toBe(true);
    expect(diff.patch).not.toContain("output truncated");
    expect(getRenderablePatch(diff.patch)?.kind).toBe("files");
    expect(toolCallDiff({ fileName: "a.ts", newStr: `content${suffix}` })).toMatchObject({
      content: [{ label: "Recorded content after", text: "content" }],
      truncated: true,
    });
  });

  it("preserves complete patches and unsupported provider output", () => {
    for (const operation of ["add", "delete"]) {
      const diffStr = [
        "diff --git a/a.ts b/a.ts",
        `--- ${operation === "add" ? "/dev/null" : "a/a.ts"}`,
        `+++ ${operation === "add" ? "b/a.ts" : "/dev/null"}`,
        operation === "add" ? "@@ -0,0 +1 @@" : "@@ -1 +0,0 @@",
        operation === "add" ? "+content" : "-content",
        "",
      ].join("\n");
      expect(
        toolCallDiff({ fileName: "a.ts", diffStr, changes: [{ operation, path: "a.ts" }] }).patch,
      ).toBe(diffStr);
    }
    for (const diffStr of [
      undefined,
      "",
      "provider output",
      "--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-a\n+b\n",
    ]) {
      expect(
        toolCallDiff({ fileName: "a.ts", ...(diffStr === undefined ? {} : { diffStr }) }).patch,
      ).toBe(diffStr);
    }
  });
});

describe("toolCallFileDiff", () => {
  const fileDiffOf = (item: Parameters<typeof toolCallFileDiff>[0]) => {
    const result = toolCallFileDiff(item);
    if (result?.kind !== "diff") throw new Error("Expected a file diff");
    return result;
  };

  it("numbers lines from a recorded patch", () => {
    const result = fileDiffOf({
      fileName: "a.ts",
      diffStr: "@@ -4,2 +4,2 @@\n ctx\n-old\n+new\n",
    });
    expect(result.lineNumbers).toBe(true);
    expect(result.fileDiff.hunks[0]?.additionStart).toBe(4);
  });

  it("diffs recorded snippets without line numbers", () => {
    const result = fileDiffOf({ fileName: "a.ts", oldStr: "a\nb", newStr: "a\nc" });
    expect(result.lineNumbers).toBe(false);
    expect(result.fileDiff.hunks[0]).toMatchObject({ additionLines: 1, deletionLines: 1 });
  });

  it("keeps a Claude create patch with an absolute path a real patch", () => {
    const path = "D:\\repo\\src\\new.ts";
    const result = fileDiffOf({
      fileName: path,
      diffStr: `--- /dev/null\n+++ ${path}\n@@ -0,0 +1,2 @@\n+one\n+two\n`,
      changes: [{ operation: "add", path }],
    });
    expect(result.fileDiff.additionLines.join("")).toBe("one\ntwo");
  });

  it("refuses new files and snippets too large to diff", () => {
    const lines = (count: number) => Array.from({ length: count }, (_, i) => `${i}`).join("\n");
    expect(
      toolCallFileDiff({
        fileName: "big.ts",
        diffStr: lines(20_001),
        changes: [{ operation: "add", path: "big.ts" }],
      }),
    ).toEqual({ kind: "too-large" });
    expect(
      toolCallFileDiff({ fileName: "a.ts", oldStr: lines(3_000), newStr: lines(3_000) }),
    ).toEqual({ kind: "too-large" });
  });

  it("has nothing to show without recorded changes", () => {
    expect(toolCallFileDiff({ fileName: "a.ts" })).toBeNull();
  });
});

describe("firstChangedLine", () => {
  it.each([
    ["@@ -10,7 +10,7 @@\n a\n b\n c\n-old\n+new\n d\n e\n f\n", 13],
    ["@@ -3,4 +3,3 @@\n a\n-gone\n b\n c\n", 4],
    ["@@ -0,0 +1,2 @@\n+one\n+two\n", 1],
  ])("finds the first change in %j", (diffStr, line) => {
    const { fileDiff } = fileDiffOfPatch(diffStr);
    expect(firstChangedLine(fileDiff)).toBe(line);
  });
});

describe("changedLinesScrollLeft", () => {
  it.each([
    ["deep changes skip their margin", "            old", "            new", 10 * 7],
    ["shallow changes stay at the start", "        old", "        new", 0],
    ["the shallowest changed line wins", "              old", "          new", 8 * 7],
    ["tabs count four columns", "\t\t\told", "\t\t\tnew", 10 * 7],
  ])("%s", (_name, before, after, scrollLeft) => {
    const { fileDiff } = fileDiffOfPatch(
      `@@ -1,3 +1,3 @@\n ctx\n-${before}\n+${after}\n${" ".repeat(1)}\n`,
    );
    expect(changedLinesScrollLeft(fileDiff, 7)).toBe(scrollLeft);
  });
});

function fileDiffOfPatch(diffStr: string) {
  const result = toolCallFileDiff({ fileName: "a.ts", diffStr });
  if (result?.kind !== "diff") throw new Error("Expected a file diff");
  return result;
}
