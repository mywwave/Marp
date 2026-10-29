import type { OrchestrationV2TurnItem } from "@marp/contracts";
import { parseDiffFromFile, type FileDiffMetadata } from "@pierre/diffs";
import { getRenderablePatch, resolveFileDiffPath } from "./diffRendering";

type FileChange = Extract<OrchestrationV2TurnItem, { type: "file_change" }>;

function toolCallPatch(item: Pick<FileChange, "diffStr" | "fileName" | "changes">) {
  let patch = item.diffStr;
  if (!patch) return patch;
  const change = item.changes?.[0];
  const rawFileOperation = change?.operation === "add" || change?.operation === "delete";
  if (patch.startsWith("diff --git ") || patch.startsWith("--- ")) {
    if (!rawFileOperation) return patch;
    const parsed = getRenderablePatch(patch, "tool-call-format");
    if (
      parsed?.kind === "files" &&
      parsed.files.every((file) => {
        const path = resolveFileDiffPath(file).replaceAll("\\", "/");
        return (
          file.hunks.length > 0 &&
          item.changes?.some((recorded) => {
            const recordedPath = recorded.path.replaceAll("\\", "/");
            return (
              (recorded.operation === "add"
                ? file.deletionLines.length === 0
                : recorded.operation === "delete"
                  ? file.additionLines.length === 0
                  : true) &&
              (recordedPath === path || recordedPath.endsWith(`/${path}`))
            );
          })
        );
      })
    )
      return patch;
  }
  // Codex can record added/deleted file contents or bare hunks instead of a complete patch.
  if (rawFileOperation || !patch.trimStart().startsWith("@@ ")) {
    if (!rawFileOperation) return patch;
    const lines = patch.split("\n");
    const hasFinalNewline = patch.endsWith("\n");
    if (hasFinalNewline) lines.pop();
    const added = change.operation === "add";
    const range = `1,${lines.length}`;
    patch = `@@ -${added ? "0,0" : range} +${added ? range : "0,0"} @@\n${lines.map((line) => `${added ? "+" : "-"}${line}`).join("\n")}\n${hasFinalNewline ? "" : "\\ No newline at end of file\n"}`;
  }
  const oldPath = change?.oldPath ?? item.fileName;
  const newPath = change?.path ?? item.fileName;
  const before = change?.operation === "add" ? "/dev/null" : JSON.stringify(`a/${oldPath}`);
  const after = change?.operation === "delete" ? "/dev/null" : JSON.stringify(`b/${newPath}`);
  return `diff --git ${JSON.stringify(`a/${oldPath}`)} ${JSON.stringify(`b/${newPath}`)}\n--- ${before}\n+++ ${after}\n${patch.trimStart()}`;
}

function recordedText(value: string | undefined) {
  const suffix = "\n… output truncated for transport";
  const truncated = value !== undefined && value.endsWith(suffix);
  return { text: truncated ? value.slice(0, -suffix.length) : value, truncated };
}

export function toolCallDiff(
  item: Pick<FileChange, "diffStr" | "fileName" | "changes" | "oldStr" | "newStr">,
) {
  const diff = recordedText(item.diffStr);
  const operation = item.changes?.[0]?.operation;
  const emptyContent = diff.text === "" ? "" : undefined;
  const before = recordedText(item.oldStr ?? (operation === "delete" ? emptyContent : undefined));
  const after = recordedText(item.newStr ?? (operation === "add" ? emptyContent : undefined));
  return {
    patch: toolCallPatch({ ...item, ...(diff.text === undefined ? {} : { diffStr: diff.text }) }),
    content: diff.text?.trim()
      ? []
      : [
          { label: "Recorded content before", text: before.text },
          { label: "Recorded content after", text: after.text },
        ].filter((entry): entry is { label: string; text: string } => entry.text !== undefined),
    truncated: diff.truncated || before.truncated || after.truncated,
  };
}

/** A new file this long, or snippets this long to diff on the main thread, show "too large". */
const MAX_NEW_FILE_LINES = 20_000;
const MAX_SNIPPET_DIFF_LINES = 5_000;

function lineCount(text: string | undefined): number {
  if (!text) return 0;
  let count = 1;
  for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) {
    count += 1;
  }
  return count;
}

export type ToolCallFileDiff =
  | { readonly kind: "diff"; readonly fileDiff: FileDiffMetadata; readonly lineNumbers: boolean }
  | { readonly kind: "too-large" };

/**
 * One edit as a renderable file diff. Recorded before/after snippets are not whole files, so
 * their line numbers would lie; `lineNumbers` is false for them.
 */
export function toolCallFileDiff(
  item: Pick<FileChange, "diffStr" | "fileName" | "changes" | "oldStr" | "newStr">,
): ToolCallFileDiff | null {
  const diff = toolCallDiff(item);
  const parsed = getRenderablePatch(diff.patch, "timeline-edit");
  if (parsed?.kind === "files" && parsed.files[0]) {
    const fileDiff = parsed.files[0];
    const created = fileDiff.type === "new" || item.changes?.[0]?.operation === "add";
    return created && fileDiff.additionLines.length > MAX_NEW_FILE_LINES
      ? { kind: "too-large" }
      : { kind: "diff", fileDiff, lineNumbers: true };
  }
  const [before, after] = [
    diff.content.find((entry) => entry.label === "Recorded content before")?.text,
    diff.content.find((entry) => entry.label === "Recorded content after")?.text,
  ];
  if (before === undefined && after === undefined) return null;
  // jsdiff cannot be interrupted here, so long snippets are refused up front.
  if (lineCount(before) + lineCount(after) > MAX_SNIPPET_DIFF_LINES) return { kind: "too-large" };
  return {
    kind: "diff",
    fileDiff: parseDiffFromFile(
      { name: item.fileName, contents: before ?? "" },
      { name: item.fileName, contents: after ?? "" },
    ),
    lineNumbers: false,
  };
}

/** The new-file line of the first change; a deletion points at the line that followed it. */
export function firstChangedLine(fileDiff: FileDiffMetadata): number | undefined {
  for (const hunk of fileDiff.hunks) {
    let line = hunk.additionStart;
    for (const content of hunk.hunkContent) {
      if (content.type === "change") return Math.max(1, line);
      line += content.lines;
    }
  }
  return undefined;
}

const TAB_COLUMNS = 4;
const SCROLL_INDENT_THRESHOLD = 8;
const SCROLL_INDENT_KEEP = 2;

function indentColumns(line: string): number | undefined {
  let columns = 0;
  for (const character of line) {
    if (character === " ") columns += 1;
    else if (character === "\t") columns += TAB_COLUMNS;
    else return character === "\n" || character === "\r" ? undefined : columns;
  }
  return undefined;
}

/**
 * Where an unwrapped diff starts scrolled: deeply indented changes skip most of their margin,
 * keeping two columns of it. Blank lines don't count.
 */
export function changedLinesScrollLeft(fileDiff: FileDiffMetadata, charWidth: number): number {
  let minIndent = Number.POSITIVE_INFINITY;
  for (const hunk of fileDiff.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type !== "change") continue;
      const lines = [
        ...fileDiff.deletionLines.slice(
          content.deletionLineIndex,
          content.deletionLineIndex + content.deletions,
        ),
        ...fileDiff.additionLines.slice(
          content.additionLineIndex,
          content.additionLineIndex + content.additions,
        ),
      ];
      for (const line of lines) {
        const indent = indentColumns(line);
        if (indent !== undefined) minIndent = Math.min(minIndent, indent);
      }
    }
  }
  return Number.isFinite(minIndent) && minIndent > SCROLL_INDENT_THRESHOLD
    ? (minIndent - SCROLL_INDENT_KEEP) * charWidth
    : 0;
}
