import { describe, expect, it } from "vite-plus/test";

import { createTimelineRowEnterGate } from "./timelineRowEnter";

const rows = (...ids: string[]) => ids.map((id) => ({ id }));

describe("createTimelineRowEnterGate", () => {
  it("plays entries only for rows appended after the list settled, once", () => {
    const gate = createTimelineRowEnterGate();
    gate.observe("thread-a", rows("a", "b"), true);
    gate.observe("thread-a", rows("a", "b"), false);
    expect(gate.claim("a", 0)).toBeNull();
    expect(gate.claim("b", 0)).toBeNull();

    // An earlier page loads above, and a new row arrives at the end.
    gate.observe("thread-a", rows("earlier", "a", "b", "c"), false);
    expect(gate.claim("earlier", 0)).toBeNull();
    expect(gate.claim("c", 0)).toBe("live");

    gate.stamp(0);
    gate.consume("c");
    expect(gate.claim("c", 10)).toBeNull();

    // Appended while scrolled away: a mount long after the commit is a scroll, not an arrival.
    gate.observe("thread-a", rows("earlier", "a", "b", "c", "d"), false);
    gate.stamp(100);
    expect(gate.claim("d", 5000)).toBeNull();

    // A thread switch starts over: its history never plays.
    gate.observe("thread-b", rows("x"), true);
    gate.observe("thread-b", rows("x"), false);
    expect(gate.claim("x", 5000)).toBeNull();

    gate.setRevealing(true);
    expect(gate.claim("x", 5000)).toBe("reveal");
  });
});
