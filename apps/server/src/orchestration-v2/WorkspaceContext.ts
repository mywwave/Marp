// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";

import type {
  OrchestrationV2CheckpointScope,
  ProviderDriverKind,
  WorkspaceOpenState,
} from "@marp/contracts";
import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as ServerSettings from "../serverSettings.ts";
import * as GitVcsDriver from "../vcs/GitVcsDriver.ts";
import * as CheckpointService from "./CheckpointService.ts";

/** Starting a turn waits at most this long for each section. */
export const WORKSPACE_CONTEXT_BUDGET = Duration.millis(300);
const CHANGED_FILES_MAX_LINES = 30;
// Codex caps each additional-context entry at 4,000 bytes.
const CHANGED_FILES_MAX_BYTES = 3_500;
const LAYOUT_MAX_LINES = 120;
const LAYOUT_MAX_BYTES = 1_500;
const TRUNCATION_MARKER_BYTES = "\n(truncated)".length;
// Entries shown per folder at each depth before "+N more".
const LAYOUT_DIR_LIMITS = [40, 12, 8] as const;
const LAYOUT_FILE_LIMITS = [15, 6, 3] as const;
const GIT_LISTING_MAX_BYTES = 4 * 1024 * 1024;
const FS_WALK_MAX_DEPTH = 4;
const FS_WALK_MAX_FILES = 5_000;
const FS_WALK_SKIPPED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  ".cache",
]);

export interface WorkspaceContextSection {
  readonly key: "changes" | "layout" | "open";
  readonly text: string;
}

/** Codex takes sections as additional context; every other provider reads them before the prompt. */
export const deliversWorkspaceContextOutOfBand = (driver: ProviderDriverKind) => driver === "codex";

export function renderWorkspaceContextPreamble(
  sections: ReadonlyArray<WorkspaceContextSection>,
): string | undefined {
  if (sections.length === 0) return undefined;
  return [
    "Workspace context from Marp (a snapshot taken as this turn started, not part of the user's request):",
    ...sections.map((section) => section.text),
  ].join("\n\n");
}

const byteLength = (text: string) => Buffer.byteLength(text, "utf8");

export function renderChangedFiles(
  changes: ReadonlyArray<CheckpointService.WorkspaceFileChange>,
): string | undefined {
  if (changes.length === 0) return undefined;
  const lines = ["Changed since your last turn by the user or another tool (lines added/removed):"];
  let bytes = byteLength(lines[0]!);
  let shown = 0;
  for (const change of changes) {
    if (shown === CHANGED_FILES_MAX_LINES) break;
    const path =
      change.previousPath === undefined ? change.path : `${change.previousPath} -> ${change.path}`;
    const line = `- ${change.status} ${path} (+${change.additions}/-${change.deletions})`;
    // Leave room for the "+N more" line.
    if (bytes + byteLength(line) + 32 > CHANGED_FILES_MAX_BYTES) break;
    lines.push(line);
    bytes += byteLength(line) + 1;
    shown += 1;
  }
  if (shown < changes.length) lines.push(`- +${changes.length - shown} more files`);
  return lines.join("\n");
}

interface LayoutDir {
  readonly dirs: Map<string, LayoutDir>;
  readonly files: string[];
  count: number;
}

const emptyLayoutDir = (): LayoutDir => ({ dirs: new Map(), files: [], count: 0 });

const fitsLayoutCaps = (lines: ReadonlyArray<string>) =>
  lines.length < LAYOUT_MAX_LINES &&
  byteLength(lines.join("\n")) + TRUNCATION_MARKER_BYTES <= LAYOUT_MAX_BYTES;

/** Lines for `root`, opening only folders in `expanded`. Visits each shown folder in `onFolder`. */
function renderLayoutTree(
  root: LayoutDir,
  expanded: ReadonlySet<LayoutDir>,
  onFolder?: (folder: LayoutDir, depth: number) => void,
): string[] {
  const lines: string[] = [];
  const visit = (dir: LayoutDir, depth: number, indent: string) => {
    const dirs = [...dir.dirs].toSorted(([left], [right]) => left.localeCompare(right));
    const files = dir.files.toSorted((left, right) => left.localeCompare(right));
    const dirLimit = LAYOUT_DIR_LIMITS[depth] ?? 0;
    const fileLimit = LAYOUT_FILE_LIMITS[depth] ?? 0;
    for (const [name, child] of dirs.slice(0, dirLimit)) {
      // Fold single-folder chains such as src/main/java into one line.
      let label = name;
      let node = child;
      while (node.files.length === 0 && node.dirs.size === 1) {
        const [nextName, next] = [...node.dirs][0]!;
        label = `${label}/${nextName}`;
        node = next;
      }
      lines.push(`${indent}${label}/ (${node.count})`);
      if (depth + 1 >= LAYOUT_DIR_LIMITS.length) continue;
      onFolder?.(node, depth + 1);
      if (expanded.has(node)) visit(node, depth + 1, `${indent}  `);
    }
    for (const file of files.slice(0, fileLimit)) lines.push(`${indent}${file}`);
    const omitted = Math.max(0, dirs.length - dirLimit) + Math.max(0, files.length - fileLimit);
    if (omitted > 0) lines.push(`${indent}+${omitted} more`);
  };
  visit(root, 0, "");
  return lines;
}

/** A tree up to three levels deep with folder file counts, opened breadth-first while it fits. */
export function renderProjectLayout(
  paths: ReadonlyArray<string>,
  partial: boolean,
): string | undefined {
  const root = emptyLayoutDir();
  for (const path of paths) {
    const parts = path.split("/").filter((part) => part !== "");
    const fileName = parts.pop();
    if (fileName === undefined) continue;
    let dir = root;
    root.count += 1;
    for (const part of parts) {
      let child = dir.dirs.get(part);
      if (child === undefined) {
        child = emptyLayoutDir();
        dir.dirs.set(part, child);
      }
      child.count += 1;
      dir = child;
    }
    dir.files.push(fileName);
  }
  if (root.count === 0) return undefined;
  const header = `Project layout (${root.count}${partial ? "+" : ""} files; folders show file counts):`;
  const expanded = new Set<LayoutDir>();
  for (let depth = 1; depth < LAYOUT_DIR_LIMITS.length; depth += 1) {
    const candidates: LayoutDir[] = [];
    renderLayoutTree(root, expanded, (folder, folderDepth) => {
      if (folderDepth === depth) candidates.push(folder);
    });
    // Bigger folders open first; ones that do not fit stay collapsed while smaller ones try.
    for (const folder of candidates.toSorted((left, right) => right.count - left.count)) {
      expanded.add(folder);
      if (!fitsLayoutCaps([header, ...renderLayoutTree(root, expanded)])) expanded.delete(folder);
    }
  }
  return truncateLayout([header, ...renderLayoutTree(root, expanded)].join("\n"));
}

function truncateLayout(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let bytes = 0;
  for (const line of lines) {
    if (
      kept.length === LAYOUT_MAX_LINES - 1 ||
      bytes + byteLength(line) + TRUNCATION_MARKER_BYTES > LAYOUT_MAX_BYTES
    ) {
      kept.push("(truncated)");
      return kept.join("\n");
    }
    kept.push(line);
    bytes += byteLength(line) + 1;
  }
  return kept.join("\n");
}

const DIFF_SCOPE_LABELS = {
  turn: "a turn's changes",
  branch: "the branch's changes",
  unstaged: "unstaged changes",
} as const;

function renderOpenState(open: WorkspaceOpenState | undefined): string | undefined {
  if (open === undefined) return undefined;
  const lines = [
    ...(open.file === undefined ? [] : [`- File: ${open.file}`]),
    ...(open.diff === undefined ? [] : [`- Diff panel: ${DIFF_SCOPE_LABELS[open.diff]}`]),
    ...(open.selection === undefined
      ? []
      : [
          `- Selected: ${open.selection.path} line${
            open.selection.startLine === open.selection.endLine
              ? ` ${open.selection.startLine}`
              : `s ${open.selection.startLine}-${open.selection.endLine}`
          }`,
        ]),
  ];
  return lines.length === 0 ? undefined : ["Open in Marp:", ...lines].join("\n");
}

const walkFiles = (cwd: string) =>
  Effect.tryPromise(async () => {
    const files: string[] = [];
    let partial = false;
    const visit = async (relative: string, depth: number): Promise<void> => {
      const entries = await NodeFSP.readdir(NodePath.join(cwd, relative), {
        withFileTypes: true,
      }).catch(() => []);
      for (const entry of entries) {
        if (files.length >= FS_WALK_MAX_FILES) {
          partial = true;
          return;
        }
        const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
        if (entry.isDirectory()) {
          if (FS_WALK_SKIPPED_DIRS.has(entry.name)) continue;
          if (depth + 1 >= FS_WALK_MAX_DEPTH) {
            partial = true;
            continue;
          }
          await visit(path, depth + 1);
        } else if (entry.isFile()) {
          files.push(path);
        }
      }
    };
    await visit("", 0);
    return { paths: files, partial };
  });

interface WorkspaceContextTurnInput {
  readonly scope: OrchestrationV2CheckpointScope;
  readonly runOrdinal: number;
  readonly open?: WorkspaceOpenState | undefined;
}

export class WorkspaceContextV2 extends Context.Service<
  WorkspaceContextV2,
  {
    /** Never fails: a section that errors or runs over budget is left out. */
    readonly forTurn: (
      input: WorkspaceContextTurnInput,
    ) => Effect.Effect<ReadonlyArray<WorkspaceContextSection>>;
  }
>()("marp/orchestration-v2/WorkspaceContext/WorkspaceContextV2") {}

export const layer: Layer.Layer<
  WorkspaceContextV2,
  never,
  | CheckpointService.CheckpointServiceV2
  | ServerSettings.ServerSettingsService
  | GitVcsDriver.GitVcsDriver
> = Layer.effect(
  WorkspaceContextV2,
  Effect.gen(function* () {
    const scope = yield* Effect.scope;
    const checkpoints = yield* CheckpointService.CheckpointServiceV2;
    const serverSettings = yield* ServerSettings.ServerSettingsService;
    const git = yield* GitVcsDriver.GitVcsDriver;
    const runGit = (cwd: string, args: ReadonlyArray<string>, maxOutputBytes: number) =>
      git.execute({
        operation: "WorkspaceContext.git",
        cwd,
        args: ["-c", "core.fsmonitor=false", ...args],
        allowNonZeroExit: true,
        timeoutMs: 20_000,
        maxOutputBytes,
        appendTruncationMarker: false,
      });

    // Keyed by HEAD and cwd, so new threads on the same commit reuse the tree.
    const layoutCache = yield* Cache.makeWith<string, string | undefined>(
      (key) => {
        const separator = key.indexOf("\0");
        const cwd = key.slice(separator + 1);
        const listing: Effect.Effect<
          { readonly paths: ReadonlyArray<string>; readonly partial: boolean },
          unknown
        > = key.startsWith("fs\0")
          ? walkFiles(cwd)
          : runGit(
              cwd,
              ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
              GIT_LISTING_MAX_BYTES,
            ).pipe(
              Effect.map((result) => {
                const paths = result.stdout.split("\0").filter((path) => path !== "");
                // A truncated listing ends mid-path.
                if (result.stdoutTruncated) paths.pop();
                return { paths, partial: result.stdoutTruncated };
              }),
            );
        return listing.pipe(
          Effect.map(({ paths, partial }) => renderProjectLayout(paths, partial)),
          Effect.catchCause((cause) =>
            Effect.logWarning("Workspace layout listing failed", { cwd, cause }).pipe(
              Effect.as(undefined),
            ),
          ),
        );
      },
      {
        capacity: 64,
        timeToLive: Exit.match({
          onSuccess: (layout) =>
            layout === undefined ? Duration.minutes(1) : Duration.minutes(10),
          onFailure: () => Duration.zero,
        }),
      },
    );

    const projectLayout = Effect.fn("WorkspaceContext.projectLayout")(function* (cwd: string) {
      // Exit 128 outside a repository; an unborn HEAD prints "HEAD" back.
      const head = yield* runGit(cwd, ["rev-parse", "--verify", "--quiet", "HEAD"], 256).pipe(
        Effect.map((result) =>
          result.exitCode === 0 ? result.stdout.trim() : result.exitCode === 1 ? "unborn" : null,
        ),
        Effect.orElseSucceed(() => null),
      );
      return yield* Cache.get(layoutCache, head === null ? `fs\0${cwd}` : `git:${head}\0${cwd}`);
    });

    const changedFiles = Effect.fn("WorkspaceContext.changedFiles")(function* (
      input: WorkspaceContextTurnInput,
    ) {
      // The previous run's end checkpoint is the agent's last state; later edits are not its own.
      const changes = yield* checkpoints.diffWorkspace({
        scope: input.scope,
        fromOrdinalWithinScope: input.runOrdinal - 1,
      });
      return changes === null ? undefined : renderChangedFiles(changes);
    });

    // Forked so a timeout never kills git mid-write; the layout still lands in the cache.
    const withinBudget = Effect.fn("WorkspaceContext.withinBudget")(
      function* (label: string, section: Effect.Effect<string | undefined, unknown>) {
        const fiber = yield* Effect.forkIn(section, scope);
        const result = yield* Fiber.join(fiber).pipe(
          Effect.timeoutOption(WORKSPACE_CONTEXT_BUDGET),
        );
        if (Option.isNone(result)) {
          yield* Effect.logInfo("Workspace context section skipped: over budget", { label });
          return undefined;
        }
        return result.value;
      },
      (effect, label) =>
        effect.pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("Workspace context section failed", { label, cause }).pipe(
              Effect.as(undefined),
            ),
          ),
        ),
    );

    return WorkspaceContextV2.of({
      forTurn: Effect.fn("WorkspaceContext.forTurn")(function* (input) {
        const settings = yield* serverSettings.getSettings.pipe(Effect.option);
        if (Option.isNone(settings) || !settings.value.shareWorkspaceContext) return [];
        const [changes, layout] = yield* Effect.all(
          [
            input.runOrdinal > 1 ? withinBudget("changes", changedFiles(input)) : Effect.undefined,
            input.runOrdinal === 1
              ? withinBudget("layout", projectLayout(input.scope.cwd))
              : Effect.undefined,
          ],
          { concurrency: 2 },
        );
        const open = renderOpenState(input.open);
        return [
          ...(changes === undefined ? [] : [{ key: "changes" as const, text: changes }]),
          ...(layout === undefined ? [] : [{ key: "layout" as const, text: layout }]),
          ...(open === undefined ? [] : [{ key: "open" as const, text: open }]),
        ];
      }),
    });
  }),
);

/** For harnesses whose tests do not exercise workspace context. */
export const layerEmpty = Layer.succeed(
  WorkspaceContextV2,
  WorkspaceContextV2.of({
    forTurn: Effect.fn("WorkspaceContext.forTurnEmpty")(() => Effect.succeed([])),
  }),
);
