import { describe, expect, it } from "vite-plus/test";

import {
  filterArchivedThreads,
  groupArchivedThreadsByRecency,
  toggleAllVisibleArchived,
  toggleArchivedSelection,
} from "./ArchivedThreadsPanel.logic";

const thread = (key: string, title: string, projectTitle: string, archivedAt: string) => ({
  key,
  title,
  projectTitle,
  archivedAt,
});

const threads = [
  thread("a", "Fix auth flow", "web", "2026-10-28T10:00:00.000Z"),
  thread("b", "SSR events", "Marp", "2026-10-20T10:00:00.000Z"),
  thread("c", "Review changes", "server", "2026-09-14T10:00:00.000Z"),
];

describe("archived threads", () => {
  it("filters by title or project, case-insensitively", () => {
    expect(filterArchivedThreads(threads, "  AUTH ").map((entry) => entry.key)).toEqual(["a"]);
    expect(filterArchivedThreads(threads, "marp").map((entry) => entry.key)).toEqual(["b"]);
    expect(filterArchivedThreads(threads, "")).toBe(threads);
  });

  it("splits this week from earlier and drops empty groups", () => {
    const groups = groupArchivedThreadsByRecency(threads, "2026-10-29T12:00:00.000Z");
    expect(groups.map((group) => [group.label, group.threads.map((entry) => entry.key)])).toEqual([
      ["This week", ["a"]],
      ["Earlier", ["b", "c"]],
    ]);
    expect(
      groupArchivedThreadsByRecency(threads.slice(2), "2026-10-29T12:00:00.000Z").map(
        (group) => group.label,
      ),
    ).toEqual(["Earlier"]);
  });

  it("toggles one row and selects or clears all visible rows", () => {
    expect([...toggleArchivedSelection(new Set(["a"]), "a")]).toEqual([]);
    expect([...toggleArchivedSelection(new Set(["a"]), "b")]).toEqual(["a", "b"]);

    // A partial selection selects every visible row and keeps hidden selections.
    expect([...toggleAllVisibleArchived(new Set(["a", "z"]), ["a", "b"])].toSorted()).toEqual([
      "a",
      "b",
      "z",
    ]);
    // A full visible selection clears only the visible rows.
    expect([...toggleAllVisibleArchived(new Set(["a", "b", "z"]), ["a", "b"])]).toEqual(["z"]);
    expect([...toggleAllVisibleArchived(new Set(), [])]).toEqual([]);
  });
});
