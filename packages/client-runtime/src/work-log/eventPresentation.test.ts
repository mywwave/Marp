import { describe, expect, it } from "vite-plus/test";

import { ThreadId, TurnItemId, type OrchestrationV2TurnItem } from "@marp/contracts";
import * as DateTime from "effect/DateTime";

import {
  WORK_EVENT_VERBS,
  fileEditSummary,
  thoughtTitle,
  workEventAction,
  workEventActionText,
  workRunHeader,
} from "./eventPresentation.js";
import type { WorkLogPresentationEntry } from "./presentation.js";

const BASE_ITEM = {
  threadId: ThreadId.make("thread"),
  runId: null,
  nodeId: null,
  providerThreadId: null,
  providerTurnId: null,
  nativeItemRef: null,
  parentItemId: null,
  ordinal: 1,
  status: "completed",
  title: null,
  startedAt: null,
  completedAt: null,
  updatedAt: DateTime.makeUnsafe("2026-09-08T00:00:00.000Z"),
} as const;

let nextId = 0;
function entry(
  item: Record<string, unknown> & { type: OrchestrationV2TurnItem["type"] },
  fields: Partial<WorkLogPresentationEntry> = {},
): WorkLogPresentationEntry {
  nextId += 1;
  const structuredPayload = {
    ...BASE_ITEM,
    id: TurnItemId.make(`item-${nextId}`),
    ...item,
  } as OrchestrationV2TurnItem;
  return {
    id: `entry-${nextId}`,
    createdAt: "2026-09-08T00:00:00.000Z",
    label: "step",
    tone: item.type === "reasoning" ? "thinking" : "tool",
    itemType: item.type,
    toolLifecycleStatus: "completed",
    structuredPayload,
    ...(item.type === "command_execution" ? { command: String(item.input) } : {}),
    ...(item.type === "dynamic_tool" ? { toolTitle: String(item.toolName) } : {}),
    ...fields,
  };
}

const read = (path: string, input: Record<string, unknown> = {}) =>
  entry({ type: "dynamic_tool", toolName: "Read", input: { file_path: path, ...input } });
const grep = (pattern: string, path?: string) =>
  entry({ type: "dynamic_tool", toolName: "Grep", input: { pattern, ...(path ? { path } : {}) } });
const list = (path: string) => entry({ type: "dynamic_tool", toolName: "LS", input: { path } });
const fetchPage = (url: string) =>
  entry({ type: "web_search", patterns: [url] }, { toolTitle: "WebFetch" });
const command = (input: string, fields: Record<string, unknown> = {}) =>
  entry({ type: "command_execution", input, ...fields });
const edit = (fileName: string, operation = "update") =>
  entry(
    { type: "file_change", fileName, changes: [{ operation, path: fileName }] },
    { changedFiles: [fileName] },
  );
const mcp = (toolName: string) => entry({ type: "dynamic_tool", toolName, input: {} });
const thought = (text: string, seconds?: number) =>
  entry(
    {
      type: "reasoning",
      text,
      streaming: false,
      ...(seconds === undefined
        ? {}
        : {
            startedAt: DateTime.makeUnsafe("2026-09-08T00:00:00.000Z"),
            completedAt: DateTime.makeUnsafe(
              Date.parse("2026-09-08T00:00:00.000Z") + seconds * 1_000,
            ),
          }),
    },
    { detail: text },
  );

describe("WORK_EVENT_VERBS", () => {
  it.each([
    ["read", "Reading", "Read", "Read"],
    ["grep", "Grepping", "Grepped", "Grep"],
    ["glob", "Searching files", "Searched files", "Search files"],
    ["list", "Listing", "Listed", "List"],
    ["shell", "Running", "Ran", "Run"],
    ["mcp", "Running", "Ran", "Run"],
    ["edit", "Editing", "Edited", "Edit"],
    ["fetch", "Fetching", "Fetched", "Fetch"],
    ["web-search", "Searching web", "Searched web", "Search web"],
    ["task", "Working on task", "Completed task", "Work on task"],
  ] as const)("%s reads %s / %s / %s", (kind, loading, completed, error) => {
    expect(WORK_EVENT_VERBS[kind]).toEqual({ loading, completed, error });
  });
});

describe("workEventAction", () => {
  it.each([
    [read("src/auth/session.ts"), "Read session.ts"],
    [read("src/auth/session.ts", { offset: 10, limit: 51 }), "Read session.ts L10-60"],
    [grep("expiresAt", "src/auth"), "Grepped expiresAt in auth"],
    [list("src/auth"), "Listed auth"],
    [fetchPage("https://docs.example.com/"), "Fetched docs.example.com"],
    [command("pnpm test"), "Ran pnpm test"],
    [mcp("mcp__linear__create_issue"), "Ran create_issue"],
    [edit("src/auth/session.ts"), "Edited session.ts"],
    [edit("src/auth/new.ts", "add"), "Wrote new.ts"],
  ])("labels %#", (step, text) => {
    const action = workEventAction(step);
    expect(action && workEventActionText(action)).toBe(text);
  });

  it("uses the loading verb while live and the imperative when failed", () => {
    expect(workEventAction(command("pnpm test"), true)?.verb).toBe("Running");
    expect(workEventAction(command("pnpm test", { exitCode: 1 }))?.verb).toBe("Run");
  });
});

describe("thoughtTitle", () => {
  it.each([
    [[thought("Looking at the session code.", 8)], false, "Thought for 8s"],
    [[thought("Quick check.")], false, "Thought briefly"],
    [[thought("Quick check.", 0.2)], false, "Thought briefly"],
    [[thought("**Planning the fix**\n\nThe token expires.", 12)], false, "Planning the fix"],
    [[thought("Still going.")], true, "Thinking"],
  ] as const)("titles %#", (entries, live, title) => {
    expect(thoughtTitle(entries, live)).toBe(title);
  });
});

describe("workRunHeader", () => {
  it.each([
    ["thinking only", [thought("Hmm.", 3)], false, "thought", "Thought for 3s"],
    ["thinking while live", [thought("Hmm.")], true, "thought", "Thinking"],
    ["one edit", [edit("src/a.ts")], false, "edit", "Edited a.ts"],
    ["new file", [edit("src/new.ts", "add")], false, "edit", "Created new.ts"],
    ["edits", [edit("src/a.ts"), edit("src/b.ts")], true, "edit", "Editing 2 files"],
    ["deletes", [edit("a.ts", "delete"), edit("b.ts", "delete")], false, "edit", "Deleted 2 files"],
    [
      "one described command",
      [command("vp test run", { description: "Run unit tests" })],
      false,
      "shell",
      "Run unit tests",
    ],
    ["one bare command", [command("git status")], true, "shell", "Running git status"],
    ["commands", [command("git status"), command("pnpm test")], false, "shell", "Ran 2 commands"],
    [
      "monitors",
      [command("tail -f log", { monitor: true })],
      true,
      "background",
      "Monitoring background task",
    ],
    [
      "one file and searches",
      [read("src/session.ts"), grep("expiresAt"), grep("token"), thought("ok")],
      false,
      "explore",
      "Explored session.ts, 2 searches",
    ],
    [
      "mixed steps",
      [read("a.ts"), read("b.ts"), read("a.ts"), read("c.ts"), grep("x"), command("pnpm test")],
      false,
      "explore",
      "Explored 3 files, 1 search, 1 command",
    ],
    ["live exploration", [read("a.ts"), list("src")], true, "explore", "Exploring a.ts, 1 folder"],
    [
      "mcp with a read",
      [read("a.ts"), mcp("mcp__linear__get")],
      false,
      "explore",
      "Explored a.ts, 1 tool",
    ],
  ] as const)("%s", (_name, entries, live, rule, title) => {
    expect(workRunHeader(entries, live)).toEqual({ rule, title });
  });

  it("checks edits before commands", () => {
    expect(workRunHeader([edit("a.ts"), command("ls")]).rule).toBe("explore");
    expect(workRunHeader([edit("a.ts"), thought("ok")]).rule).toBe("edit");
  });
});

describe("fileEditSummary", () => {
  const counted = (
    step: WorkLogPresentationEntry,
    fields: Partial<Extract<OrchestrationV2TurnItem, { type: "file_change" }>>,
    entryFields: Partial<WorkLogPresentationEntry> = {},
  ): WorkLogPresentationEntry => ({
    ...step,
    ...entryFields,
    structuredPayload: { ...step.structuredPayload, ...fields } as OrchestrationV2TurnItem,
  });

  it.each([
    ["an edit", counted(edit("src/a.ts"), { additions: 3, deletions: 1 }), false, "Edited", 3, 1],
    ["a new file", counted(edit("src/new.ts", "add"), { additions: 12 }), false, "Created", 12, 0],
    ["a running new file", edit("src/new.ts", "add"), true, "Creating", 0, 0],
    ["a deleted file", counted(edit("old.ts", "delete"), { deletions: 4 }), false, "Deleted", 0, 4],
    [
      "a failed edit",
      counted(edit("a.ts"), { status: "failed" }, { toolLifecycleStatus: "failed" }),
      false,
      "Edit",
      0,
      0,
    ],
  ] as const)("reads %s", (_name, step, live, verb, additions, deletions) => {
    const summary = fileEditSummary(step, live);
    expect(summary?.action.verb).toBe(verb);
    expect(summary && { additions: summary.additions, deletions: summary.deletions }).toEqual({
      additions,
      deletions,
    });
  });

  it("is only for file changes", () => {
    expect(fileEditSummary(command("ls"))).toBeNull();
  });
});
