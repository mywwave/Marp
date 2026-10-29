import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { ThreadMetadataMcpUpdateInput, ThreadStatusMcpUpdateInput } from "./threadMetadataMcp.ts";

const decodeUpdate = Schema.decodeUnknownSync(ThreadMetadataMcpUpdateInput);

describe("ThreadMetadataMcpUpdateInput", () => {
  it("rejects malformed client request ids without normalizing valid keys", () => {
    const validKey = "metadata-\ud83d\ude80-1";
    assert.equal(
      decodeUpdate({ action: "regenerate_title", clientRequestId: validKey }).clientRequestId,
      validKey,
    );
    assert.throws(() =>
      decodeUpdate({ action: "regenerate_title", clientRequestId: "metadata-\ud800" }),
    );
    assert.throws(() =>
      decodeUpdate({ action: "regenerate_title", clientRequestId: "metadata-\udc00" }),
    );
  });
});

describe("ThreadStatusMcpUpdateInput", () => {
  const decodeStatus = Schema.decodeUnknownSync(ThreadStatusMcpUpdateInput);

  it("keeps the summary and next step to one 140-character line each", () => {
    const line = "x".repeat(140);
    assert.deepEqual(decodeStatus({ summary: ` ${line} `, next: line }), {
      summary: line,
      next: line,
    });
    assert.throws(() => decodeStatus({ summary: `${line}x` }));
    assert.throws(() => decodeStatus({ summary: line, next: `${line}x` }));
    assert.throws(() => decodeStatus({ summary: "   " }));
    assert.throws(() => decodeStatus({ next: "Port the tests" }));
  });
});
