import { ThreadHoverCard, ThreadHoverCardPopup } from "../ThreadHoverCard";
import { discardComposerDraft } from "../../lib/discardComposerDraft";
import { revealThreadTerminal } from "../../lib/revealThreadTerminal";
import { requestCustomSnooze } from "../CustomSnoozeDialog";
import { useSupportsMultiplePullRequests } from "~/hooks/useSupportsMultiplePullRequests";
import { useDeadlinePassed } from "~/hooks/useDeadline";
import { resolveThreadCurrentPullRequestLink } from "@marp/client-runtime/thread-pull-requests";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  canSnooze,
  hasQueuedTurnStart,
  QUEUED_TURN_START_GRACE_MS,
} from "@marp/client-runtime/state/thread-settled";
import { resolveSettledThreadTimestamp } from "@marp/client-runtime/state/thread-sort";
import { type EnvironmentThreadSearchMatch } from "@marp/client-runtime/state/thread-search";
import { scopeThreadRef, scopedThreadKey } from "@marp/client-runtime/environment";
import {
  AuthOrchestrationOperateScope,
  type EnvironmentId,
  type EnvironmentMachineKind,
  type ScopedThreadRef,
} from "@marp/contracts";

import type { TimestampFormat } from "@marp/contracts/settings";
import {
  AlarmClockIcon,
  AlarmClockOffIcon,
  ArrowRightLeftIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  EllipsisIcon,
  GitBranchIcon,
  PinIcon,
  PinOffIcon,
  SquarePenIcon,
  TerminalIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import {
  memo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { useUiStateStore } from "../../uiStateStore";
import { useThreadSelectionStore } from "../../threadSelectionStore";
import { useNowMinute } from "../../hooks/useNowMinute";
import { vcsEnvironment } from "../../state/vcs";
import { useEnvironmentQuery } from "../../state/query";
import { readEnvironmentScope, useEnvironmentScope } from "../../state/session";
import { formatRelativeTimeLabel, parseTimestampDate } from "../../timestampFormat";
import type { SidebarThreadSummary } from "../../types";
import type { EnvironmentProject } from "@marp/client-runtime/state/shell";
import { cn } from "~/lib/utils";
import { textDirection } from "~/textDirection";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import {
  animateSidebarLayoutChanges,
  hasUnseenCompletion,
  resolveSidebarRowAccessibility,
  resolveSidebarStatusFamily,
  resolveSidebarRowKeyCommand,
  type SidebarDropVerb,
  type SidebarRowKeyCommand,
  type SidebarStatusFamily,
  resolveSidebarThreadStatus,
  resolveThreadLastVisitedAt,
  useRetainedValue,
  useSidebarRowSubscriptionLease,
  setFileDragActive,
} from "../Sidebar.logic";
import { resolveLocalCheckoutBranchMismatch } from "../BranchToolbar.logic";
import {
  ThreadPullRequestsMiniList,
  ThreadWorktreeIndicator,
  terminalStatusFromRunningIds,
  type TerminalStatusIndicator,
  useLinkedThreadPullRequest,
  ThreadSearchPullRequestNumber,
} from "../ThreadStatusIndicators";
import { pickSnoozePreset, resolveSnoozePresets, type SnoozePreset } from "../Sidebar.snooze";
import { useThreadShell } from "../../state/entities";
import { ProjectFavicon, type ProjectFaviconProject } from "../ProjectFavicon";
import { SearchQueryHighlight, ThreadSearchMatchExcerpt } from "../ThreadSearchMatch";
import { makeWorkspaceFileDropHandlers } from "../chat/workspaceFileDrop";
import { ProviderInstanceIcon } from "../chat/ProviderInstanceIcon";
import { getTriggerDisplayModelName } from "../chat/providerIconUtils";
import { shouldShowInstanceBadge, type ProviderInstanceEntry } from "../../providerInstances";
import { useThreadRunningTerminalIds } from "../../state/terminalSessions";
import { PullRequestGlyph } from "../pullRequest/pullRequestIcons";
import { Button } from "../ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuShortcut, MenuTrigger } from "../ui/menu";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { MiddleTruncate } from "../ui/middle-truncate";
import { useThreadHasUnsentDraft } from "../../composerDraftStore";

// The fields thread rows show. Provider status pushes refresh `checkedAt`,
// status and auth on every provider; leaving those out keeps each
// environment's map, and every memoized row, stable across them.
export type SidebarProviderEntry = Pick<
  ProviderInstanceEntry,
  | "instanceId"
  | "driverKind"
  | "enabled"
  | "displayName"
  | "accentColor"
  | "acpRegistryAgentId"
  | "acpRegistryIconUrl"
  | "models"
>;
function compactSidebarTimeLabel(label: string): string {
  if (label === "just now") return "now";
  return label.endsWith(" ago") ? label.slice(0, -4) : label;
}

// Subscribes to the minute tick itself, so only the label re-renders each
// minute. The minute is passed as the clock so it is the formatter's input.
function RelativeTimeLabel(props: { timestamp: string | null }) {
  const nowMinute = useNowMinute();
  return props.timestamp === null
    ? null
    : compactSidebarTimeLabel(
        formatRelativeTimeLabel(props.timestamp, Date.parse(`${nowMinute}:00.000Z`)),
      );
}

function threadTimeTimestamp(thread: SidebarThreadSummary): string {
  return thread.latestUserMessageAt ?? thread.updatedAt;
}

function JumpHintBadge(props: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-1.5 top-1/2 z-10 inline-flex h-5 -translate-y-1/2 items-center rounded-full border border-border/80 bg-background/95 px-1.5 font-mono text-3xs font-medium tracking-tight text-foreground shadow-sm"
    >
      {props.label}
    </span>
  );
}

function terminalProcessLabel(count: number): string {
  return `${count} terminal ${count === 1 ? "process" : "processes"} running`;
}

function SidebarThreadTooltip({
  thread,
  project,
  projectDisplayName,
  environmentLabel,
  environmentMachine,
  providerEntry,
  providerEntryByInstanceId,
  showInstanceBadge,
  modelInstanceId,
  modelLabel,
  branchMismatch,
  terminalStatus,
  terminalProcessCount,
}: {
  thread: SidebarThreadSummary;
  project: ProjectFaviconProject | null;
  projectDisplayName: string | null;
  environmentLabel: string | null;
  environmentMachine: EnvironmentMachineKind;
  providerEntry: SidebarProviderEntry | null;
  providerEntryByInstanceId: ReadonlyMap<string, SidebarProviderEntry>;
  showInstanceBadge: boolean;
  modelInstanceId: string;
  modelLabel: string;
  branchMismatch: {
    threadBranch: string;
    currentBranch: string;
  } | null;
  terminalStatus: TerminalStatusIndicator | null;
  terminalProcessCount: number;
}) {
  const driverKind = providerEntry?.driverKind ?? null;
  const previousProviderNames = thread.providerInstanceHistory
    .filter((instanceId) => instanceId !== modelInstanceId)
    .map((instanceId) => providerEntryByInstanceId.get(instanceId)?.displayName ?? instanceId);
  const supportsMultiplePullRequests = useSupportsMultiplePullRequests(thread.environmentId);
  return (
    <ThreadHoverCardPopup side="right" align="start" sideOffset={4}>
      <ThreadHoverCard
        title={thread.title}
        footer={
          supportsMultiplePullRequests && thread.pullRequests.length > 0 ? (
            <div className="border-t border-border/60 pt-2 pl-0.5 text-xs text-muted-foreground">
              <ThreadPullRequestsMiniList pullRequests={thread.pullRequests} />
            </div>
          ) : null
        }
      >
        {projectDisplayName ? (
          <div className="flex min-w-0 items-center gap-2">
            {project ? <ProjectFavicon project={project} className="size-3 shrink-0" /> : null}
            <div className="min-w-0 truncate text-foreground/75">{projectDisplayName}</div>
          </div>
        ) : null}
        {environmentLabel ? (
          <div className="flex min-w-0 items-center gap-2">
            <EnvironmentMachineIcon
              kind={environmentMachine}
              className="size-3 shrink-0 stroke-muted-foreground"
            />
            <div className="min-w-0 truncate text-foreground/75">{environmentLabel}</div>
          </div>
        ) : null}
        {thread.branch ? (
          <div className="flex min-w-0 items-center gap-2">
            <GitBranchIcon className="size-3 shrink-0 stroke-muted-foreground" />
            <MiddleTruncate value={thread.branch} className="flex" />
          </div>
        ) : null}
        {branchMismatch ? (
          <div className="flex min-w-0 items-start gap-2 text-warning">
            <CircleAlertIcon aria-hidden className="mt-0.5 size-3 shrink-0 stroke-current" />
            <div className="min-w-0 flex-1 wrap-break-word">
              You're currently checked out on another branch.
            </div>
          </div>
        ) : null}
        {driverKind ? (
          <div className="flex min-w-0 items-center gap-2">
            <ProviderInstanceIcon
              driverKind={driverKind}
              displayName={
                providerEntry?.displayName ?? thread.runtime?.providerName ?? modelInstanceId
              }
              accentColor={providerEntry?.accentColor}
              acpRegistryAgentId={providerEntry?.acpRegistryAgentId}
              acpRegistryIconUrl={providerEntry?.acpRegistryIconUrl}
              showBadge={showInstanceBadge && providerEntry?.accentColor !== undefined}
              badgeContent="none"
              badgeClassName="h-2 min-w-2 px-0"
              iconClassName="size-3 shrink-0 grayscale opacity-60"
            />
            <div className="min-w-0 truncate text-foreground/75">
              {showInstanceBadge && providerEntry
                ? `${modelLabel} · ${providerEntry.displayName}`
                : modelLabel}
            </div>
          </div>
        ) : null}
        {previousProviderNames.length > 0 ? (
          <div className="flex min-w-0 items-center gap-2">
            <ArrowRightLeftIcon className="size-3 shrink-0 stroke-muted-foreground" />
            <div className="min-w-0 truncate text-foreground/75">
              Handed off from {previousProviderNames.join(", ")}
            </div>
          </div>
        ) : null}
        {terminalStatus ? (
          <div className="flex min-w-0 items-center gap-2">
            <TerminalIcon
              aria-hidden
              className={cn("size-3 shrink-0", terminalStatus.colorClass)}
            />
            <div className="min-w-0 truncate text-foreground/75">
              {terminalProcessLabel(terminalProcessCount)}
            </div>
          </div>
        ) : null}
        {thread.runtime?.lastError ? (
          <div
            className={cn(
              "flex min-w-0 items-center gap-2",
              thread.runtime.lastErrorClass === "usage_limit" ? "text-warning" : "text-error",
            )}
          >
            <CircleAlertIcon className="size-3 shrink-0 stroke-current" />
            <div className="min-w-0 truncate">
              {thread.runtime.lastErrorClass === "usage_limit"
                ? "Usage limit reached"
                : "Error occurred"}
            </div>
          </div>
        ) : null}
      </ThreadHoverCard>
    </ThreadHoverCardPopup>
  );
}

export function SnoozeMenuButton(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnooze: (preset: Pick<SnoozePreset, "snoozedUntil">) => void;
  timestampFormat: TimestampFormat;
  environmentId: EnvironmentId;
  className?: string;
  label?: string;
  size?: "icon-xs" | "icon-sm";
}) {
  const label = props.label ?? "Snooze thread";
  const { open, onOpenChange, onSnooze, timestampFormat, environmentId } = props;
  const presets = open
    ? // oxlint-disable-next-line react/purity -- Presets are resolved only while the menu is open, so each opening reads a fresh time.
      resolveSnoozePresets(new Date(), timestampFormat, environmentId)
    : [];
  return (
    <Menu open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <Button
                  size={props.size ?? "icon-xs"}
                  variant="ghost-muted"
                  aria-label={label}
                  className={props.className}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                />
              }
            />
          }
        >
          <AlarmClockIcon />
        </TooltipTrigger>
        <TooltipPopup side="top">{label}</TooltipPopup>
      </Tooltip>
      <MenuPopup side="bottom" align="end">
        {presets.map((preset) => (
          <MenuItem
            key={preset.id}
            onClick={(event) => {
              event.stopPropagation();
              const picked = pickSnoozePreset(presets, preset.id, timestampFormat, environmentId);
              if (picked) onSnooze(picked);
            }}
          >
            {preset.label}
            <MenuShortcut>{preset.whenLabel}</MenuShortcut>
          </MenuItem>
        ))}
        {presets.length > 0 ? <MenuSeparator /> : null}
        <MenuItem
          onClick={async (event) => {
            event.stopPropagation();
            const choice = await requestCustomSnooze();
            if (choice) onSnooze(choice);
          }}
        >
          Custom…
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

type SortableThreadRowBag = Pick<
  ReturnType<typeof useSortable>,
  "listeners" | "setNodeRef" | "transform" | "transition" | "isDragging"
>;

export const draftSurfaceClassName = "bg-warning/4 hover:bg-warning/8";
export const draftPenClassName = "size-3 shrink-0 text-warning-foreground";

// useSortable memoizes on its `disabled` object, so a fresh one per render
// re-renders every row and marker on each sidebar update.
export const SIDEBAR_SORTABLE_DRAG_DISABLED = { draggable: true } as const;
const SIDEBAR_SORTABLE_DRAG_ENABLED = { draggable: false } as const;

// Takes the row's props rather than a render function: a closure from the
// sidebar body is new on every sidebar render, which rebuilt the bag and
// re-rendered every memoized row with it.
export function SortableThreadRow(
  props: Omit<SidebarThreadRowProps, "sortable"> & {
    sortableId: string;
    sortableDisabled: boolean;
    contextDrag: boolean;
  },
) {
  const { sortableId, sortableDisabled, contextDrag, ...rowProps } = props;
  const canOperateThread = useEnvironmentScope(
    rowProps.thread.environmentId,
    AuthOrchestrationOperateScope,
  );
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled:
      sortableDisabled || !canOperateThread
        ? SIDEBAR_SORTABLE_DRAG_DISABLED
        : SIDEBAR_SORTABLE_DRAG_ENABLED,
    animateLayoutChanges: animateSidebarLayoutChanges,
  });
  // dnd-kit memoizes each field but not the bag, so the memoized row would
  // rerender on every shell update without this.
  const bag = {
    listeners,
    setNodeRef,
    transform: contextDrag ? null : transform,
    transition: contextDrag && isDragging ? "transform 150ms ease-out" : transition,
    isDragging: isDragging && !contextDrag,
  };
  // The sidebar arranges rows from quiet shells, which hold still while a
  // thread streams; reading the live shell here re-renders only this row.
  const thread =
    useThreadShell(scopeThreadRef(rowProps.thread.environmentId, rowProps.thread.id)) ??
    rowProps.thread;
  // Keyed by variant so a card/slim switch remounts the row.
  return <SidebarThreadRow key={rowProps.variant} {...rowProps} thread={thread} sortable={bag} />;
}
/** A row outside the sortable list, such as in "Needs you": it never drags or takes a drop. */
export function StaticThreadRow(props: Parameters<typeof SortableThreadRow>[0]) {
  const { sortableId: _id, sortableDisabled: _disabled, contextDrag: _drag, ...rowProps } = props;
  const thread =
    useThreadShell(scopeThreadRef(rowProps.thread.environmentId, rowProps.thread.id)) ??
    rowProps.thread;
  return <SidebarThreadRow key={rowProps.variant} {...rowProps} thread={thread} />;
}

export type SidebarSweepAction = "settle" | "unsettle" | "unsnooze";
const dropVerbBadge: Record<SidebarDropVerb, ReactNode> = {
  pin: (
    <>
      <PinIcon aria-hidden className="size-3" />
      Pin
    </>
  ),
  unpin: (
    <>
      <PinOffIcon aria-hidden className="size-3" />
      Unpin
    </>
  ),
  settle: (
    <>
      <CircleCheckIcon aria-hidden className="size-3" />
      Settle
    </>
  ),
  unsettle: (
    <>
      <Undo2Icon aria-hidden className="size-3" />
      Un-settle
    </>
  ),
  wake: (
    <>
      <AlarmClockOffIcon aria-hidden className="size-3" />
      Wake
    </>
  ),
};

type SidebarThreadRowProps = {
  thread: SidebarThreadSummary;
  // "inbox" rows carry their project's icon; "folder" rows sit under it.
  // "folder-multiline" adds the branch line, and "needs-you" the reason line.
  variant: "inbox" | "folder" | "folder-multiline" | "needs-you";
  needsYouReason?: string | null | undefined;
  // The thread's machine is unreachable: the row dims until it reconnects.
  offline?: boolean | undefined;
  navigationParent?: string | undefined;
  variantAction: SidebarSweepAction;
  settlementSupported: boolean;
  snoozeSupported: boolean;
  isPinned: boolean;
  sortable?: SortableThreadRowBag | undefined;
  dropVerb: SidebarDropVerb | null;
  dragOverPinned: boolean;
  sweepAction: SidebarSweepAction | null;
  snoozeWakeLabelText: string | null;
  wokeAt: string | null;
  isActive: boolean;
  // Set on the active row only; scrolls it into view when a reveal is owed.
  revealRef?: ((row: HTMLElement, threadKey: string) => void) | undefined;
  // Unlike isActive, never true for the ancestor standing in for an open
  // subagent: drafts care about which composer is on screen.
  isRouteThread: boolean;
  jumpLabel: string | null;
  environmentLabel: string | null;
  environmentMachine: EnvironmentMachineKind;
  project: EnvironmentProject | null;
  projectDisplayName: string | null;
  providerEntryByInstanceId: ReadonlyMap<string, SidebarProviderEntry>;
  timestampFormat: TimestampFormat;
  onThreadClick: (event: ReactMouseEvent, threadRef: ScopedThreadRef) => void;
  onThreadActivate: (threadRef: ScopedThreadRef) => void;
  onStartRename: (threadRef: ScopedThreadRef, title: string) => void;
  onRenameTitleChange: (title: string) => void;
  onCommitRename: (threadRef: ScopedThreadRef, title: string, originalTitle: string) => void;
  onCancelRename: () => void;
  isRenaming: boolean;
  renamingTitle: string;
  onContextMenu: (threadRef: ScopedThreadRef, position: { x: number; y: number }) => void;
  onSettle: (threadRef: ScopedThreadRef) => void;
  onActionSweepStart: (
    threadRef: ScopedThreadRef,
    action: SidebarSweepAction,
    event: PointerEvent,
  ) => void;
  onUnsettle: (threadRef: ScopedThreadRef) => void;
  onSnooze: (threadRef: ScopedThreadRef, preset: Pick<SnoozePreset, "snoozedUntil">) => void;
  onUnsnooze: (threadRef: ScopedThreadRef) => void;
  /** Row commands the list owns: selection, settle, pin, delete. */
  onKeyCommand: (
    threadRef: ScopedThreadRef,
    command: Exclude<SidebarRowKeyCommand, "open" | "rename" | "snooze">,
    row: HTMLElement,
  ) => boolean;
  onFileDropThreads?: ((threadRef: ScopedThreadRef, files: File[]) => void) | undefined;
};

// Mounted only while renaming, so each rename starts uncommitted.
function ThreadRenameInput(props: {
  title: string;
  onTitleChange: (title: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  // Enter and Escape blur the input as it unmounts; that blur must not cancel the commit.
  const settledRef = useRef(false);
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter") {
      event.preventDefault();
      settledRef.current = true;
      props.onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      settledRef.current = true;
      props.onCancel();
    }
  };
  return (
    <input
      autoFocus
      value={props.title}
      dir="auto"
      aria-label="Thread title"
      onChange={(event) => props.onTitleChange(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (!settledRef.current) props.onCancel();
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="-ms-1.5 h-6 w-[calc(100%+--spacing(1.5))] min-w-0 rounded-md bg-card px-1.5 text-sm text-foreground outline-none ring-1 ring-inset ring-primary"
    />
  );
}

const SidebarThreadRow = memo(function SidebarThreadRow(props: SidebarThreadRowProps) {
  const {
    isRenaming,
    onCancelRename,
    onCommitRename,
    onContextMenu,
    onFileDropThreads,
    onRenameTitleChange,
    onSettle,
    onActionSweepStart,
    onSnooze,
    onStartRename,
    onThreadActivate,
    onThreadClick,
    onUnsettle,
    onUnsnooze,
    renamingTitle,
    thread,
    variant,
    variantAction,
  } = props;
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const threadKey = scopedThreadKey(threadRef);
  const canOperateThread = useEnvironmentScope(thread.environmentId, AuthOrchestrationOperateScope);
  const { leaseLiveStatus, rowRef: leaseRowRef } = useSidebarRowSubscriptionLease(props.isActive);
  const { revealRef } = props;
  const rowRef = (row: HTMLElement | null) => {
    if (row !== null) revealRef?.(row, threadKey);
    return leaseRowRef(row);
  };
  const isRegeneratingTitle = thread.titleRegeneration != null;
  const localLastVisitedAt = useUiStateStore((state) => state.threadLastVisitedAtById[threadKey]);
  const lastVisitedAt = resolveThreadLastVisitedAt(thread.lastVisitedAt, localLastVisitedAt);
  const isSelected = useThreadSelectionStore((state) => state.selectedThreadKeys.has(threadKey));
  const runningTerminalIds = useThreadRunningTerminalIds({
    environmentId: thread.environmentId,
    threadId: thread.id,
  });
  const terminalStatus = terminalStatusFromRunningIds(runningTerminalIds);
  const terminalProcessCount = runningTerminalIds.length;
  const hasUnsentDraft = useThreadHasUnsentDraft(threadRef) && !props.isRouteThread;
  const handleDiscardDraftClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    discardComposerDraft(threadRef);
  };

  const gitCwd = thread.worktreePath ?? props.project?.workspaceRoot ?? null;
  const linkedPullRequestStatus = useLinkedThreadPullRequest(
    thread.environmentId,
    thread.linkedPullRequest,
    leaseLiveStatus,
    thread.pullRequests,
    thread.branchPullRequest,
  );
  const gitStatus = useEnvironmentQuery(
    leaseLiveStatus && (thread.branch != null || thread.worktreePath !== null) && gitCwd !== null
      ? vcsEnvironment.status({
          environmentId: thread.environmentId,
          input: { cwd: gitCwd, includeRemote: false },
        })
      : null,
  );
  const visibleGitStatus = useRetainedValue(
    JSON.stringify([thread.environmentId, gitCwd]),
    gitStatus.data,
  );
  const pr = linkedPullRequestStatus?.pr ?? null;
  const supportsMultiplePullRequests = useSupportsMultiplePullRequests(thread.environmentId);
  const currentLinkedPr = supportsMultiplePullRequests
    ? resolveThreadCurrentPullRequestLink(thread.pullRequests)
    : null;

  const isUnread = hasUnseenCompletion({ ...thread, lastVisitedAt });
  const status = resolveSidebarThreadStatus(thread);
  const lastVisitedDate = lastVisitedAt === undefined ? null : parseTimestampDate(lastVisitedAt);
  const wokeAtDate = props.wokeAt === null ? null : parseTimestampDate(props.wokeAt);
  const isWoke =
    wokeAtDate !== null &&
    (lastVisitedDate === null || lastVisitedDate < wokeAtDate) &&
    thread.settledOverride !== "settled";
  // Spoken with the title; the row itself shows only the status family's mark.
  const statusLabel =
    status === "working"
      ? thread.goal?.status === "active"
        ? "Goal"
        : "Working"
      : status === "waiting"
        ? "Waiting"
        : status === "approval"
          ? "Approval needed"
          : status === "input"
            ? "Question"
            : status === "request"
              ? "Guest request"
              : status === "limited"
                ? "Usage limit"
                : status === "failed"
                  ? "Failed"
                  : isWoke
                    ? "Woke"
                    : isUnread
                      ? "Done"
                      : null;

  const branchMismatch = resolveLocalCheckoutBranchMismatch({
    effectiveEnvMode: thread.worktreePath === null ? "local" : "worktree",
    activeWorktreePath: thread.worktreePath,
    activeThreadBranch: thread.branch,
    currentGitBranch: visibleGitStatus?.refName ?? null,
  });

  const modelInstanceId = thread.runtime?.providerInstanceId ?? thread.modelSelection.instanceId;
  const providerEntry = props.providerEntryByInstanceId.get(modelInstanceId) ?? null;
  const showInstanceBadge =
    providerEntry !== null &&
    shouldShowInstanceBadge(providerEntry, props.providerEntryByInstanceId.values());
  const selectedModel = providerEntry?.models.find(
    (model) => model.slug === thread.modelSelection.model,
  );
  const modelLabel = selectedModel
    ? getTriggerDisplayModelName(selectedModel, providerEntry?.driverKind)
    : thread.modelSelection.model;

  const detailsTooltip = (
    <SidebarThreadTooltip
      thread={thread}
      project={props.project}
      projectDisplayName={props.projectDisplayName}
      environmentLabel={props.environmentLabel}
      environmentMachine={props.environmentMachine}
      providerEntry={providerEntry}
      providerEntryByInstanceId={props.providerEntryByInstanceId}
      showInstanceBadge={showInstanceBadge}
      modelInstanceId={modelInstanceId}
      modelLabel={modelLabel}
      branchMismatch={branchMismatch}
      terminalStatus={terminalStatus}
      terminalProcessCount={terminalProcessCount}
    />
  );

  const handleClick = (event: ReactMouseEvent) => {
    onThreadClick(event, threadRef);
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    onContextMenu(threadRef, { x: event.clientX, y: event.clientY });
  };
  const handleDoubleClick = (event: ReactMouseEvent) => {
    if (
      !readEnvironmentScope(threadRef.environmentId, AuthOrchestrationOperateScope) ||
      isRenaming ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if ((event.target as HTMLElement).closest("button, a, input")) return;
    event.preventDefault();
    onStartRename(threadRef, thread.title);
  };
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const fileDropHandlers = onFileDropThreads
    ? makeWorkspaceFileDropHandlers({
        setDragActive: (active) => setFileDragActive(setIsFileDragOver, active),
        addFiles: (files) => {
          onFileDropThreads(threadRef, files);
        },
        addFolders: () => {},
      })
    : null;
  const handleSettleClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSettle(threadRef);
  };
  const handleActionPointerDown = (event: ReactPointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    onActionSweepStart(threadRef, variantAction, event.nativeEvent);
  };
  const handleUnsettleClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onUnsettle(threadRef);
  };
  const handleUnsnoozeClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onUnsnooze(threadRef);
  };

  const handleSnoozePreset = (preset: Pick<SnoozePreset, "snoozedUntil">) => {
    onSnooze(threadRef, preset);
  };
  const [snoozeMenuOpenRaw, setSnoozeMenuOpen] = useState(false);
  // The React Compiler caches render results on their inputs, so a clock read
  // here would stay frozen until `thread` changes and a queued-turn gate would
  // never reopen. The gate's clock is state, reset with the thread.
  const [snoozeGateClock, setSnoozeGateClock] = useState(() => ({
    thread,
    now: new Date().toISOString(),
  }));
  if (snoozeGateClock.thread !== thread) {
    // oxlint-disable-next-line react/purity -- Reseeds the snooze gate clock only in the render-phase adjustment that runs when the thread changes.
    setSnoozeGateClock({ thread, now: new Date().toISOString() });
  }
  const snoozeGateNow = snoozeGateClock.now;
  const snoozeGateExpiryMs = hasQueuedTurnStart(thread, { now: snoozeGateNow })
    ? Date.parse(thread.latestUserMessageAt ?? "") + QUEUED_TURN_START_GRACE_MS
    : Number.NaN;
  // A gate still closed past its expiry is held by runtime status, not time,
  // so no clock tick can open it.
  const snoozeGateOpensAt =
    Number.isFinite(snoozeGateExpiryMs) && snoozeGateExpiryMs > Date.parse(snoozeGateNow)
      ? snoozeGateExpiryMs + 50
      : null;
  const snoozeGateOpened = useDeadlinePassed(snoozeGateOpensAt);
  if (snoozeGateOpened && snoozeGateOpensAt !== null) {
    setSnoozeGateClock({ thread, now: new Date(snoozeGateOpensAt).toISOString() });
  }
  const showSnoozeButton =
    canOperateThread && props.snoozeSupported && canSnooze(thread, { now: snoozeGateNow });
  // Closing here, not just masking, keeps the menu from reopening when the button returns.
  if (snoozeMenuOpenRaw && !showSnoozeButton) setSnoozeMenuOpen(false);
  const snoozeMenuOpen = snoozeMenuOpenRaw && showSnoozeButton;
  // Only keys pressed on the row itself: a focused rename field or button keeps its typing.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || isRenaming) return;
    const command = resolveSidebarRowKeyCommand(event.nativeEvent);
    if (command === null) return;
    let handled = true;
    if (command === "open") onThreadActivate(threadRef);
    else if (command === "rename") {
      if (readEnvironmentScope(threadRef.environmentId, AuthOrchestrationOperateScope)) {
        onStartRename(threadRef, thread.title);
      }
    } else if (command === "snooze") {
      if (showSnoozeButton) setSnoozeMenuOpen(true);
    } else handled = props.onKeyCommand(threadRef, command, event.currentTarget);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
  };
  const rowSurfaceClassName = cn(
    "group/sidebar-row relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm outline-none select-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none",
    // --row-bg is the colour the hover actions fade into.
    variant === "needs-you"
      ? "[--row-bg:color-mix(in_srgb,var(--warning)_14%,var(--sidebar))]"
      : "[--row-bg:var(--sidebar-row-hover)]",
    props.isActive
      ? "bg-sidebar-row-active text-foreground shadow-raised [--row-bg:var(--sidebar-row-active)]"
      : isSelected || props.sweepAction !== null
        ? "bg-sidebar-row-hover text-foreground"
        : hasUnsentDraft
          ? cn(draftSurfaceClassName, "text-sidebar-foreground")
          : "text-sidebar-foreground hover:bg-(--row-bg)",
    props.offline && !props.isActive && "opacity-55",
    isFileDragOver && "ring-1 ring-inset ring-primary/70",
    isFileDragOver && !props.isActive && !isSelected && "bg-sidebar-row-hover",
    props.sortable?.isDragging && "bg-sidebar-row-active text-foreground opacity-100 shadow-lg",
  );
  const sortable = props.sortable;
  const sortableRootProps = sortable
    ? {
        ref: sortable.setNodeRef,
        style: {
          transform: CSS.Translate.toString(sortable.transform),
          transition: sortable.transition,
          // A zero-height boundary also makes dnd-kit scale the source to
          // zero. Only projected peers use scaleY as a visibility sentinel.
          visibility:
            !sortable.isDragging && sortable.transform?.scaleY === 0
              ? ("hidden" as const)
              : undefined,
        },
        ...sortable.listeners,
      }
    : {};
  const destinationVerb = sortable?.isDragging
    ? props.dropVerb
    : props.sweepAction === "unsnooze"
      ? "wake"
      : props.sweepAction;
  const dragDestination =
    destinationVerb !== null ? (
      <span
        role="status"
        className="pointer-events-none ml-auto inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border border-primary/40 bg-primary/10 px-1.5 text-2xs font-medium text-primary"
      >
        {dropVerbBadge[destinationVerb]}
      </span>
    ) : null;

  const accessibility = resolveSidebarRowAccessibility({
    title: thread.title,
    statusLabel,
    projectDisplayName: props.projectDisplayName,
    isActive: props.isActive,
  });

  const title = isRenaming ? (
    <ThreadRenameInput
      title={renamingTitle}
      onTitleChange={onRenameTitleChange}
      onCommit={() => onCommitRename(threadRef, renamingTitle, thread.title)}
      onCancel={onCancelRename}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "block truncate text-start transition-opacity motion-reduce:transition-none",
        isUnread || isWoke ? "font-medium text-foreground" : "font-normal",
        variantAction === "unsettle" &&
          !props.isActive &&
          "text-sidebar-muted-foreground group-any-hover/sidebar-row:text-sidebar-foreground",
        isRegeneratingTitle && "opacity-55",
      )}
      dir={textDirection(thread.title)}
    >
      {thread.title}
    </span>
  );
  const accessibleTitle = isRenaming ? null : <span className="sr-only">{thread.title}</span>;

  const showPin =
    props.isPinned && (!sortable?.isDragging || (props.dragOverPinned && props.dropVerb === null));
  const handleOpenTerminalClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const terminalId = runningTerminalIds[0];
    if (terminalId === undefined) return;
    revealThreadTerminal(threadRef, terminalId);
    onThreadActivate(threadRef);
  };
  const handleMoreClick = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    onContextMenu(threadRef, { x: rect.left, y: rect.bottom + 4 });
  };
  const statusFamily = resolveSidebarStatusFamily({ status, isUnread, isWoke });
  const settled = variantAction === "unsettle";
  const prNumber = pr?.number ?? currentLinkedPr?.number ?? null;
  const liveStatus = status === "working" ? (thread.liveStatus?.summary ?? null) : null;
  const secondLine =
    variant === "needs-you" ? (
      <span className="block truncate text-xs text-muted-foreground">
        {[props.needsYouReason, props.projectDisplayName].filter(Boolean).join(" · ")}
      </span>
    ) : liveStatus !== null ? (
      <span
        className="block truncate text-start text-xs text-muted-foreground"
        dir={textDirection(liveStatus)}
      >
        {liveStatus}
      </span>
    ) : variant === "folder-multiline" && thread.branch ? (
      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        <ThreadWorktreeIndicator thread={thread} />
        <span className="flex min-w-0 flex-1">
          <MiddleTruncate value={thread.branch} showTitle={false} />
        </span>
      </span>
    ) : null;
  // One thing at rest: the wake time on snoozed rows, otherwise pin, PR and age.
  const meta =
    variantAction === "unsnooze" && props.snoozeWakeLabelText !== null ? (
      <>
        <AlarmClockIcon aria-hidden className="size-3" />
        {props.snoozeWakeLabelText}
      </>
    ) : (
      <>
        {hasUnsentDraft ? <SquarePenIcon aria-hidden className={draftPenClassName} /> : null}
        {showPin ? <PinIcon aria-hidden className="size-3" /> : null}
        {runningTerminalIds.length > 0 ? <TerminalIcon aria-hidden className="size-3" /> : null}
        {prNumber !== null ? (
          <span className="inline-flex items-center gap-0.5">
            <PullRequestGlyph.pullRequest aria-hidden className="size-3" />#{prNumber}
          </span>
        ) : null}
        <RelativeTimeLabel
          timestamp={settled ? resolveSettledThreadTimestamp(thread) : threadTimeTimestamp(thread)}
        />
      </>
    );
  // Touch has no hover, so only "More" shows there, always.
  const hoverOnly = "pointer-coarse:hidden";
  const rowActions = (
    <span
      className={cn(
        // Floats over the end of the title on the row colour, so revealing it never moves anything.
        "pointer-events-none absolute inset-y-0 -right-1 flex items-center gap-0.5 bg-linear-to-r from-transparent to-(--row-bg) to-15% ps-4 opacity-0 transition-opacity duration-150 group-any-hover/sidebar-row:pointer-events-auto group-any-hover/sidebar-row:opacity-100 group-focus-visible/sidebar-row:pointer-events-auto group-focus-visible/sidebar-row:opacity-100 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100 motion-reduce:transition-none",
        snoozeMenuOpen && "pointer-events-auto opacity-100",
      )}
    >
      {hasUnsentDraft ? (
        <RowActionButton
          label="Discard draft"
          className={hoverOnly}
          onClick={handleDiscardDraftClick}
        >
          <XIcon />
        </RowActionButton>
      ) : null}
      {runningTerminalIds[0] !== undefined ? (
        <RowActionButton
          label={`${terminalProcessLabel(runningTerminalIds.length)}. Open terminal`}
          className={hoverOnly}
          onClick={handleOpenTerminalClick}
        >
          <TerminalIcon />
        </RowActionButton>
      ) : null}
      {!canOperateThread ? null : variantAction === "unsnooze" ? (
        props.snoozeSupported ? (
          <RowActionButton
            label="Wake thread now"
            className={hoverOnly}
            onClick={handleUnsnoozeClick}
            onPointerDown={handleActionPointerDown}
          >
            <AlarmClockOffIcon />
          </RowActionButton>
        ) : null
      ) : settled ? (
        props.settlementSupported ? (
          <RowActionButton
            label="Un-settle thread"
            className={hoverOnly}
            onClick={handleUnsettleClick}
            onPointerDown={handleActionPointerDown}
          >
            <Undo2Icon />
          </RowActionButton>
        ) : null
      ) : (
        <>
          {showSnoozeButton ? (
            <SnoozeMenuButton
              open={snoozeMenuOpen}
              onOpenChange={setSnoozeMenuOpen}
              onSnooze={handleSnoozePreset}
              timestampFormat={props.timestampFormat}
              environmentId={thread.environmentId}
              className={hoverOnly}
            />
          ) : null}
          {props.settlementSupported ? (
            <RowActionButton
              label="Settle thread"
              className={hoverOnly}
              onClick={handleSettleClick}
              onPointerDown={handleActionPointerDown}
            >
              <CheckIcon />
            </RowActionButton>
          ) : null}
        </>
      )}
      <RowActionButton label="More actions" onClick={handleMoreClick}>
        <EllipsisIcon />
      </RowActionButton>
    </span>
  );

  return (
    <li
      data-thread-item={threadKey}
      {...sortableRootProps}
      {...(fileDropHandlers ?? {})}
      className={cn(
        "list-none [content-visibility:auto]",
        secondLine === null
          ? "[contain-intrinsic-size:auto_32px]"
          : "[contain-intrinsic-size:auto_56px]",
        sortable?.isDragging && "relative z-20",
      )}
    >
      <Tooltip disabled={snoozeMenuOpen || sortable?.isDragging}>
        <TooltipTrigger
          render={
            <div
              ref={rowRef}
              role="treeitem"
              tabIndex={-1}
              data-sidebar-row={threadKey}
              data-sidebar-parent={props.navigationParent}
              aria-label={accessibility.label}
              aria-current={accessibility.current}
              aria-selected={isSelected || undefined}
              data-testid="sidebar-row"
              aria-busy={isRegeneratingTitle || undefined}
              className={cn(rowSurfaceClassName, secondLine === null ? "h-8" : "h-14")}
              onClick={handleClick}
              onDoubleClick={handleDoubleClick}
              onKeyDown={handleKeyDown}
              onContextMenu={handleContextMenu}
            />
          }
        >
          {accessibleTitle}
          <SidebarStatusIndicator family={statusFamily} selected={isSelected} />
          {variant === "inbox" && props.project ? (
            <ProjectFavicon
              project={props.project}
              className={cn(
                "size-3.5 shrink-0 transition-opacity",
                !props.isActive &&
                  "opacity-40 grayscale group-any-hover/sidebar-row:opacity-100 group-any-hover/sidebar-row:grayscale-0",
              )}
            />
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {title}
            {secondLine}
          </span>
          {isRegeneratingTitle ? (
            <span role="status" className="sr-only">
              Regenerating title
            </span>
          ) : null}
          {sortable?.isDragging || props.sweepAction !== null ? (
            dragDestination
          ) : (
            <span className="relative flex h-6 shrink-0 items-center justify-end">
              <span
                aria-hidden
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums text-placeholder transition-opacity duration-150 group-any-hover/sidebar-row:opacity-0 group-focus-visible/sidebar-row:opacity-0 group-has-[:focus-visible]/sidebar-row:opacity-0 pointer-coarse:opacity-0 motion-reduce:transition-none"
              >
                {meta}
              </span>
              {rowActions}
            </span>
          )}
          {props.jumpLabel ? <JumpHintBadge label={props.jumpLabel} /> : null}
        </TooltipTrigger>
        {detailsTooltip}
      </Tooltip>
    </li>
  );
});

const STATUS_DOT_CLASS_NAME = {
  "needs-you": "bg-warning ring-3 ring-warning/22",
  done: "bg-success",
  failed: "bg-error",
} as const;

/** The 16px status slot: a spinner, a dot, nothing when idle, or a check while selected. */
export function SidebarStatusIndicator(props: { family: SidebarStatusFamily; selected: boolean }) {
  return (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
      {props.selected ? (
        <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-2.5" strokeWidth={3} />
        </span>
      ) : props.family === "working" ? (
        <span className="flex text-info">
          <Spinner size="sm" />
        </span>
      ) : props.family === "idle" ? null : (
        <span className={cn("size-2 rounded-full", STATUS_DOT_CLASS_NAME[props.family])} />
      )}
    </span>
  );
}

function RowActionButton(props: {
  label: string;
  className?: string;
  onClick: (event: ReactMouseEvent) => void;
  onPointerDown?: (event: ReactPointerEvent) => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            variant="ghost-muted"
            aria-label={props.label}
            className={props.className}
            onClick={props.onClick}
            onPointerDown={props.onPointerDown}
            onDoubleClick={(event) => event.stopPropagation()}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup side="top">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

// Attached only to the highlighted result, so React calls it each time the
// highlight lands on a different row: a new query, late rows replacing the first
// result, or arrow keys moving past the scrolled edge.
const scrollHighlightedResultIntoView = (node: HTMLLIElement | null) => {
  node?.scrollIntoView({ block: "nearest" });
};

export const SidebarSearchResultRow = memo(function SidebarSearchResultRow(props: {
  isSettled: boolean;
  thread: SidebarThreadSummary;
  project: EnvironmentProject | null;
  projectDisplayName: string | null;
  environmentLabel: string | null;
  environmentMachine: EnvironmentMachineKind;
  providerEntryByInstanceId: ReadonlyMap<string, SidebarProviderEntry>;
  isHighlighted: boolean;
  isRouteActive: boolean;
  resultId: string;
  searchMatch: EnvironmentThreadSearchMatch | null;
  searchQuery: string;
  /** The query `searchMatch` was found for, which lags `searchQuery` while a search runs. */
  searchMatchQuery?: string;
  onHighlight: () => void;
  onSelect: () => void;
  onFileDropThreads: (threadRef: ScopedThreadRef, files: File[]) => void;
}) {
  const thread =
    useThreadShell(scopeThreadRef(props.thread.environmentId, props.thread.id)) ?? props.thread;
  const accessibility = resolveSidebarRowAccessibility({
    title: thread.title,
    statusLabel: null,
    projectDisplayName: props.projectDisplayName,
    isActive: props.isRouteActive,
  });
  const threadRef = scopeThreadRef(thread.environmentId, thread.id);
  const { leaseLiveStatus, rowRef } = useSidebarRowSubscriptionLease(
    props.isHighlighted || props.isRouteActive,
  );
  const gitCwd = thread.worktreePath ?? props.project?.workspaceRoot ?? null;
  const gitStatus = useEnvironmentQuery(
    leaseLiveStatus && (thread.branch != null || thread.worktreePath !== null) && gitCwd !== null
      ? vcsEnvironment.status({
          environmentId: thread.environmentId,
          input: { cwd: gitCwd, includeRemote: false },
        })
      : null,
  );
  const visibleGitStatus = useRetainedValue(
    JSON.stringify([thread.environmentId, gitCwd]),
    gitStatus.data,
  );
  const branchMismatch = resolveLocalCheckoutBranchMismatch({
    effectiveEnvMode: thread.worktreePath === null ? "local" : "worktree",
    activeWorktreePath: thread.worktreePath,
    activeThreadBranch: thread.branch,
    currentGitBranch: visibleGitStatus?.refName ?? null,
  });
  const modelInstanceId = thread.runtime?.providerInstanceId ?? thread.modelSelection.instanceId;
  const providerEntry = props.providerEntryByInstanceId.get(modelInstanceId) ?? null;
  const showInstanceBadge =
    providerEntry !== null &&
    shouldShowInstanceBadge(providerEntry, props.providerEntryByInstanceId.values());
  const selectedModel = providerEntry?.models.find(
    (model) => model.slug === thread.modelSelection.model,
  );
  const modelLabel = selectedModel
    ? getTriggerDisplayModelName(selectedModel, providerEntry?.driverKind)
    : thread.modelSelection.model;
  const runningTerminalIds = useThreadRunningTerminalIds({
    environmentId: thread.environmentId,
    threadId: thread.id,
  });
  const terminalStatus = terminalStatusFromRunningIds(runningTerminalIds);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const onFileDropThreads = props.onFileDropThreads;
  const fileDropHandlers = makeWorkspaceFileDropHandlers({
    setDragActive: (active) => setFileDragActive(setIsFileDragOver, active),
    addFiles: (files) => {
      onFileDropThreads(threadRef, files);
    },
    addFolders: () => {},
  });
  return (
    <li
      ref={props.isHighlighted ? scrollHighlightedResultIntoView : undefined}
      role="presentation"
      className="list-none"
      {...fileDropHandlers}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={rowRef}
              id={props.resultId}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={props.isHighlighted}
              aria-current={accessibility.current}
              aria-describedby={`${props.resultId}-pr`}
              aria-label={accessibility.label}
              onMouseMove={props.onHighlight}
              onClick={props.onSelect}
              className={cn(
                "group/sidebar-row group/v2-row flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1 text-left text-sm outline-none",
                props.isHighlighted || props.isRouteActive
                  ? "bg-sidebar-row-active text-sidebar-foreground"
                  : "text-sidebar-muted-foreground/75 hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
                isFileDragOver && "ring-1 ring-inset ring-primary/70",
                isFileDragOver && !props.isRouteActive && "bg-sidebar-row-hover",
              )}
            />
          }
        >
          {props.project ? (
            <ProjectFavicon
              project={props.project}
              className={cn(
                "size-4 shrink-0 transition-opacity",
                props.isSettled &&
                  !props.isRouteActive &&
                  !props.isHighlighted &&
                  "opacity-40 grayscale group-hover/sidebar-row:opacity-100 group-hover/sidebar-row:grayscale-0",
              )}
            />
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  props.isSettled
                    ? "font-normal text-secondary-label/70 group-hover/sidebar-row:text-foreground"
                    : "font-medium text-foreground",
                  (props.isHighlighted || props.isRouteActive) && "text-foreground",
                  thread.titleRegeneration != null && "opacity-55",
                )}
              >
                <SearchQueryHighlight text={thread.title} query={props.searchQuery} />
              </span>
              <span id={`${props.resultId}-pr`} className="contents">
                <ThreadSearchPullRequestNumber
                  thread={thread}
                  query={props.searchQuery}
                  enabled={leaseLiveStatus}
                  settled={props.isSettled}
                />
              </span>
              <span className="w-8 shrink-0 text-right text-xs text-muted-foreground/55 tabular-nums">
                <RelativeTimeLabel timestamp={threadTimeTimestamp(thread)} />
              </span>
            </span>
            {props.searchMatch ? (
              <ThreadSearchMatchExcerpt
                match={{
                  source: props.searchMatch.source,
                  snippet: props.searchMatch.snippet,
                  query: props.searchMatchQuery ?? props.searchQuery,
                }}
              />
            ) : null}
          </span>
        </TooltipTrigger>
        <SidebarThreadTooltip
          thread={thread}
          project={props.project}
          projectDisplayName={props.projectDisplayName}
          environmentLabel={props.environmentLabel}
          environmentMachine={props.environmentMachine}
          providerEntry={providerEntry}
          providerEntryByInstanceId={props.providerEntryByInstanceId}
          showInstanceBadge={showInstanceBadge}
          modelInstanceId={modelInstanceId}
          modelLabel={modelLabel}
          branchMismatch={branchMismatch}
          terminalStatus={terminalStatus}
          terminalProcessCount={runningTerminalIds.length}
        />
      </Tooltip>
    </li>
  );
});
