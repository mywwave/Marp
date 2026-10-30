import { describe, expect, it } from "vite-plus/test";

import { nextStreamBoundaries, rehypeStreamChunks } from "./markdownStreamChunks";

const text = (value: string, start: number, end = start + value.length) => ({
  type: "text",
  value,
  position: { start: { offset: start }, end: { offset: end } },
});

type Node = { tagName?: string; value?: string; children?: Node[] };

function wrapped(boundaries: number[], children: Node[]) {
  const paragraph: Node = { tagName: "p", children };
  rehypeStreamChunks(boundaries)()({ type: "root", children: [paragraph] });
  return (paragraph.children ?? []).map((child) =>
    child.tagName === undefined
      ? child.value
      : `[${(child.children ?? []).map((inner) => inner.value).join("")}]`,
  );
}

describe("rehypeStreamChunks", () => {
  it("wraps each arrival since an earlier render, leaving older text plain", () => {
    expect(wrapped([6, 12], [text("Hello brave new world", 0)])).toEqual([
      "Hello ",
      "[brave ]",
      "[new world]",
    ]);
  });

  it("leaves code and text whose source differs from its value whole", () => {
    const code: Node = { tagName: "code", children: [text("abcdef", 0)] };
    wrapped([3], [code]);
    expect(code.children).toEqual([text("abcdef", 0)]);
    expect(wrapped([3], [text("a & b", 0, 9)])).toEqual(["a & b"]);
  });
});

describe("nextStreamBoundaries", () => {
  it("adds where the last render ended, keeps the latest ten and resets on a rewrite", () => {
    const ten = Array.from({ length: 10 }, (_, index) => index * 10);
    expect(nextStreamBoundaries(ten, 100, 120)).toEqual([...ten.slice(1), 100]);
    expect(nextStreamBoundaries([5], 20, 20)).toEqual([5]);
    expect(nextStreamBoundaries([5], 20, 10)).toEqual([]);
  });
});
