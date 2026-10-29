import { describe, expect, it } from "vite-plus/test";

import { ThreadId, TurnItemId, type OrchestrationV2TurnItem } from "@marp/contracts";
import * as DateTime from "effect/DateTime";

import {
  WORK_EVENT_VERBS,
  fileEditFailureReason,
  fileEditSummary,
  thoughtBody,
  thoughtTitle,
  thoughtTitleDuration,
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
    [command("pnpm test"), "Ran tests"],
    [command("node scripts/gen.mjs"), "Ran node · scripts/gen.mjs"],
    [
      command(
        'cd /w/work-log && grep -n "^export function workEventAction" -A10 eventPresentation.ts; sed -n 8,14p eventPresentation.ts',
      ),
      "Grepped ^export function workEventAction in eventPresentation.ts +1",
    ],
    [command("sed -n '1,80p' src/auth/session.ts"), "Read session.ts L1-80"],
    [command("rg -n expiresAt src/auth | head"), "Grepped expiresAt in auth"],
    [command("Get-ChildItem src/auth"), "Listed auth"],
    [command("sed -i s/a/b/ src/auth/session.ts"), "Ran sed · auth/session.ts"],
    [
      command("bash -lc 'cat a.ts'", {
        actions: [{ type: "search", query: "token", path: "/w/src" }],
      }),
      "Grepped token in src",
    ],
    [
      command("cat a.ts && rg x", {
        actions: [
          { type: "read", path: "a.ts" },
          { type: "search", query: "x" },
        ],
      }),
      "Read a.ts +1",
    ],
    [mcp("mcp__linear__create_issue"), "Ran create_issue"],
    [edit("src/auth/session.ts"), "Edited session.ts"],
    [edit("src/auth/new.ts", "add"), "Wrote new.ts"],
  ])("labels %#", (step, text) => {
    const action = workEventAction(step);
    expect(action && workEventActionText(action)).toBe(text);
  });

  it("uses the loading verb while live and the imperative when failed", () => {
    expect(workEventAction(command("node build.mjs"), true)?.verb).toBe("Running");
    expect(workEventAction(command("node build.mjs", { exitCode: 1 }))?.verb).toBe("Run");
    expect(workEventAction(command("pnpm test"), true)?.verb).toBe("Running tests");
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

  it.each([
    [[thought("**Planning the fix**\n\nThe token expires.", 12)], false, "12s"],
    [[thought("**Planning the fix**\n\nThe token expires.", 0.2)], false, null],
    [[thought("**Planning the fix**\n\nThe token expires.", 12)], true, null],
    [[thought("Looking at the session code.", 8)], false, null],
  ] as const)("keeps a heading's duration as trailing text %#", (entries, live, duration) => {
    expect(thoughtTitleDuration(entries, live)).toBe(duration);
  });

  it.each([
    ["**Planning the fix**\n\nThe token expires.", "The token expires."],
    ["**Planning the fix**", ""],
    ["## Planning\n", ""],
    ["No heading here.", "No heading here."],
  ])("separates the body from the heading %#", (text, body) => {
    expect(thoughtBody(text)).toBe(body);
  });
});

describe("workRunHeader", () => {
  it.each([
    ["thinking only", [thought("Hmm.", 3)], false, "thought", "Thought for 3s"],
    ["thinking while live", [thought("Hmm.")], true, "thought", "Thinking"],
    ["one edit", [edit("src/a.ts")], false, "edit", "Edited a.ts"],
    ["new file", [edit("src/new.ts", "add")], false, "edit", "Created new.ts"],
    ["edits", [edit("src/a.ts"), edit("src/b.ts")], false, "edit", "Edited 2 files"],
    ["live edits", [edit("src/a.ts"), edit("src/b.ts")], true, "edit", "Editing…"],
    ["deletes", [edit("a.ts", "delete"), edit("b.ts", "delete")], false, "edit", "Deleted 2 files"],
    [
      "one described command",
      [command("vp test run", { description: "Run unit tests" })],
      false,
      "shell",
      "Run unit tests",
    ],
    ["one bare command", [command("git status")], true, "shell", "Viewing git status"],
    ["commands", [command("git status"), command("pnpm test")], false, "shell", "Ran 2 commands"],
    ["live commands", [command("git status"), command("pnpm test")], true, "shell", "Running…"],
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
      "reads and a command",
      [read("a.ts"), read("b.ts"), read("a.ts"), read("c.ts"), grep("x"), command("pnpm test")],
      false,
      "shell",
      "Ran tests, 3 files, 1 search",
    ],
    [
      "edits, commands and reads",
      [edit("src/a.ts"), command("pnpm test"), command("git status"), read("b.ts"), edit("c.ts")],
      false,
      "edit",
      "Edited 2 files, b.ts, ran 2 commands",
    ],
    [
      "an edit and a command",
      [command("git status"), edit("a.ts")],
      false,
      "edit",
      "Edited a.ts, ran 1 command",
    ],
    ["live edits and reads", [read("b.ts"), edit("src/a.ts")], true, "edit", "Editing a.ts"],
    [
      "read-only commands",
      [command("cat src/a.ts"), command("rg token src"), command("ls src")],
      false,
      "explore",
      "Explored a.ts, 1 search, 1 folder",
    ],
    ["live exploration", [read("a.ts"), list("src")], true, "explore", "Exploring…"],
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

  it("never heads a run with edits as exploration", () => {
    expect(workRunHeader([edit("a.ts"), command("ls")]).title).toBe("Edited a.ts, 1 folder");
    expect(workRunHeader([edit("a.ts"), thought("ok")]).rule).toBe("edit");
  });

  it("names an edited file once and sums the run's line counts", () => {
    const counted = (path: string, additions: number, deletions: number) => {
      const step = edit(path);
      return {
        ...step,
        structuredPayload: {
          ...step.structuredPayload,
          additions,
          deletions,
        } as OrchestrationV2TurnItem,
      };
    };
    expect(
      workRunHeader([
        read("src/a.ts"),
        counted("src/a.ts", 10, 2),
        read("b.ts"),
        command("pnpm test"),
        counted("src/a.ts", 2, 1),
      ]),
    ).toEqual({
      rule: "edit",
      title: "Edited a.ts, b.ts, ran 1 command",
      diffStats: { additions: 12, deletions: 3 },
    });
    const writing = { ...counted("src/a.ts", 4, 4), toolLifecycleStatus: "inProgress" as const };
    expect(workRunHeader([writing, command("pnpm test")]).diffStats).toBeUndefined();
    expect(workRunHeader([counted("src/a.ts", 4, 4)], true).diffStats).toBeUndefined();
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
    [
      "a new file shows only additions",
      counted(edit("src/new.ts", "add"), { additions: 5, deletions: 2 }),
      false,
      "Created",
      5,
      0,
    ],
    [
      "a write over an existing file",
      counted(edit("src/a.ts"), { title: "Write", additions: 2, deletions: 7 }),
      false,
      "Edited",
      2,
      7,
    ],
    [
      "a running write of unknown target",
      counted(edit("src/a.ts"), { title: "Write", changes: [] }),
      true,
      "Writing",
      0,
      0,
    ],
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

describe("fileEditFailureReason", () => {
  it.each([
    [
      "<tool_use_error>String to replace not found in file.</tool_use_error>",
      "Text to replace wasn't found",
    ],
    [
      "File has been modified since read, either by the user or by a linter.",
      "File changed since it was read",
    ],
    [
      "Found 3 matches of the string to replace, but replace_all is false.",
      "Text to replace matches more than once",
    ],
    ["Something odd happened\nstack trace", "Something odd happened"],
    ["   ", undefined],
  ])("reads %j", (error, reason) => {
    expect(fileEditFailureReason(error)).toBe(reason);
  });
});
