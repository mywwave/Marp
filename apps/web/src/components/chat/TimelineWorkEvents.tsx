import type { ContextMenuItem } from "@marp/contracts";
import { formatFilePathForClipboard } from "@marp/client-runtime/media-actions";
import {
  fileEditFailureReason,
  fileEditSummary,
  type WorkEventAction,
} from "@marp/client-runtime/work-log/event-presentation";
import { turnItemDetailRevision } from "@marp/client-runtime/work-log/item-detail";
import {
  commandDisplayText,
  commandIntent,
  commandSummary,
} from "@marp/client-runtime/work-log/command-label";
import type { FileDiffMetadata } from "@pierre/diffs";
import { FileDiff } from "@pierre/diffs/react";
import { CheckIcon, ChevronRightIcon, TerminalIcon } from "lucide-react";
import { use, useState, type MouseEvent, type ReactNode } from "react";

import {
  resolveFileContextMenuAbsolutePath,
  useFileContextMenu,
  type FileContextMenuAction,
} from "../../fileContextMenu";
import { formatWorkspaceRelativePath, timelinePathParts } from "../../filePathDisplay";
import { writeTextToClipboard } from "../../hooks/useCopyToClipboard";
import { useClientSettings } from "../../hooks/useSettings";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { resolveDiffThemeName } from "../../lib/diffRendering";
import { PREFERRED_HIGHLIGHTER } from "../../lib/syntaxHighlighting";
import {
  changedLinesScrollLeft,
  firstChangedLine,
  toolCallFileDiff,
  type ToolCallFileDiff,
} from "../../lib/toolCallDiff";
import { observeVisibleAnimation } from "../../lib/visibleAnimation";
import { readLocalApi } from "../../localApi";
import { useRightPanelStore } from "../../rightPanelStore";
import { tickTextContent } from "~/lib/tickTextContent";
import { cn } from "~/lib/utils";
import { useTurnItemDetail } from "../../state/queries";
import { workEntryDisplayIndicatesToolFailure } from "../../session-logic";
import { DiffWorkerPoolProvider } from "../DiffWorkerPoolProvider";
import { DIFF_VIEW_UNSAFE_CSS } from "../diffs/StyledDiffCodeView";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import { toastManager } from "../ui/toast";
import { DiffStatLabel } from "./DiffStatLabel";
import { CommandOutputTail, useCommandOutputStreaming } from "./CommandOutputPanel";
import { MessageCopyButton } from "./MessageCopyButton";
import { ShellCommandBlock } from "./ShellCommandBlock";
import { ActivityShimmerOverlay, useSpinnerFinished } from "./TimelineRowParts";
import { failedToolIconClassName, ToolActivityIconView } from "./TimelineToolActivityIcon";
import { workEntryIconName } from "./TimelineWorkEntryRow.logic";
import { formatWorkingTimerNow } from "./TimelineWorkGroupRows.logic";
import { WorkLogButton, WorkLogRow } from "./WorkLog";
import { CommandItemOutput } from "./V2ItemInspector";
import { commandCodeTarget } from "./CommandCodeOutput";
import { TimelineRowCtx, type TimelineWorkEntry } from "./timelineRowContext";

export function WorkingTimer({ createdAt }: { createdAt: string }) {
  return (
    <span
      ref={tickTextContent(() => formatWorkingTimerNow(createdAt), true)}
      className="tabular-nums"
    />
  );
}

/** A finished step's icon, fading in once where its spinner was. */
function FinishedIcon({ enters, children }: { enters: boolean; children: ReactNode }) {
  return enters ? (
    <span data-live className="live-enter flex [--live-enter-duration:150ms]">
      {children}
    </span>
  ) : (
    children
  );
}

function splitDisplayPath(path: string) {
  const index = path.lastIndexOf("/");
  return index < 0
    ? { name: path, dir: "" }
    : { name: path.slice(index + 1), dir: path.slice(0, index) };
}

function PathLabel({ path, workspaceRoot }: { path: string; workspaceRoot: string | undefined }) {
  const { name, dir } = timelinePathParts(path, workspaceRoot);
  return (
    <>
      <span className="shrink-0 font-mono text-xs text-foreground">{name}</span>
      {dir ? (
        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{dir}</span>
      ) : null}
    </>
  );
}

/** "Read `session.ts` src/auth": the verb, then the object it acted on. */
export function WorkEventLabel({
  action,
  workspaceRoot,
}: {
  action: WorkEventAction;
  workspaceRoot: string | undefined;
}) {
  const { target } = action;
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <span className={cn("shrink-0", action.phase === "error" && "text-destructive")}>
        {action.verb}
      </span>
      {target === null ? null : target.path ? (
        <PathLabel path={target.text} workspaceRoot={workspaceRoot} />
      ) : (
        <span
          className={cn("min-w-0 truncate text-foreground", target.mono && "font-mono text-xs")}
        >
          {target.text}
        </span>
      )}
      {target?.suffix ? (
        <span className="shrink-0 text-muted-foreground">{target.suffix.trim()}</span>
      ) : null}
    </span>
  );
}

function Shimmering({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      ref={active ? observeVisibleAnimation : undefined}
      className="relative flex min-w-0 items-baseline gap-1.5 overflow-hidden"
    >
      {children}
      {active ? (
        <ActivityShimmerOverlay>
          <span className="flex min-w-0 items-baseline gap-1.5">{children}</span>
        </ActivityShimmerOverlay>
      ) : null}
    </span>
  );
}

const cardClassName =
  "group/work-card my-1 min-w-0 overflow-hidden rounded-field bg-muted text-sm leading-relaxed";
const cardFocusClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70";

type CardProps = {
  workEntry: TimelineWorkEntry;
  /** The step is still running. */
  live: boolean;
  /** This card carries the run's one shimmer. */
  shimmer: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
};

/** Collapsed diffs show four 20px lines; an expanded one scrolls past 400px. */
const EDIT_PREVIEW_LINES = 4;
const EDIT_LINE_HEIGHT_PX = 20;
const NEAR_VIEWPORT_MARGIN = "160px 0px";

/** Latches true once the element comes within 160px of the viewport, so off-screen edits never fetch. */
function useNearViewport(): [boolean, (node: HTMLElement | null) => (() => void) | undefined] {
  const [near, setNear] = useState(false);
  const ref = (node: HTMLElement | null) => {
    if (node === null || near) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setNear(true);
      },
      { rootMargin: NEAR_VIEWPORT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  };
  return [near, ref];
}

type EditMenuAction = "open-file" | "open-diff" | "copy-path" | FileContextMenuAction;

/**
 * One edit as a step: the header names the file and its counts, the body previews the diff.
 * While a pending approval shows this edit, the approval card renders it instead.
 */
export function FileEditRow(props: CardProps) {
  const ctx = use(TimelineRowCtx);
  for (const entry of ctx.approvalEditEntries.values()) {
    if (entry.id === props.workEntry.id) return null;
  }
  return <FileEditCard {...props} />;
}

export function FileEditCard({
  workEntry,
  live,
  shimmer,
  expanded,
  onToggleExpanded,
  footer,
}: CardProps & { footer?: ReactNode }) {
  const ctx = use(TimelineRowCtx);
  const contextMenu = useFileContextMenu(ctx.activeThreadEnvironmentId);
  const [near, nearRef] = useNearViewport();
  const projectedItem = workEntry.projectedItem;
  const fileChange = projectedItem?.item.type === "file_change" ? projectedItem.item : undefined;
  const summary = fileEditSummary(workEntry, live);
  const failed = workEntryDisplayIndicatesToolFailure(workEntry);
  const running = live && !failed;
  const path = workEntry.changedFiles?.[0] ?? fileChange?.fileName ?? workEntry.label;
  const displayPath = formatWorkspaceRelativePath(path, ctx.workspaceRoot);
  const { name } = splitDisplayPath(displayPath);
  const more = (workEntry.changedFiles?.length ?? 1) - 1;
  const preview = running ? fileChange?.preview : undefined;
  // Nothing recorded to show: no counts, tail or patch. It reads as a plain step, not an empty card.
  const bare =
    !failed &&
    preview === undefined &&
    !fileChange?.diffStr &&
    (summary?.additions ?? 0) === 0 &&
    (summary?.deletions ?? 0) === 0;
  // Cursor's default density: a finished edit is one line and its diff opens on demand. A live
  // edit keeps its tail, and a proposal awaiting approval (with a footer) keeps the full card.
  const minimal = !bare && !failed && !running && footer === undefined;
  const detail = useEditDetail(
    projectedItem,
    (minimal ? expanded : near) && !failed && !running && !bare,
  );
  const diff = detail.diff?.kind === "diff" ? detail.diff : undefined;
  const fits = diff === undefined || diff.fileDiff.unifiedLineCount <= EDIT_PREVIEW_LINES;
  const canExpand = !failed && !running && !fits;
  const showFull = canExpand && expanded;
  const created = summary?.action.verb === "Created" || summary?.action.verb === "Creating";
  const counts = diff
    ? diffLineCounts(diff.fileDiff)
    : { additions: summary?.additions ?? 0, deletions: summary?.deletions ?? 0 };
  const onOpenToolDiff = ctx.onOpenToolDiff;
  const openDiff =
    projectedItem && fileChange && onOpenToolDiff
      ? () =>
          onOpenToolDiff({
            threadId: projectedItem.sourceThreadId,
            itemId: projectedItem.sourceItemId,
            revision: turnItemDetailRevision(fileChange),
          })
      : undefined;
  const threadRef = ctx.threadRef;
  const openFile = threadRef
    ? () => {
        const line = diff?.lineNumbers ? firstChangedLine(diff.fileDiff) : undefined;
        useRightPanelStore.getState().openFile(threadRef, displayPath, line);
      }
    : openDiff;
  const fileTarget = {
    environmentId: ctx.activeThreadEnvironmentId,
    filePath: path,
    workspaceRoot: ctx.workspaceRoot,
  };
  const showMenu = async (event: MouseEvent) => {
    const api = readLocalApi();
    if (api === undefined) return;
    const absolutePath = resolveFileContextMenuAbsolutePath(fileTarget);
    const items: ContextMenuItem<EditMenuAction>[] = [
      ...(threadRef ? [{ id: "open-file" as const, label: "Open file", icon: "file" }] : []),
      ...(openDiff ? [{ id: "open-diff" as const, label: "Open diff", icon: "file-diff" }] : []),
      ...(absolutePath ? [{ id: "copy-path" as const, label: "Copy path", icon: "copy" }] : []),
      ...contextMenu
        .buildItems(fileTarget)
        .map((item, index) => (index === 0 ? { ...item, separatorBefore: true } : item)),
    ];
    const clicked = await api.contextMenu.show(items, { x: event.clientX, y: event.clientY });
    if (clicked === null) return;
    if (clicked === "open-file") openFile?.();
    else if (clicked === "open-diff") openDiff?.();
    else if (clicked === "copy-path") {
      if (absolutePath) await copyPath(formatFilePathForClipboard(absolutePath));
    } else await contextMenu.activate(clicked, fileTarget);
  };
  const finished = useSpinnerFinished(running);
  const failure = failed ? fileEditFailureReason(fileChange?.diffStr) : undefined;
  // Holds the collapsed preview's height from the counts until the diff loads, so cards above
  // the reader do not grow while they scroll up.
  const placeholderHeight =
    Math.min(counts.additions + counts.deletions, EDIT_PREVIEW_LINES) * EDIT_LINE_HEIGHT_PX;
  const icon = (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        failed ? failedToolIconClassName : running ? "text-info-foreground" : "text-icon-muted",
      )}
    >
      {running ? (
        <Spinner size="sm" />
      ) : (
        <FinishedIcon enters={finished}>
          <ToolActivityIconView
            icon={workEntry.toolIcon ?? workEntry.toolSource?.icon}
            fallbackName={workEntryIconName(workEntry)}
            className="block size-4 shrink-0 stroke-2"
            muted
          />
        </FinishedIcon>
      )}
    </span>
  );
  const label = (
    <Shimmering active={shimmer && running}>
      <span className={cn("shrink-0", failed && "text-destructive")}>
        {summary?.action.verb ?? "Edited"}
      </span>
      {openFile ? (
        <button
          type="button"
          className="min-w-0 cursor-pointer truncate rounded-sm font-mono text-xs text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={`Open ${displayPath}`}
          onClick={(event) => {
            event.stopPropagation();
            openFile();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void showMenu(event);
          }}
        >
          {name}
        </button>
      ) : (
        <span className="min-w-0 truncate font-mono text-xs text-foreground">{name}</span>
      )}
      {more > 0 ? <span className="shrink-0 text-muted-foreground">+{more} more</span> : null}
    </Shimmering>
  );
  if (minimal) {
    return (
      <WorkLogRow
        ref={nearRef}
        data-v2-item-type="file_change"
        data-edit-row="minimal"
        role="button"
        tabIndex={0}
        aria-label={`${summary?.action.verb ?? "Edited"} ${displayPath}`}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            onToggleExpanded();
          }
        }}
        icon={icon}
        label={
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex min-w-0 items-baseline gap-1.5">{label}</span>
            <DiffStatLabel
              additions={counts.additions}
              deletions={created ? 0 : counts.deletions}
              layout="inline"
              hideZero
              className="shrink-0 text-xs"
            />
            <ChevronRightIcon
              aria-hidden
              className={cn(
                "size-3 shrink-0 text-icon-muted opacity-0 transition-[opacity,rotate] duration-150 ease-out group-hover/timeline-row:opacity-100 group-focus-visible/timeline-row:opacity-100",
                expanded && "rotate-90 opacity-100",
              )}
            />
          </span>
        }
      >
        {expanded ? (
          <div
            className="ms-7 mt-0.5 mb-1.5 cursor-auto overflow-hidden rounded-field bg-muted"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {detail.pending ? (
              <div className="flex flex-col gap-2 px-3 py-2" aria-busy>
                <Skeleton className="h-3 w-3/4 shrink-0" />
                <Skeleton className="h-3 w-1/2 shrink-0" />
              </div>
            ) : detail.diff?.kind === "too-large" ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                Diff too large to display
                {openDiff ? (
                  <Button variant="ghost-muted" size="micro" onClick={openDiff}>
                    Open diff
                  </Button>
                ) : null}
              </div>
            ) : diff ? (
              <InlineEditDiff diff={diff} full clipped={false} />
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">No changes recorded</div>
            )}
          </div>
        ) : null}
      </WorkLogRow>
    );
  }
  if (bare) {
    return (
      <WorkLogRow
        ref={nearRef}
        data-v2-item-type="file_change"
        data-edit-row="bare"
        icon={icon}
        label={<span className="flex min-w-0 items-baseline gap-1.5">{label}</span>}
      />
    );
  }
  return (
    <div
      ref={nearRef}
      className={cn(cardClassName, footer && "my-0")}
      data-v2-item-type="file_change"
    >
      <div
        className={cn("flex h-8 min-w-0 items-center gap-2 px-3", canExpand && "cursor-pointer")}
        onClick={canExpand ? onToggleExpanded : undefined}
      >
        {icon}
        <span className="flex min-w-0 items-baseline gap-1.5 text-secondary-label">
          {label}
          {/* A running edit's counts are estimates; a proposal awaiting approval shows them. */}
          {failed || (running && footer === undefined) ? null : (
            <DiffStatLabel
              additions={counts.additions}
              deletions={created ? 0 : counts.deletions}
              layout="inline"
              hideZero
              className="shrink-0 self-center text-xs"
            />
          )}
        </span>
        <span className="ms-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
          {preview ? (
            <span>
              {preview.lineCount} {preview.lineCount === 1 ? "line" : "lines"}
            </span>
          ) : null}
          {canExpand ? (
            <Button
              variant="ghost-muted"
              size="icon-micro"
              aria-label={expanded ? "Collapse diff" : "Expand diff"}
              aria-expanded={expanded}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded();
              }}
            >
              <ChevronRightIcon
                className={cn("transition-transform duration-150", expanded && "rotate-90")}
              />
            </Button>
          ) : null}
        </span>
      </div>
      {failed ? (
        <EditFailure reason={failure} error={fileChange?.diffStr} />
      ) : preview ? (
        <EditTail text={preview.tail} />
      ) : running ? null : !near || detail.pending ? (
        <div
          className="flex flex-col gap-2 overflow-hidden px-3 py-1"
          style={{ height: placeholderHeight }}
          aria-busy={near || undefined}
        >
          {near ? (
            <>
              <Skeleton className="h-3 w-3/4 shrink-0" />
              <Skeleton className="h-3 w-1/2 shrink-0" />
            </>
          ) : null}
        </div>
      ) : detail.diff?.kind === "too-large" ? (
        <div className="flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
          Diff too large to display
          {openDiff ? (
            <Button variant="ghost-muted" size="micro" onClick={openDiff}>
              Open diff
            </Button>
          ) : null}
        </div>
      ) : diff ? (
        <InlineEditDiff diff={diff} full={showFull} clipped={canExpand && !expanded} />
      ) : null}
      {footer}
    </div>
  );
}

function diffLineCounts(fileDiff: FileDiffMetadata) {
  let additions = 0;
  let deletions = 0;
  for (const hunk of fileDiff.hunks) {
    additions += hunk.additionLines;
    deletions += hunk.deletionLines;
  }
  return { additions, deletions };
}

async function copyPath(path: string) {
  try {
    if (await writeTextToClipboard(path, "file path")) {
      toastManager.add({ type: "success", title: "Path copied", description: path });
    }
  } catch {
    toastManager.add({ type: "error", title: "Failed to copy path", description: path });
  }
}

/** The edit's recorded content, fetched once the card nears the viewport, as a renderable diff. */
function useEditDetail(projectedItem: TimelineWorkEntry["projectedItem"], enabled: boolean) {
  const ctx = use(TimelineRowCtx);
  const wireItem = projectedItem?.item;
  const needsFetch = enabled && wireItem?.type === "file_change" && !wireItem.diffStr;
  const detail = useTurnItemDetail(
    needsFetch && projectedItem && wireItem
      ? {
          environmentId: ctx.activeThreadEnvironmentId,
          threadId: projectedItem.sourceThreadId,
          itemId: projectedItem.sourceItemId,
          revision: turnItemDetailRevision(wireItem),
        }
      : null,
    ctx.turnItemSource?.detail,
  );
  const fetched = detail.data?.item;
  const item = fetched?.type === "file_change" ? fetched : wireItem;
  const diff = enabled && item?.type === "file_change" ? toolCallFileDiff(item) : null;
  return { pending: needsFetch && detail.isPending, diff };
}

/** What a running edit is writing: the newest lines that fit, pinned to the bottom. */
function EditTail({ text }: { text: string }) {
  return (
    <div
      aria-live="off"
      className="flex h-20 flex-col justify-end overflow-hidden px-3 pb-1 font-mono text-xs leading-5 whitespace-pre text-muted-foreground"
    >
      {text.split("\n").map((line, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- lines have no identity; the tail only grows at its end
        <div key={index} className="min-h-5 truncate">
          {line}
        </div>
      ))}
    </div>
  );
}

function EditFailure({ reason, error }: { reason: string | undefined; error: string | undefined }) {
  const [open, setOpen] = useState(false);
  const raw = error?.trim();
  if (!reason) return null;
  return (
    <div className="px-3 pb-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-destructive">{reason}</span>
        {raw && raw !== reason ? (
          <Button
            variant="ghost-muted"
            size="micro"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide error" : "Show error"}
          </Button>
        ) : null}
      </div>
      {open && raw ? (
        <pre className="mt-1 max-h-40 overflow-auto rounded-field bg-background/40 px-2 py-1.5 font-mono whitespace-pre-wrap text-muted-foreground select-text [scrollbar-width:thin]">
          {raw}
        </pre>
      ) : null}
    </div>
  );
}

/** Inline: code at 12/20, a solid 2px strip instead of Pierre's 4px bars, a thin scrollbar. */
const INLINE_DIFF_UNSAFE_CSS = `${DIFF_VIEW_UNSAFE_CSS}
:host {
  --diffs-font-size: 12px;
  --diffs-line-height: 20px;
}
[data-indicators="bars"] [data-column-number]::before {
  width: 2px !important;
}
[data-indicators="bars"] [data-line-type="change-deletion"][data-column-number]::before {
  background-image: none !important;
  background-color: var(--diffs-deletion-base) !important;
}
[data-code] {
  scrollbar-width: thin;
}
`;

let measuredCharWidth: number | undefined;

function codeCharWidth(code: HTMLElement): number {
  if (measuredCharWidth !== undefined) return measuredCharWidth;
  const context = document.createElement("canvas").getContext("2d");
  if (context === null) return 7.2;
  context.font = getComputedStyle(code).font;
  measuredCharWidth = context.measureText("0").width || 7.2;
  return measuredCharWidth;
}

function InlineEditDiff({
  diff,
  full,
  clipped,
}: {
  diff: Extract<ToolCallFileDiff, { kind: "diff" }>;
  full: boolean;
  /** More lines sit below the collapsed preview. */
  clipped: boolean;
}) {
  const theme = useRenderedAppearance();
  const wordWrap = useClientSettings((settings) => settings.wordWrap);
  // Deeply indented changes open scrolled past their empty margin; wrapped code has nothing to skip.
  const alignChangedLines = (node: HTMLElement) => {
    if (wordWrap) return;
    const codes = (node.shadowRoot ?? node).querySelectorAll<HTMLElement>("[data-code]");
    const first = codes[0];
    if (first === undefined) return;
    const scrollLeft = full ? changedLinesScrollLeft(diff.fileDiff, codeCharWidth(first)) : 0;
    for (const code of codes) code.scrollLeft = scrollLeft;
  };
  return (
    <div
      className={cn(
        "diff-render-surface overscroll-contain bg-muted [--code-background:var(--muted)]",
        full ? "max-h-100 overflow-y-auto" : "max-h-20 overflow-hidden",
        clipped && "mask-b-from-60%",
      )}
    >
      <DiffWorkerPoolProvider>
        <FileDiff
          fileDiff={diff.fileDiff}
          options={{
            diffStyle: "unified",
            diffIndicators: "bars",
            lineDiffType: "word-alt",
            lineHoverHighlight: "line",
            hunkSeparators: "simple",
            overflow: wordWrap ? "wrap" : "scroll",
            disableFileHeader: true,
            disableLineNumbers: !diff.lineNumbers,
            theme: resolveDiffThemeName(theme),
            themeType: theme,
            preferredHighlighter: PREFERRED_HIGHLIGHTER,
            unsafeCSS: INLINE_DIFF_UNSAFE_CSS,
            onPostRender: (node, _instance, phase) => {
              if (phase !== "unmount") alignChangedLines(node);
            },
          }}
        />
      </DiffWorkerPoolProvider>
    </div>
  );
}

/**
 * A command step. Inside a multi-step run (`compact`) it is one row (icon, purpose, exit status)
 * that opens into the full card; alone it is the card.
 */
export function CommandCard({
  workEntry,
  live,
  shimmer,
  expanded,
  onToggleExpanded,
  compact = false,
}: CardProps & { compact?: boolean }) {
  const ctx = use(TimelineRowCtx);
  const [commandExpanded, setCommandExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  // Only what the user's click opens fades in; restored or remounted output just appears.
  const [revealed, setRevealed] = useState(false);
  const projectedItem = workEntry.projectedItem;
  const item = projectedItem?.item ?? workEntry.structuredPayload;
  const commandItem = item?.type === "command_execution" ? item : undefined;
  const command = commandDisplayText(commandItem?.input ?? workEntry.command ?? "");
  const failed = workEntryDisplayIndicatesToolFailure(workEntry);
  const running = live && !failed;
  const finished = useSpinnerFinished(running);
  // A failed command keeps the tail it showed while running; a success folds back to its header.
  const [sawRunning, setSawRunning] = useState(running);
  if (running && !sawRunning) setSawRunning(true);
  const environmentStreamsOutput = useCommandOutputStreaming(ctx.activeThreadEnvironmentId);
  const tail =
    projectedItem &&
    commandItem &&
    !expanded &&
    (running || (failed && sawRunning)) &&
    (ctx.turnItemSource !== undefined || environmentStreamsOutput) ? (
      <CommandOutputTail
        environmentId={ctx.activeThreadEnvironmentId}
        threadId={projectedItem.sourceThreadId}
        itemId={projectedItem.sourceItemId}
        source={ctx.turnItemSource?.commandOutput}
        // Under the label column, past the icon slot, in the row or in the open card.
        className={compact && !open ? "ms-6 mt-0.5 mb-1" : "mx-3 mb-1.5"}
        onOpen={() => {
          setRevealed(true);
          onToggleExpanded();
        }}
      />
    ) : null;
  const description = commandItem?.description?.trim();
  // Never the raw command on the line: its description, else a few words for what it runs.
  const intent = command ? commandIntent(command) : null;
  const intentVerb = intent?.verbs[running ? "loading" : failed ? "error" : "completed"];
  const summary = !command
    ? null
    : intentVerb === undefined
      ? commandSummary(command)
      : intent?.object
        ? `${intentVerb} ${intent.object}`
        : intentVerb;
  const header =
    description ||
    summary ||
    (running ? "Running command" : failed ? "Run command" : "Ran command");
  const headerLabel = (
    <>
      <span className="truncate">{header}</span>
      {description && summary && summary.toLowerCase() !== description.toLowerCase() ? (
        <>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            ·
          </span>
          <span className="min-w-0 shrink-[2] truncate text-muted-foreground">{summary}</span>
        </>
      ) : null}
    </>
  );
  const exitCode = commandItem?.exitCode;
  const icon = (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        running ? "text-info-foreground" : failed ? "text-destructive" : "text-icon-muted",
      )}
    >
      {running ? (
        <Spinner size="sm" />
      ) : (
        <FinishedIcon enters={finished}>
          <TerminalIcon className="size-4" />
        </FinishedIcon>
      )}
    </span>
  );
  const status = (
    <span className="ms-auto flex shrink-0 items-center gap-1 text-xs tabular-nums">
      {running ? (
        <span className="text-muted-foreground">
          <WorkingTimer createdAt={workEntry.createdAt} />
        </span>
      ) : failed ? (
        <span className="text-destructive">
          {exitCode !== undefined && exitCode !== 0 ? `exit ${exitCode}` : "Failed"}
        </span>
      ) : exitCode === 0 ? (
        <span className="flex items-center gap-0.5 text-muted-foreground" aria-label="exit 0">
          <CheckIcon aria-hidden className="size-3" />0
        </span>
      ) : null}
    </span>
  );
  // In a multi-step run the header is the same row open or closed, so opening never moves it.
  const compactRow = compact ? (
    <WorkLogButton
      data-v2-item-type="command_execution"
      data-command-row="compact"
      aria-expanded={open}
      onClick={() => {
        setRevealed(true);
        setOpen((value) => !value);
      }}
      icon={icon}
      label={<Shimmering active={shimmer && running}>{headerLabel}</Shimmering>}
      trailing={<span className="flex shrink-0 pe-1">{status}</span>}
    />
  ) : null;
  if (compactRow && !open) {
    return tail ? (
      <>
        {compactRow}
        {tail}
      </>
    ) : (
      compactRow
    );
  }
  const headerContent = (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate text-secondary-label">
        <Shimmering active={shimmer && running}>{headerLabel}</Shimmering>
      </span>
      {status}
    </>
  );
  const card = (
    <div
      className={cn(
        cardClassName,
        compactRow && "mt-0.5 pt-2",
        revealed && "live-enter [--live-enter-duration:150ms]",
      )}
      data-live={revealed || undefined}
      data-v2-item-type={compactRow ? undefined : "command_execution"}
    >
      {compactRow ? null : (
        <div className="flex h-8 min-w-0 items-center gap-2 px-3">{headerContent}</div>
      )}
      {command ? (
        <button
          type="button"
          className={cn(
            "block w-full cursor-pointer px-3 pb-1 text-left font-mono text-xs leading-5",
            cardFocusClassName,
          )}
          aria-expanded={commandExpanded}
          aria-label={commandExpanded ? "Collapse command" : "Expand command"}
          onClick={() => setCommandExpanded((value) => !value)}
        >
          <span className="flex min-w-0 gap-1.5">
            <span aria-hidden className="shrink-0 select-none text-muted-foreground">
              $
            </span>
            <span className={cn("min-w-0", !commandExpanded && "line-clamp-2")}>
              <ShellCommandBlock command={command} />
            </span>
          </span>
        </button>
      ) : null}
      {tail}
      {projectedItem && commandItem ? (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <Button
            variant="ghost-muted"
            size="micro"
            aria-expanded={expanded}
            onClick={() => {
              setRevealed(true);
              onToggleExpanded();
            }}
          >
            {expanded ? "Hide output" : "Show output"}
          </Button>
          {command ? (
            <MessageCopyButton text={command} label="Copy command" size="icon-xs" variant="ghost" />
          ) : null}
        </div>
      ) : null}
      {expanded && projectedItem && commandItem ? (
        <div
          className={cn("px-3 pb-3", revealed && "live-enter [--live-enter-duration:150ms]")}
          onClick={(event) => event.stopPropagation()}
        >
          <CommandItemOutput
            projectedItem={projectedItem}
            environmentId={ctx.activeThreadEnvironmentId}
            source={ctx.turnItemSource}
            code={command ? commandCodeTarget(command) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
  if (!compactRow) return card;
  return (
    <>
      {compactRow}
      {card}
    </>
  );
}
