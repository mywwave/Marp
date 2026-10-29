import type { OrchestrationV2TurnItem } from "@marp/contracts";
import {
  resolveMarpMcpSummaryAction,
  resolveMarpMcpToolDefinition,
} from "@marp/shared/marpMcpToolPresentation";
import { formatDuration } from "@marp/shared/orchestrationTiming";
import { collectToolFilePaths } from "@marp/shared/toolActivity";
import * as DateTime from "effect/DateTime";

import { commandDisplayText } from "@marp/client-runtime/work-log/command-label";
import {
  summarizeToolGroup,
  toolGroupAction,
  workEntryDisplayIndicatesToolFailure,
  type WorkLogPresentationEntry,
} from "@marp/client-runtime/work-log/presentation";

type WorkEventKind =
  | "read"
  | "grep"
  | "glob"
  | "semantic-search"
  | "list"
  | "shell"
  | "mcp"
  | "edit"
  | "write"
  | "delete"
  | "fetch"
  | "web-search"
  | "plan"
  | "todos"
  | "task"
  | "ask"
  | "await";

type WorkEventPhase = "loading" | "completed" | "error";

/** One verb per phase: loading is present participle, completed past, error imperative. */
export const WORK_EVENT_VERBS: Record<WorkEventKind, Record<WorkEventPhase, string>> = {
  read: { loading: "Reading", completed: "Read", error: "Read" },
  grep: { loading: "Grepping", completed: "Grepped", error: "Grep" },
  glob: { loading: "Searching files", completed: "Searched files", error: "Search files" },
  "semantic-search": { loading: "Searching", completed: "Searched", error: "Search" },
  list: { loading: "Listing", completed: "Listed", error: "List" },
  shell: { loading: "Running", completed: "Ran", error: "Run" },
  mcp: { loading: "Running", completed: "Ran", error: "Run" },
  edit: { loading: "Editing", completed: "Edited", error: "Edit" },
  write: { loading: "Writing", completed: "Wrote", error: "Write" },
  delete: { loading: "Deleting", completed: "Deleted", error: "Delete" },
  fetch: { loading: "Fetching", completed: "Fetched", error: "Fetch" },
  "web-search": { loading: "Searching web", completed: "Searched web", error: "Search web" },
  plan: { loading: "Writing plan", completed: "Wrote plan", error: "Write plan" },
  todos: { loading: "Updating to-dos", completed: "Updated to-dos", error: "Update to-dos" },
  task: { loading: "Working on task", completed: "Completed task", error: "Work on task" },
  ask: { loading: "Asking questions", completed: "Asked questions", error: "Ask question" },
  await: { loading: "Waiting", completed: "Waited", error: "Wait" },
};

const SEARCH_KINDS: ReadonlySet<WorkEventKind> = new Set([
  "grep",
  "glob",
  "semantic-search",
  "web-search",
]);

const FILE_CHANGE_KINDS: ReadonlySet<WorkEventKind> = new Set(["edit", "write", "delete"]);

const TOOL_NAME_KINDS: Readonly<Record<string, WorkEventKind>> = {
  read: "read",
  readfile: "read",
  view: "read",
  viewimage: "read",
  grep: "grep",
  rg: "grep",
  glob: "glob",
  find: "glob",
  findfiles: "glob",
  ls: "list",
  list: "list",
  listdir: "list",
  listdirectory: "list",
  semsearch: "semantic-search",
  codebasesearch: "semantic-search",
  fetch: "fetch",
  webfetch: "fetch",
  websearch: "web-search",
  todowrite: "todos",
  todoread: "todos",
  task: "task",
  agent: "task",
  askuserquestion: "ask",
  exitplanmode: "plan",
  createplan: "plan",
  monitor: "await",
  bash: "shell",
  shell: "shell",
  terminal: "shell",
  powershell: "shell",
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function firstString(record: Record<string, unknown> | undefined, keys: readonly string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function entryToolName(entry: WorkLogPresentationEntry): string | undefined {
  const item = entry.structuredPayload;
  if (item?.type === "dynamic_tool" && item.toolName) return item.toolName;
  const data = asRecord(entry.toolData);
  if (typeof data?.toolName === "string") return data.toolName;
  return entry.toolTitle;
}

function entryToolInput(entry: WorkLogPresentationEntry): Record<string, unknown> | undefined {
  const item = entry.structuredPayload;
  if (item?.type === "dynamic_tool") return asRecord(item.input);
  const data = asRecord(entry.toolData);
  return asRecord(data?.input) ?? asRecord(data?.arguments) ?? asRecord(data?.rawInput);
}

/** MCP names like `mcp__server__tool` or `server.tool` never classify as a native tool. */
function nativeToolToken(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed || /__|[./]/u.test(trimmed)) return undefined;
  return trimmed.replace(/[_\s-]/gu, "").toLowerCase();
}

function mcpToolDisplayName(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/__|\./u).filter(Boolean);
  return parts.at(-1) ?? trimmed;
}

function fileChangeKind(entry: WorkLogPresentationEntry): WorkEventKind {
  const item = entry.structuredPayload;
  const changes = item?.type === "file_change" ? (item.changes ?? []) : [];
  if (changes.length > 0 && changes.every((change) => /^delete/iu.test(change.operation))) {
    return "delete";
  }
  if (changes.length === 1 && /^(add|create)/iu.test(changes[0]!.operation)) return "write";
  const token = nativeToolToken(item?.title ?? entry.toolTitle);
  return token === "write" ? "write" : token === "delete" ? "delete" : "edit";
}

const URL_PATTERN = /^https?:\/\//iu;

function webSearchKind(entry: WorkLogPresentationEntry): WorkEventKind {
  const item = entry.structuredPayload;
  const named = TOOL_NAME_KINDS[nativeToolToken(item?.title ?? entry.toolTitle) ?? ""];
  if (named === "fetch" || named === "web-search") return named;
  if (/^fetch/iu.test(item?.title ?? entry.toolTitle ?? "")) return "fetch";
  if (toolGroupAction(entry) === "code-search") return "grep";
  const patterns = item?.type === "web_search" ? (item.patterns ?? []) : [];
  return patterns.length > 0 && patterns.every((pattern) => URL_PATTERN.test(pattern.trim()))
    ? "fetch"
    : "web-search";
}

function fileSearchKind(entry: WorkLogPresentationEntry): WorkEventKind {
  const title = `${entry.structuredPayload?.title ?? ""} ${entry.toolTitle ?? ""}`;
  if (/\bglob\b|^searched files\b/iu.test(title.trim())) return "glob";
  if (/\b(ls|list)\b/iu.test(title)) return "list";
  if (/semantic|semsearch|codebase/iu.test(title)) return "semantic-search";
  return "grep";
}

export function workEventKind(entry: WorkLogPresentationEntry): WorkEventKind | null {
  const item = entry.structuredPayload;
  switch (entry.itemType) {
    case "reasoning":
      return null;
    case "command_execution":
      return item?.type === "command_execution" && item.monitor ? "await" : "shell";
    case "file_change":
      return fileChangeKind(entry);
    case "todo_list":
      return "todos";
    case "user_input_request":
      return "ask";
    case "subagent":
      return "task";
    case "web_search":
      return webSearchKind(entry);
    case "file_search":
      return fileSearchKind(entry);
    case "dynamic_tool":
    case undefined:
      break;
    default:
      return null;
  }
  const name = entryToolName(entry);
  if (resolveMarpMcpToolDefinition(name, entryToolInput(entry))) {
    return resolveMarpMcpSummaryAction(name, entryToolInput(entry)) === "background-wait"
      ? "await"
      : null;
  }
  const named = TOOL_NAME_KINDS[nativeToolToken(name) ?? ""];
  if (named) return named;
  if (entry.requestKind === "file-read" || entry.viewedImagePath !== undefined) return "read";
  if (entry.itemType === "dynamic_tool" && name) return "mcp";
  return null;
}

export function workEventIsFileChange(kind: WorkEventKind | null): boolean {
  return kind !== null && FILE_CHANGE_KINDS.has(kind);
}

function workEventPhase(entry: WorkLogPresentationEntry, live = false): WorkEventPhase {
  if (workEntryDisplayIndicatesToolFailure(entry)) return "error";
  return live || entry.toolLifecycleStatus === "inProgress" ? "loading" : "completed";
}

interface WorkEventTarget {
  readonly text: string;
  /** A file or directory: the client shows its name emphasized and its directory muted. */
  readonly path: boolean;
  readonly mono: boolean;
  /** Muted trailing context such as " in src", "L10-60" or " +2 more". */
  readonly suffix?: string;
}

export interface WorkEventAction {
  readonly kind: WorkEventKind;
  readonly phase: WorkEventPhase;
  readonly verb: string;
  readonly target: WorkEventTarget | null;
}

const SEARCH_QUERY_KEYS = ["pattern", "query", "searchTerm", "regex", "q"] as const;
const SEARCH_GLOB_KEYS = ["glob", "globPattern", "glob_pattern", "include", "filePattern"] as const;
const SEARCH_TARGET_KEYS = ["path", "target_directory", "targetDirectory", "directory", "cwd"];

function pathBaseName(path: string): string {
  return path.split(/[\\/]/u).findLast((part) => part.length > 0 && part !== ".") ?? path;
}

function entryPaths(entry: WorkLogPresentationEntry): readonly string[] {
  if (entry.changedFiles?.length) return entry.changedFiles;
  const input = entryToolInput(entry);
  const fromInput = input ? collectToolFilePaths({ input }) : [];
  if (fromInput.length > 0) return fromInput;
  if (entry.viewedImagePath) return [entry.viewedImagePath];
  return collectToolFilePaths(asRecord(entry.toolData));
}

function lineRange(input: Record<string, unknown> | undefined): string | undefined {
  const offset = input?.offset;
  const limit = input?.limit;
  if (typeof offset !== "number" || typeof limit !== "number" || limit <= 0) return undefined;
  const start = Math.max(1, offset);
  return ` L${start}-${start + limit - 1}`;
}

function moreSuffix(count: number): string | undefined {
  return count > 0 ? ` +${count} more` : undefined;
}

function pathTarget(paths: readonly string[], suffix?: string): WorkEventTarget | null {
  const [first] = paths;
  if (!first) return null;
  const more = moreSuffix(paths.length - 1);
  const combined = [suffix, more].filter(Boolean).join("");
  return { text: first, path: true, mono: true, ...(combined ? { suffix: combined } : {}) };
}

function searchTarget(
  entry: WorkLogPresentationEntry,
  kind: WorkEventKind,
): WorkEventTarget | null {
  const item = entry.structuredPayload;
  const input = entryToolInput(entry);
  const query =
    (item?.type === "file_search" ? item.pattern?.trim() : undefined) ||
    (kind === "glob" ? firstString(input, SEARCH_GLOB_KEYS) : undefined) ||
    firstString(input, SEARCH_QUERY_KEYS) ||
    firstString(input, SEARCH_GLOB_KEYS);
  const target = firstString(input, SEARCH_TARGET_KEYS);
  if (!query) return target ? { text: target, path: true, mono: true } : null;
  return {
    text: query,
    path: false,
    mono: true,
    ...(target ? { suffix: ` in ${pathBaseName(target)}` } : {}),
  };
}

function fetchTarget(entry: WorkLogPresentationEntry): WorkEventTarget | null {
  const item = entry.structuredPayload;
  const url =
    (item?.type === "web_search" ? item.patterns?.[0] : undefined) ??
    firstString(entryToolInput(entry), ["url", "uri"]);
  if (!url) return null;
  return { text: url.trim().replace(URL_PATTERN, "").replace(/\/$/u, ""), path: false, mono: true };
}

function webSearchTarget(entry: WorkLogPresentationEntry): WorkEventTarget | null {
  const item = entry.structuredPayload;
  const query =
    (item?.type === "web_search" && item.patterns?.length ? item.patterns.join(", ") : undefined) ??
    firstString(entryToolInput(entry), ["query", "q", "search"]);
  return query ? { text: query, path: false, mono: false } : null;
}

function workEventTarget(
  entry: WorkLogPresentationEntry,
  kind: WorkEventKind,
): WorkEventTarget | null {
  switch (kind) {
    case "read":
      return pathTarget(entryPaths(entry), lineRange(entryToolInput(entry)));
    case "edit":
    case "write":
    case "delete":
      return pathTarget(entryPaths(entry));
    case "grep":
    case "glob":
    case "semantic-search":
      return searchTarget(entry, kind);
    case "list": {
      const path =
        firstString(entryToolInput(entry), SEARCH_TARGET_KEYS) ??
        (entry.structuredPayload?.type === "file_search"
          ? entry.structuredPayload.pattern
          : undefined);
      return path ? { text: path, path: true, mono: true } : null;
    }
    case "fetch":
      return fetchTarget(entry);
    case "web-search":
      return webSearchTarget(entry);
    case "shell": {
      const command = entry.command?.trim();
      return command ? { text: commandDisplayText(command), path: false, mono: true } : null;
    }
    case "mcp": {
      const name = entryToolName(entry);
      return name ? { text: mcpToolDisplayName(name), path: false, mono: true } : null;
    }
    case "task": {
      const description = firstString(entryToolInput(entry), ["description", "prompt"]);
      return description ? { text: clampPreview(description), path: false, mono: false } : null;
    }
    default:
      return null;
  }
}

export function workEventAction(
  entry: WorkLogPresentationEntry,
  live = false,
): WorkEventAction | null {
  const kind = workEventKind(entry);
  if (kind === null) return null;
  const phase = workEventPhase(entry, live);
  return { kind, phase, verb: WORK_EVENT_VERBS[kind][phase], target: workEventTarget(entry, kind) };
}

export function workEventActionText(action: WorkEventAction): string {
  if (!action.target) return action.verb;
  const text = action.target.path ? pathBaseName(action.target.text) : action.target.text;
  return `${action.verb} ${text}${action.target.suffix ?? ""}`;
}

const PREVIEW_MAX_CHARS = 100;

/** Row previews read as one or two lines, never a paragraph. */
function clampPreview(text: string, max = PREVIEW_MAX_CHARS): string {
  const compact = text.replace(/\s+/gu, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1).trimEnd()}…`;
}

const THOUGHT_HEADING = /^\s*(?:\*\*([^*\r\n]+)\*\*|#{1,6}[ \t]+([^\r\n]+))[ \t]*\r?(?:\n|$)/u;

function thoughtHeading(text: string | undefined): string | null {
  const match = text ? THOUGHT_HEADING.exec(text) : null;
  const heading = (match?.[1] ?? match?.[2])?.trim();
  return heading ? clampPreview(heading) : null;
}

function reasoningDurationMs(item: OrchestrationV2TurnItem | undefined): number {
  if (item?.type !== "reasoning" || !item.startedAt || !item.completedAt) return 0;
  return Math.max(
    0,
    DateTime.toEpochMillis(item.completedAt) - DateTime.toEpochMillis(item.startedAt),
  );
}

function formatThoughtDuration(ms: number): string | null {
  const seconds = Math.round(ms / 1_000);
  if (seconds < 1) return null;
  return seconds < 60 ? `${seconds}s` : formatDuration(ms);
}

/** "Thinking" while live, the reasoning's own heading when it has one, else how long it took. */
export function thoughtTitle(
  entries: ReadonlyArray<WorkLogPresentationEntry>,
  live = false,
): string {
  if (live) return "Thinking";
  for (const entry of entries) {
    const heading = thoughtHeading(entry.detail);
    if (heading) return heading;
  }
  const duration = formatThoughtDuration(
    entries.reduce((total, entry) => total + reasoningDurationMs(entry.structuredPayload), 0),
  );
  return duration ? `Thought for ${duration}` : "Thought briefly";
}

export type WorkRunHeaderRule =
  | "thought"
  | "browser"
  | "background"
  | "edit"
  | "shell"
  | "image"
  | "tools"
  | "explore";

interface WorkRunHeader {
  readonly rule: WorkRunHeaderRule;
  readonly title: string;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function isImageGeneration(entry: WorkLogPresentationEntry): boolean {
  return /^(generate_?image|image_?gen(eration)?)$/iu.test(entryToolName(entry)?.trim() ?? "");
}

function fileChangeHeader(
  entries: ReadonlyArray<WorkLogPresentationEntry>,
  kinds: ReadonlyArray<WorkEventKind | null>,
  live: boolean,
): string {
  const files = [...new Set(entries.flatMap((entry) => entryPaths(entry)))];
  const kind: WorkEventKind = kinds.every((kind) => kind === "delete")
    ? "delete"
    : files.length <= 1 && kinds.every((kind) => kind === "write")
      ? "write"
      : "edit";
  const verb =
    kind === "write"
      ? live
        ? "Creating"
        : "Created"
      : WORK_EVENT_VERBS[kind][live ? "loading" : "completed"];
  const fileCount = Math.max(files.length, 1);
  return `${verb} ${files.length === 1 ? pathBaseName(files[0]!) : plural(fileCount, "file")}`;
}

function shellHeader(entries: ReadonlyArray<WorkLogPresentationEntry>, live: boolean): string {
  const verb = live ? "Running" : "Ran";
  if (entries.length > 1) return `${verb} ${plural(entries.length, "command")}`;
  const [entry] = entries;
  const item = entry?.structuredPayload;
  const description = item?.type === "command_execution" ? item.description?.trim() : undefined;
  if (description) return clampPreview(description);
  const command = entry?.command?.trim();
  return command ? `${verb} ${clampPreview(commandDisplayText(command))}` : `${verb} command`;
}

function explorationParts(
  entries: ReadonlyArray<WorkLogPresentationEntry>,
  kinds: ReadonlyArray<WorkEventKind | null>,
): string[] {
  const files = new Set<string>();
  let unnamedFiles = 0;
  const counts = { search: 0, list: 0, fetch: 0, command: 0, edit: 0, tool: 0 };
  for (const [index, entry] of entries.entries()) {
    const kind = kinds[index] ?? null;
    if (kind === "read") {
      const paths = entryPaths(entry);
      if (paths.length === 0) unnamedFiles += 1;
      for (const path of paths) files.add(path);
    } else if (kind !== null && SEARCH_KINDS.has(kind)) counts.search += 1;
    else if (kind === "list") counts.list += 1;
    else if (kind === "fetch") counts.fetch += 1;
    else if (kind === "shell" || kind === "await") counts.command += 1;
    else if (workEventIsFileChange(kind)) counts.edit += 1;
    else counts.tool += 1;
  }
  const fileCount = files.size + unnamedFiles;
  return [
    fileCount === 1 && files.size === 1
      ? pathBaseName([...files][0]!)
      : fileCount > 0
        ? plural(fileCount, "file")
        : null,
    counts.search > 0 ? plural(counts.search, "search", "searches") : null,
    counts.list > 0 ? plural(counts.list, "folder") : null,
    counts.fetch > 0 ? plural(counts.fetch, "page") : null,
    counts.command > 0 ? plural(counts.command, "command") : null,
    counts.edit > 0 ? plural(counts.edit, "edit") : null,
    counts.tool > 0 ? plural(counts.tool, "tool") : null,
  ].filter((part): part is string => part !== null);
}

/** One header per run of steps between two assistant messages; the first matching rule wins. */
export function workRunHeader(
  entries: ReadonlyArray<WorkLogPresentationEntry>,
  live = false,
): WorkRunHeader {
  const reasoning = entries.filter((entry) => entry.itemType === "reasoning");
  const tools = entries.filter((entry) => entry.itemType !== "reasoning");
  if (tools.length === 0) return { rule: "thought", title: thoughtTitle(reasoning, live) };
  const kinds = tools.map(workEventKind);
  if (tools.every((entry) => toolGroupAction(entry) === "browser")) {
    return {
      rule: "browser",
      title: live ? "Running browser actions" : `Ran ${plural(tools.length, "browser action")}`,
    };
  }
  if (kinds.every((kind) => kind === "await")) {
    const tasks = tools.length === 1 ? "background task" : "background tasks";
    return { rule: "background", title: `${live ? "Monitoring" : "Monitored"} ${tasks}` };
  }
  if (kinds.every(workEventIsFileChange)) {
    return { rule: "edit", title: fileChangeHeader(tools, kinds, live) };
  }
  if (kinds.every((kind) => kind === "shell")) {
    return { rule: "shell", title: shellHeader(tools, live) };
  }
  if (tools.every(isImageGeneration)) {
    return {
      rule: "image",
      title: live ? "Generating images" : `Generated ${plural(tools.length, "image")}`,
    };
  }
  // Marp's own tools and integrations keep their specific summaries ("Linked 2 pull requests").
  if (kinds.every((kind) => kind === null || kind === "todos" || kind === "ask")) {
    return { rule: "tools", title: summarizeToolGroup(tools).summary };
  }
  const parts = explorationParts(tools, kinds);
  const verb = live ? "Exploring" : "Explored";
  return { rule: "explore", title: parts.length > 0 ? `${verb} ${parts.join(", ")}` : verb };
}

const CREATE_VERBS: Record<WorkEventPhase, string> = {
  loading: "Creating",
  completed: "Created",
  error: "Create",
};

interface FileEditSummary {
  readonly action: WorkEventAction;
  readonly additions: number;
  readonly deletions: number;
}

/** One edit's header: "Edited `session.ts`" plus its line counts. A new file reads "Created". */
export function fileEditSummary(
  entry: WorkLogPresentationEntry,
  live = false,
): FileEditSummary | null {
  const action = workEventAction(entry, live);
  const item = entry.structuredPayload;
  if (action === null || !workEventIsFileChange(action.kind) || item?.type !== "file_change") {
    return null;
  }
  const changes = item.changes ?? [];
  const created = changes.length === 1 && /^(add|create)/iu.test(changes[0]!.operation);
  return {
    action: created ? { ...action, verb: CREATE_VERBS[action.phase] } : action,
    additions: item.additions ?? 0,
    deletions: item.deletions ?? 0,
  };
}
