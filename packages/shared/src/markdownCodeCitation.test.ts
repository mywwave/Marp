import { describe, expect, it } from "vite-plus/test";

import { codeCitationRange, parseCodeCitation } from "./markdownCodeCitation.ts";

describe("parseCodeCitation", () => {
  it.each([
    ["12:15:src/app.ts", { startLine: 12, endLine: 15, path: "src/app.ts" }],
    ["3:3:C:/repo/a b.ts", { startLine: 3, endLine: 3, path: "C:/repo/a b.ts" }],
    ["ts", null],
    ["0:4:a.ts", null],
    ["9:2:a.ts", null],
    ["12:15:", null],
    [undefined, null],
  ])("reads %s", (info, citation) => {
    expect(parseCodeCitation(info)).toEqual(citation);
  });

  it("names one line or a range", () => {
    expect(codeCitationRange({ startLine: 4, endLine: 4, path: "a.ts" })).toBe("line 4");
    expect(codeCitationRange({ startLine: 4, endLine: 9, path: "a.ts" })).toBe("lines 4–9");
  });
});
