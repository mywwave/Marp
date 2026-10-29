import {
  fileEditSummary,
  type WorkEventAction,
} from "@marp/client-runtime/work-log/event-presentation";
import { turnItemDetailRevision } from "@marp/client-runtime/work-log/item-detail";
import { commandDisplayText } from "@marp/client-runtime/work-log/command-label";
import { FileDiff } from "@pierre/diffs/react";
import { CheckIcon, ChevronRightIcon, TerminalIcon } from "lucide-react";
import { use, useState, type ReactNode } from "react";

import { useFileContextMenuHandler } from "../../fileContextMenu";
import { formatWorkspaceRelativePath } from "../../filePathDisplay";
import { useClientSettings } from "../../hooks/useSettings";
import { useRenderedAppearance } from "../../hooks/useTheme";
import { resolveDiffThemeName } from "../../lib/diffRendering";
import { PREFERRED_HIGHLIGHTER } from "../../lib/syntaxHighlighting";
import { toolCallFileDiff } from "../../lib/toolCallDiff";
import { observeVisibleAnimation } from "../../lib/visibleAnimation";
import { tickTextContent } from "~/lib/tickTextContent";
import { cn } from "~/lib/utils";
import { useTurnItemDetail } from "../../state/queries";
import { workEntryDisplayIndicatesToolFailure } from "../../session-logic";
import { DiffWorkerPoolProvider } from "../DiffWorkerPoolProvider";
import { DIFF_VIEW_UNSAFE_CSS } from "../diffs/StyledDiffCodeView";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";
import { DiffStatLabel } from "./DiffStatLabel";
import { MessageCopyButton } from "./MessageCopyButton";
import { ShellCommandBlock } from "./ShellCommandBlock";
import { ActivityShimmerOverlay } from "./TimelineRowParts";
import { failedToolIconClassName, ToolActivityIconView } from "./TimelineToolActivityIcon";
import { workEntryIconName } from "./TimelineWorkEntryRow.logic";
import { formatWorkingTimerNow } from "./TimelineWorkGroupRows.logic";
import { WorkLogButton, WorkLogDetails, WorkLogRow } from "./WorkLog";
import { CommandItemOutput } from "./V2ItemInspector";
import { TimelineRowCtx, type TimelineWorkEntry } from "./timelineRowContext";

export function WorkingTimer({ createdAt }: { createdAt: string }) {
  return (
    <span
      ref={tickTextContent(() => formatWorkingTimerNow(createdAt), true)}
      className="tabular-nums"
    />
  );
}

function splitDisplayPath(path: string) {
  const index = path.lastIndexOf("/");
  return index < 0
    ? { name: path, dir: "" }
    : { name: path.slice(index + 1), dir: path.slice(0, index) };
}

function PathLabel({ path, workspaceRoot }: { path: string; workspaceRoot: string | undefined }) {
  const { name, dir } = splitDisplayPath(formatWorkspaceRelativePath(path, workspaceRoot));
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

/**
 * "Edited `session.ts` +3 -1" as one step row. The name opens the edit in the diff panel; the
 * chevron, shown on hover or focus, unfolds the diff inline. Edit content is not on the wire
 * while the step runs, so a running edit is the header alone, shimmering.
 */
export function FileEditRow({ workEntry, live, shimmer, expanded, onToggleExpanded }: CardProps) {
  const ctx = use(TimelineRowCtx);
  const onFileContextMenu = useFileContextMenuHandler(ctx.activeThreadEnvironmentId);
  const projectedItem = workEntry.projectedItem;
  const fileChange = projectedItem?.item.type === "file_change" ? projectedItem.item : undefined;
  const summary = fileEditSummary(workEntry, live);
  const failed = workEntryDisplayIndicatesToolFailure(workEntry);
  const running = live && !failed;
  const path = workEntry.changedFiles?.[0] ?? fileChange?.fileName ?? workEntry.label;
  const displayPath = formatWorkspaceRelativePath(path, ctx.workspaceRoot);
  const { name } = splitDisplayPath(displayPath);
  const more = (workEntry.changedFiles?.length ?? 1) - 1;
  const onOpenToolDiff = ctx.onOpenToolDiff;
  const openDiff =
    projectedItem && fileChange && onOpenToolDiff && !running
      ? () =>
          onOpenToolDiff({
            threadId: projectedItem.sourceThreadId,
            itemId: projectedItem.sourceItemId,
            revision: turnItemDetailRevision(fileChange),
          })
      : undefined;
  const canExpand = !running && projectedItem !== undefined && fileChange !== undefined;
  const nameClassName = "min-w-0 truncate font-mono text-xs text-foreground";
  return (
    <WorkLogRow
      data-v2-item-type="file_change"
      icon={
        <span
          className={cn(
            "flex size-4 items-center justify-center",
            failed ? failedToolIconClassName : running ? "text-info-foreground" : "text-icon-muted",
          )}
        >
          {running ? (
            <Spinner size="sm" />
          ) : (
            <ToolActivityIconView
              icon={workEntry.toolIcon ?? workEntry.toolSource?.icon}
              fallbackName={workEntryIconName(workEntry)}
              className="block size-4 shrink-0 stroke-2"
              muted
            />
          )}
        </span>
      }
      label={
        <span className="group/edit flex min-w-0 items-baseline gap-1.5">
          <Shimmering active={shimmer && running}>
            <span
              className={cn("shrink-0", summary?.action.phase === "error" && "text-destructive")}
            >
              {summary?.action.verb ?? "Edited"}
            </span>
            {openDiff ? (
              <button
                type="button"
                className={cn(
                  nameClassName,
                  "cursor-pointer rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
                aria-label={`Open diff for ${displayPath}`}
                onClick={openDiff}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onFileContextMenu(
                    {
                      environmentId: ctx.activeThreadEnvironmentId,
                      filePath: path,
                      workspaceRoot: ctx.workspaceRoot,
                    },
                    event,
                  );
                }}
              >
                {name}
              </button>
            ) : (
              <span className={nameClassName}>{name}</span>
            )}
            {more > 0 ? <span className="shrink-0 text-muted-foreground">+{more} more</span> : null}
          </Shimmering>
          {summary && !running && !failed ? (
            <DiffStatLabel
              additions={summary.additions}
              deletions={summary.deletions}
              layout="inline"
              hideZero
              className="shrink-0 self-center text-xs"
            />
          ) : null}
          {canExpand ? (
            <span
              className={cn(
                "flex shrink-0 self-center transition-opacity duration-150 pointer-coarse:opacity-100",
                expanded
                  ? "opacity-100"
                  : "opacity-0 group-hover/timeline-row:opacity-100 group-focus-within/edit:opacity-100",
              )}
            >
              <Button
                variant="ghost-muted"
                size="icon-micro"
                aria-label={expanded ? "Hide changes" : "Show changes"}
                aria-expanded={expanded}
                onClick={onToggleExpanded}
              >
                <ChevronRightIcon
                  className={cn("transition-transform duration-150", expanded && "rotate-90")}
                />
              </Button>
            </span>
          ) : null}
        </span>
      }
    >
      {expanded && canExpand ? (
        <WorkLogDetails kind="panel">
          <InlineEditDiff projectedItem={projectedItem} failed={failed} />
        </WorkLogDetails>
      ) : null}
    </WorkLogRow>
  );
}

/** Inline: code at 12/18, a solid 2px strip instead of Pierre's 4px bars, a thin scrollbar. */
const INLINE_DIFF_UNSAFE_CSS = `${DIFF_VIEW_UNSAFE_CSS}
:host {
  --diffs-font-size: 12px;
  --diffs-line-height: 18px;
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

const inlineDiffClassName =
  "diff-render-surface max-h-60 overflow-y-auto overscroll-contain rounded-field bg-muted [--code-background:var(--muted)]";

function InlineEditDiff({
  projectedItem,
  failed,
}: {
  projectedItem: NonNullable<TimelineWorkEntry["projectedItem"]>;
  failed: boolean;
}) {
  const ctx = use(TimelineRowCtx);
  const theme = useRenderedAppearance();
  const wordWrap = useClientSettings((settings) => settings.wordWrap);
  const wireItem = projectedItem.item;
  const needsFetch = !failed && wireItem.type === "file_change" && !wireItem.diffStr;
  const detail = useTurnItemDetail(
    needsFetch
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
  const item = fetched?.type === wireItem.type ? fetched : wireItem;
  if (item.type !== "file_change") return null;
  if (failed) {
    return item.diffStr?.trim() ? (
      <div
        className={cn(
          inlineDiffClassName,
          "whitespace-pre-wrap px-3 py-2 font-mono text-destructive select-text",
        )}
      >
        {item.diffStr.trim()}
      </div>
    ) : null;
  }
  if (needsFetch && detail.isPending) {
    return (
      <div className={cn(inlineDiffClassName, "flex flex-col gap-2 px-3 py-2.5")} aria-busy>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }
  const diff = toolCallFileDiff(item);
  if (!diff) {
    return <div className="text-xs text-muted-foreground">No line changes to show.</div>;
  }
  return (
    <div className={inlineDiffClassName}>
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
  const projectedItem = workEntry.projectedItem;
  const item = projectedItem?.item ?? workEntry.structuredPayload;
  const commandItem = item?.type === "command_execution" ? item : undefined;
  const command = commandDisplayText(commandItem?.input ?? workEntry.command ?? "");
  const failed = workEntryDisplayIndicatesToolFailure(workEntry);
  const running = live && !failed;
  const description = commandItem?.description?.trim();
  const header =
    description || (running ? "Running command" : failed ? "Run command" : "Ran command");
  const exitCode = commandItem?.exitCode;
  const icon = (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center",
        running ? "text-info-foreground" : failed ? "text-destructive" : "text-icon-muted",
      )}
    >
      {running ? <Spinner size="sm" /> : <TerminalIcon className="size-4" />}
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
  if (compact && !open) {
    return (
      <WorkLogButton
        data-v2-item-type="command_execution"
        data-command-row="compact"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        icon={icon}
        label={
          <Shimmering active={shimmer && running}>
            {description || !command ? (
              <span className="truncate">{header}</span>
            ) : (
              <span className="truncate font-mono text-xs">{command}</span>
            )}
          </Shimmering>
        }
        trailing={<span className="flex shrink-0 pe-1">{status}</span>}
      />
    );
  }
  const headerContent = (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate text-secondary-label">
        <Shimmering active={shimmer && running}>
          <span className="truncate">{header}</span>
        </Shimmering>
      </span>
      {status}
    </>
  );
  return (
    <div className={cardClassName} data-v2-item-type="command_execution">
      {compact ? (
        <button
          type="button"
          className={cn(
            "flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 px-3 text-left",
            cardFocusClassName,
          )}
          aria-expanded
          onClick={() => setOpen(false)}
        >
          {headerContent}
        </button>
      ) : (
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
      {projectedItem && commandItem ? (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <Button
            variant="ghost-muted"
            size="micro"
            aria-expanded={expanded}
            onClick={onToggleExpanded}
          >
            {expanded ? "Hide output" : "Show output"}
          </Button>
          {command ? (
            <MessageCopyButton text={command} label="Copy command" size="icon-xs" variant="ghost" />
          ) : null}
        </div>
      ) : null}
      {expanded && projectedItem && commandItem ? (
        <div className="px-3 pb-3" onClick={(event) => event.stopPropagation()}>
          <CommandItemOutput
            projectedItem={projectedItem}
            environmentId={ctx.activeThreadEnvironmentId}
            source={ctx.turnItemSource}
          />
        </div>
      ) : null}
    </div>
  );
}
