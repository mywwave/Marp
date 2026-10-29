import { TimelinePendingApprovalRow } from "./TimelinePendingApprovalRow";
import { WorkLogButton, WorkLogList, WorkLogRow } from "./WorkLog";
import type { WorktreeSetupSnapshot } from "@marp/contracts";
import { type ToolActivityIcon } from "@marp/contracts";
import {
  thoughtBody,
  thoughtTitle,
  workEventAction,
  workEventActionText,
  workEventIsFileChange,
  workEventKind,
  workRunHeader,
  type WorkRunHeaderRule,
} from "@marp/client-runtime/work-log/event-presentation";
import { resolveWorkGroupScrollAnchor } from "@marp/client-runtime/work-log/scroll-anchor";
import { responseStalled } from "@marp/client-runtime/work-log/live-cards";
import { observeResize } from "~/lib/observeResize";
import { observeVisibleAnimation } from "../../lib/visibleAnimation";
import { tickTextContent } from "../../lib/tickTextContent";
import { memo, use, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LegendList, type LegendListRef } from "@legendapp/list/react";
import { workEntryDisplayIndicatesToolFailure } from "../../session-logic";
import { ChevronRightIcon, Minimize2Icon, XIcon } from "lucide-react";
import { DiffStatLabel } from "./DiffStatLabel";
import { Button } from "../ui/button";
import { getVirtualizedScrollFadeClassName } from "../ui/scroll-area";
import {
  liveWorkEntryLabel,
  resolveWorkGroupScrollIndex,
  shouldFollowWorkGroupAppend,
  workEntryIsVisibleInGroup,
  type MessagesTimelineRow,
} from "./MessagesTimeline.logic";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { Spinner } from "../ui/spinner";
import { WorktreeSetupCard } from "./WorktreeSetupCard";
import { cn } from "~/lib/utils";
import {
  TimelineRowCtx,
  TimelineRowActivityCtx,
  WorkGroupViewCtx,
  type TimelineWorkEntry,
  type TimelineRow,
} from "./timelineRowContext";
import {
  ActivityShimmerOverlay,
  useApprovalResolved,
  useSpinnerFinished,
} from "./TimelineRowParts";
import {
  failedToolIconClassName,
  toolIconAcceptsTint,
  type WorkEntryIconName,
  ToolActivityIconView,
} from "./TimelineToolActivityIcon";
import {
  useThreadReadTarget,
  threadReadLabel,
  ThreadReadLabel,
  LiveThoughtBody,
  ReasoningTraceContent,
  SimpleWorkEntryRow,
} from "./TimelineWorkEntryRow";
import { toolGroupSummaryIconName, workEntryIconName } from "./TimelineWorkEntryRow.logic";
import { WorkEventLabel, WorkingTimer } from "./TimelineWorkEvents";
import { preActivityLabel } from "./TimelineWorkGroupRows.logic";

export const WorkGroupSection = memo(function WorkGroupSection({
  anchorKey,
  disclosureAnchorKey = anchorKey,
  groupedEntries,
  isExpandedToolGroup,
  displayLabel,
}: {
  anchorKey: string;
  disclosureAnchorKey?: string;
  groupedEntries: Extract<MessagesTimelineRow, { kind: "work" }>["groupedEntries"];
  isExpandedToolGroup: boolean;
  displayLabel?: string | undefined;
}) {
  const { workspaceRoot, routeThreadKey, onToggleWorkEntry, pendingApprovals } =
    use(TimelineRowCtx);
  const onToggleStandaloneEntry = (collapsed: boolean) =>
    onToggleWorkEntry(disclosureAnchorKey, collapsed);
  const nonEmptyEntries = groupedEntries.filter((entry) => {
    const item = entry.projectedItem?.item;
    return (
      (item?.type === "approval_request" && pendingApprovals.has(item.requestId)) ||
      workEntryIsVisibleInGroup(entry, isExpandedToolGroup)
    );
  });

  if (nonEmptyEntries.length === 0) return null;
  if (isExpandedToolGroup && nonEmptyEntries.every((entry) => entry.itemType === "reasoning")) {
    return <ReasoningTraceContent entries={nonEmptyEntries} />;
  }
  if (isExpandedToolGroup && nonEmptyEntries.length <= INLINE_RUN_STEP_LIMIT) {
    return (
      <WorkLogList>
        {nonEmptyEntries.map((workEntry) => (
          <SimpleWorkEntryRow
            key={workEntry.id}
            workEntry={workEntry}
            workspaceRoot={workspaceRoot}
            onToggleEntry={onToggleStandaloneEntry}
            compact
          />
        ))}
      </WorkLogList>
    );
  }
  if (isExpandedToolGroup) {
    return (
      <ExpandedWorkGroupEntries
        key={`${routeThreadKey}:${anchorKey}`}
        anchorKey={anchorKey}
        disclosureAnchorKey={disclosureAnchorKey}
        entries={nonEmptyEntries}
        workspaceRoot={workspaceRoot}
      />
    );
  }

  return (
    <section aria-label="Activity">
      {nonEmptyEntries.map((workEntry) => (
        <SimpleWorkEntryRow
          key={workEntry.id}
          workEntry={workEntry}
          workspaceRoot={workspaceRoot}
          displayLabel={displayLabel}
          onToggleEntry={onToggleStandaloneEntry}
        />
      ))}
    </section>
  );
});

/**
 * An open run renders its steps inline: a nested scroller slid them under the run header. Only
 * very long runs keep the virtualized scroller.
 */
const INLINE_RUN_STEP_LIMIT = 50;

const compactWorkEntryHeight = 28;

function ExpandedWorkGroupEntries({
  anchorKey,
  disclosureAnchorKey,
  entries,
  workspaceRoot,
}: {
  anchorKey: string;
  disclosureAnchorKey: string;
  entries: TimelineWorkEntry[];
  workspaceRoot: string | undefined;
}) {
  const { workGroupViewState: viewState, onToggleWorkEntry } = use(TimelineRowCtx);
  const [initialScrollIndex] = useState(() =>
    resolveWorkGroupScrollIndex(entries, viewState.scrollPositions.get(anchorKey)),
  );
  const [restoringPosition, setRestoringPosition] = useState(initialScrollIndex !== undefined);
  const listRef = useRef<LegendListRef>(null);
  const [expandedContentHeight, setExpandedContentHeight] = useState(0);
  const [fades, setFades] = useState({ top: false, bottom: false, viewportHeight: 0 });
  const [appendState, setAppendState] = useState({ entries, follow: false });
  // Capture the pre-change edge once per incoming array, before new layout
  // metrics arrive. Edge/viewport changes never turn a status update into a follow.
  if (appendState.entries !== entries) {
    setAppendState({
      entries,
      follow:
        fades.viewportHeight > 0 &&
        shouldFollowWorkGroupAppend(appendState.entries, entries, fades.bottom ? Infinity : 0),
    });
  }

  const groupView = {
    state: viewState,
    onToggleEntry: (collapsed: boolean) => onToggleWorkEntry(disclosureAnchorKey, collapsed),
  };
  const updateScrollFades = () => {
    const element = listRef.current?.getScrollableNode();
    if (!element) return;
    const distanceFromEnd = element.scrollHeight - element.clientHeight - element.scrollTop;
    const viewportHeight = element.clientHeight;
    const top = element.scrollTop > 1;
    const bottom = distanceFromEnd > 1;
    setFades((previous) =>
      previous.top === top &&
      previous.bottom === bottom &&
      previous.viewportHeight === viewportHeight
        ? previous
        : { top, bottom, viewportHeight },
    );
  };

  const handleScroll = () => {
    const state = listRef.current?.getState();
    const position = state && resolveWorkGroupScrollAnchor(state);
    if (position) {
      viewState.scrollPositions.set(anchorKey, {
        entryId: position.rowId,
        offset: position.offsetWithinRow,
      });
    }
    updateScrollFades();
  };

  const handleLoad = () => {
    const list = listRef.current;
    const element = list?.getScrollableNode();
    if (initialScrollIndex && list && element) {
      // Bootstrap can report the restored target before the DOM has applied it.
      // Reconcile once at load, before releasing the measured anchor row.
      const offset = Math.max(
        0,
        Math.min(list.getState().scroll, element.scrollHeight - element.clientHeight),
      );
      if (Math.abs(element.scrollTop - offset) > 1) {
        void list.scrollToOffset({ offset, animated: false });
      }
    }
    setRestoringPosition(false);
  };

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- observes the list scroller and its content with ResizeObserver to update scroll fades
  useLayoutEffect(() => {
    const element = listRef.current?.getScrollableNode();
    if (!element) return;
    updateScrollFades();
    const content = element.firstElementChild;
    return observeResize(content ? [element, content] : element, updateScrollFades);
  }, [updateScrollFades]);

  const renderEntry = ({ item }: { item: TimelineWorkEntry }) => (
    <SimpleWorkEntryRow key={item.id} workEntry={item} workspaceRoot={workspaceRoot} compact />
  );

  const updateExpandedContentHeight = () => {
    const state = listRef.current?.getState();
    let height = 0;
    for (const entryId of viewState.expandedEntries) {
      if (state?.indexByKey(entryId) === undefined) continue;
      height += Math.max(
        0,
        (state.sizes.get(entryId) ?? compactWorkEntryHeight) - compactWorkEntryHeight,
      );
    }
    setExpandedContentHeight(height);
  };

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- reads expanded row sizes from LegendList's measured state after layout
  useLayoutEffect(updateExpandedContentHeight, [entries, updateExpandedContentHeight]);

  return (
    <WorkGroupViewCtx value={groupView}>
      <WorkLogList>
        <LegendList
          ref={listRef}
          data={entries}
          extraData={workspaceRoot}
          keyExtractor={workEntryKey}
          renderItem={renderEntry}
          estimatedItemSize={compactWorkEntryHeight}
          drawDistance={240}
          recycleItems
          {...(initialScrollIndex ? { initialScrollIndex } : {})}
          maintainScrollAtEnd={
            appendState.follow ? { animated: false, on: { dataChange: true } } : false
          }
          maintainScrollAtEndThreshold={1 / Math.max(1, fades.viewportHeight)}
          // Measure the restored row even when an intra-row offset puts its
          // estimated bounds outside the list's small bootstrap render window.
          {...(restoringPosition && initialScrollIndex
            ? { alwaysRender: { indices: [initialScrollIndex.index] } }
            : {})}
          maintainVisibleContentPosition
          onLoad={handleLoad}
          onScroll={handleScroll}
          onLayout={updateScrollFades}
          onItemSizeChanged={updateExpandedContentHeight}
          tabIndex={0}
          role="region"
          aria-label="Tool calls"
          data-tool-group-scroll
          style={{ maxHeight: `calc(min(18rem, 50dvh) + ${expandedContentHeight}px)` }}
          className={cn(
            "scrollbar-gutter-stable scroll-py-6 overflow-x-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
            getVirtualizedScrollFadeClassName(fades),
          )}
        />
      </WorkLogList>
    </WorkGroupViewCtx>
  );
}

const workEntryKey = (entry: TimelineWorkEntry) => entry.id;

export function WorkingTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "working" }> }) {
  const { isCompacting, isPreparingWorktree, backgroundWorktreeSetup, awaitingUser } =
    use(TimelineRowActivityCtx);
  const compacting = row.compacting === true || isCompacting;
  const shimmer = isPreparingWorktree || compacting;
  // A plain "Working" row repeats the header's status pill and timer.
  if (!shimmer && !backgroundWorktreeSetup) return null;
  const label = isPreparingWorktree ? (
    "Setting up worktree…"
  ) : compacting ? (
    <CompactingLabel createdAt={row.createdAt} />
  ) : (
    "Working"
  );
  return (
    <div className="pb-1">
      <div className="flex h-7 min-w-0 items-center gap-2 px-1 text-sm text-muted-foreground tabular-nums">
        {shimmer || awaitingUser ? null : (
          <span className="flex shrink-0 text-info-foreground">
            <Spinner size="sm" />
          </span>
        )}
        <span
          ref={shimmer ? observeVisibleAnimation : undefined}
          className="relative min-w-0 shrink-0 overflow-hidden whitespace-nowrap"
        >
          {label}
          {shimmer ? <ActivityShimmerOverlay>{label}</ActivityShimmerOverlay> : null}
        </span>
        {backgroundWorktreeSetup ? (
          <BackgroundWorktreeSetupChip snapshot={backgroundWorktreeSetup} />
        ) : null}
        {!shimmer && row.createdAt ? (
          <span className="ms-auto shrink-0">
            <WorkingTimer createdAt={row.createdAt} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function BackgroundWorktreeSetupChip({ snapshot }: { snapshot: WorktreeSetupSnapshot }) {
  const ctx = use(TimelineRowCtx);
  const terminalId = snapshot.setupScript?.terminalId ?? null;
  const openTerminal = ctx.onOpenWorktreeSetupTerminal;
  const onOpenTerminal = openTerminal && terminalId ? () => openTerminal(terminalId) : null;
  const scriptName = snapshot.setupScript?.name ?? "Setup script";
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost-muted"
            size="micro"
            className="ml-auto min-w-0 shrink-0"
            aria-label={`Background setup is still running: ${scriptName}. Show setup progress.`}
          />
        }
      >
        <Spinner className="size-3 shrink-0" />
        <span className="truncate">Background setup</span>
      </PopoverTrigger>
      <PopoverPopup side="bottom" align="end" width="lg" padding="compact">
        <WorktreeSetupCard
          snapshot={snapshot}
          embedded
          onCancel={null}
          onWorkLocally={null}
          onOpenTerminal={onOpenTerminal}
        />
      </PopoverPopup>
    </Popover>
  );
}

function CompactingLabel({ createdAt }: { createdAt: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Minimize2Icon aria-hidden="true" className="size-3" />
      {createdAt ? (
        <span>
          Compacting for <WorkingTimer createdAt={createdAt} />
        </span>
      ) : (
        "Compacting…"
      )}
    </span>
  );
}

export function ThinkingTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "thinking" }> }) {
  const ctx = use(TimelineRowCtx);
  const { isCompacting, isPreparingWorktree, awaitingUser } = use(TimelineRowActivityCtx);
  if (isPreparingWorktree || isCompacting) return <WorkLogRow label="" />;
  if (row.preActivity) {
    if (awaitingUser) return null;
    const label = (
      <span ref={tickTextContent((nowMs) => preActivityLabel(row.createdAt, nowMs), true)} />
    );
    return <LiveActivityRow label={label} active shimmer />;
  }
  // A failed group keeps this disclosure while an approval waits, but nothing is thinking then.
  const live = ctx.pendingApprovals.size === 0;
  const lastActivityAt = row.lastActivityAt ?? null;
  const label =
    live && lastActivityAt !== null ? (
      <span
        ref={tickTextContent(
          (nowMs) => (responseStalled(lastActivityAt, nowMs) ? "Waiting for response" : "Thinking"),
          true,
        )}
      />
    ) : (
      "Thinking"
    );
  const activity = <LiveActivityRow label={label} iconName="brain" active={live} shimmer={live} />;
  const { groupId } = row;
  if (groupId === undefined) return activity;
  return (
    <button
      type="button"
      className="group/live-work flex min-h-7 w-full max-w-full cursor-pointer items-center rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
      aria-expanded={row.expanded === true}
      onClick={() => ctx.onToggleWorkGroup(groupId, row.id)}
    >
      {activity}
    </button>
  );
}

function LiveActivityRow({
  label,
  iconName,
  toolIcon,
  failed = false,
  active = false,
  shimmer = false,
  spinner = false,
}: {
  label: ReactNode;
  iconName?: WorkEntryIconName;
  toolIcon?: ToolActivityIcon | undefined;
  failed?: boolean;
  active?: boolean;
  shimmer?: boolean;
  /** A running tool shows the spinner in place of its icon. */
  spinner?: boolean;
}) {
  const animated = active && !failed;
  const showShimmer = animated && shimmer;
  const showSpinner = animated && spinner;
  const finished = useSpinnerFinished(showSpinner);
  return (
    <div
      ref={animated ? observeVisibleAnimation : undefined}
      className="relative min-h-7 w-fit max-w-full min-w-0 overflow-hidden rounded-md text-sm leading-relaxed"
    >
      <LiveActivityContent
        label={label}
        iconName={iconName}
        toolIcon={toolIcon}
        failed={failed}
        announceFailure={failed}
        spinner={showSpinner}
        iconEnters={finished}
      />
      {showShimmer ? (
        <ActivityShimmerOverlay>
          {/* The sweep copies the label only; a second spinner would double the animation. */}
          <LiveActivityContent
            label={label}
            iconName={iconName}
            toolIcon={toolIcon}
            highlighted
            iconHidden={showSpinner}
          />
        </ActivityShimmerOverlay>
      ) : null}
    </div>
  );
}

function LiveActivityContent({
  label,
  iconName,
  toolIcon,
  failed = false,
  announceFailure = false,
  highlighted = false,
  spinner = false,
  iconHidden = false,
  iconEnters = false,
}: {
  label: ReactNode;
  iconName: WorkEntryIconName | undefined;
  toolIcon?: ToolActivityIcon | undefined;
  failed?: boolean;
  announceFailure?: boolean;
  highlighted?: boolean;
  spinner?: boolean;
  iconHidden?: boolean;
  /** The step just finished: its icon fades in where the spinner was. */
  iconEnters?: boolean;
}) {
  const showTrailingFailureMark =
    failed && iconName !== undefined && !toolIconAcceptsTint(toolIcon);

  return (
    <WorkLogRow
      icon={
        iconHidden ? (
          <span className="size-4" />
        ) : spinner ? (
          <span
            key="spinner"
            className="flex size-4 items-center justify-center text-info-foreground"
          >
            <Spinner size="sm" />
          </span>
        ) : iconName ? (
          <span
            key="icon"
            data-live={iconEnters || undefined}
            className={cn(
              "flex size-4 items-center justify-center",
              iconEnters && "live-enter [--live-enter-duration:150ms]",
              failed
                ? failedToolIconClassName
                : highlighted
                  ? "text-foreground"
                  : "text-icon-muted",
            )}
            role={announceFailure ? "img" : undefined}
            aria-label={announceFailure ? "Tool call failed" : undefined}
          >
            <ToolActivityIconView
              icon={toolIcon}
              fallbackName={iconName}
              className="block size-4 shrink-0 stroke-2"
              muted={!highlighted}
            />
          </span>
        ) : (
          // "Planning next moves" has no icon; the slot keeps its label where the first step's goes.
          <span className="size-4" />
        )
      }
      label={
        <span className={cn("block truncate", highlighted && "text-foreground")}>{label}</span>
      }
      trailing={
        showTrailingFailureMark ? (
          <XIcon aria-hidden className={cn("size-3 shrink-0", failedToolIconClassName)} />
        ) : null
      }
    />
  );
}

const RUN_HEADER_ICONS: Record<WorkRunHeaderRule, WorkEntryIconName> = {
  thought: "brain",
  browser: "browser",
  background: "terminal",
  edit: "square-pen",
  shell: "terminal",
  image: "eye",
  tools: "hammer",
  explore: "search",
};

function workEntryShowsAsCard(entry: TimelineWorkEntry): boolean {
  const item = entry.projectedItem?.item ?? entry.structuredPayload;
  const kind = workEventKind(entry);
  return (
    (item?.type === "file_change" && workEventIsFileChange(kind)) ||
    (item?.type === "command_execution" && kind === "shell")
  );
}

/** While a run is live, its newest steps stay readable above the live one; older ones fold. */
const LIVE_PREVIEW_STEPS = 3;

/** A live run shows one header with the loading verb, its newest steps, and its live step. */
export function LiveWorkEntryTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "work-live" }>;
}) {
  const ctx = use(TimelineRowCtx);
  const { awaitingUser } = use(TimelineRowActivityCtx);
  // The step this row mounted with replaces "Planning" or a remount in place; later steps fade in.
  const [mountedEntryId] = useState(row.entry.id);
  const stepEnters = row.entry.id !== mountedEntryId;
  const threadTarget = useThreadReadTarget(row.entry, ctx.activeThreadEnvironmentId);
  const label = liveWorkEntryLabel(row.entry, ctx.workspaceRoot, row.active);
  const threadLabel = threadReadLabel(label, threadTarget);

  const item = row.entry.projectedItem?.item;
  const pendingApproval =
    item?.type === "approval_request" ? ctx.pendingApprovals.get(item.requestId) : undefined;
  const approvalResolved = useApprovalResolved(pendingApproval !== undefined, () =>
    ctx.onToggleWorkEntry(row.id, true),
  );
  // A streaming thought shows its body until the next step starts, unless the user closed it.
  const [thoughtToggle, setThoughtToggle] = useState<{ id: string; open: boolean } | null>(null);
  if (pendingApproval) return <TimelinePendingApprovalRow approval={pendingApproval} />;

  const failed = workEntryDisplayIndicatesToolFailure(row.entry);
  const toggleGroup = () => ctx.onToggleWorkGroup(row.groupId, row.id);
  // Waiting on the user is not work in progress: no spinner, sweep, or ticking timer.
  const live = row.active && !awaitingUser;
  const isReasoning = row.entry.itemType === "reasoning";
  const toolIsRunning = live && !isReasoning;
  const thoughtText =
    isReasoning && live && row.entry.toolLifecycleStatus === "inProgress"
      ? (row.entry.detail?.trim() ?? "")
      : "";
  const thoughtOpen = thoughtToggle?.id === row.entry.id ? thoughtToggle.open : true;
  const toggleThought = () => {
    const open = !thoughtOpen;
    setThoughtToggle({ id: row.entry.id, open });
    // What the user chose while it streamed is how the finished thought opens.
    if (open) ctx.workGroupViewState.expandedEntries.add(row.entry.id);
    else ctx.workGroupViewState.expandedEntries.delete(row.entry.id);
  };
  const grouped = row.groupedEntries.length > 1;
  const header = grouped ? workRunHeader(row.groupedEntries, live) : null;
  // A finished thought stays in the run as its closed "Thought for Ns" row.
  const finishedSteps =
    grouped && !row.expanded
      ? row.groupedEntries.filter(
          (entry) =>
            entry.id !== row.entry.id &&
            (entry.itemType !== "reasoning" || thoughtBody(entry.detail).length > 0),
        )
      : [];
  const previewSteps = finishedSteps.slice(-LIVE_PREVIEW_STEPS);
  const earlierStepCount = finishedSteps.length - previewSteps.length;
  const action = isReasoning || threadLabel ? null : workEventAction(row.entry, live);
  const stepLabel = isReasoning ? (
    thoughtTitle([row.entry], row.active)
  ) : threadLabel ? (
    <ThreadReadLabel
      label={threadLabel}
      environmentId={ctx.activeThreadEnvironmentId}
      linked={false}
    />
  ) : action ? (
    <WorkEventLabel action={action} workspaceRoot={ctx.workspaceRoot} />
  ) : (
    label
  );
  const stepText = isReasoning
    ? thoughtTitle([row.entry], row.active)
    : (threadLabel?.text ?? (action ? workEventActionText(action) : label));

  return (
    <div
      data-live={approvalResolved || undefined}
      className={cn(
        "flex min-w-0 flex-col",
        approvalResolved && "live-enter [--live-enter-duration:150ms]",
      )}
    >
      {header ? (
        <button
          type="button"
          className="group/live-work flex min-h-7 w-full max-w-full cursor-pointer items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
          aria-expanded={row.expanded}
          onClick={toggleGroup}
        >
          <LiveActivityRow
            label={header.title}
            iconName={RUN_HEADER_ICONS[header.rule]}
            active={row.active}
            shimmer={live}
          />
          <WorkGroupChevron expanded={row.expanded} />
        </button>
      ) : null}
      {earlierStepCount > 0 ? (
        <WorkLogButton
          aria-expanded={false}
          onClick={toggleGroup}
          icon={<span className="size-4" />}
          label={`${earlierStepCount} earlier ${earlierStepCount === 1 ? "step" : "steps"}`}
        />
      ) : null}
      {previewSteps.map((entry) => (
        <SimpleWorkEntryRow
          key={entry.id}
          workEntry={entry}
          workspaceRoot={ctx.workspaceRoot}
          onToggleEntry={(collapsed) => ctx.onToggleWorkEntry(row.id, collapsed)}
          compact
        />
      ))}
      {grouped && row.expanded ? null : workEntryShowsAsCard(row.entry) ? (
        <div
          key={row.entry.id}
          data-live={stepEnters || undefined}
          className={stepEnters ? "live-enter" : undefined}
        >
          <SimpleWorkEntryRow
            workEntry={row.entry}
            workspaceRoot={ctx.workspaceRoot}
            live={toolIsRunning}
            shimmer={toolIsRunning && !grouped}
            onToggleEntry={(collapsed) => ctx.onToggleWorkEntry(row.id, collapsed)}
            compact={grouped}
          />
        </div>
      ) : (
        <button
          key={row.entry.id}
          type="button"
          data-live={stepEnters || undefined}
          className={cn(
            "group/live-work flex min-h-7 w-full max-w-full cursor-pointer items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
            stepEnters && "live-enter",
          )}
          aria-label={failed ? `${stepText}, tool call failed` : undefined}
          aria-expanded={thoughtText ? thoughtOpen : row.expanded}
          onClick={thoughtText ? toggleThought : toggleGroup}
        >
          <LiveActivityRow
            label={stepLabel}
            iconName={workEntryIconName(row.entry)}
            toolIcon={row.entry.toolIcon ?? row.entry.toolSource?.icon}
            failed={failed}
            active={row.active}
            shimmer={live && !grouped}
            spinner={toolIsRunning}
          />
          {toolIsRunning && !failed ? (
            <span className="ms-auto shrink-0 pe-1 text-xs text-muted-foreground tabular-nums">
              <WorkingTimer createdAt={row.entry.createdAt} />
            </span>
          ) : null}
        </button>
      )}
      {thoughtText && thoughtOpen && !(grouped && row.expanded) ? (
        <LiveThoughtBody text={thoughtText} />
      ) : null}
    </div>
  );
}

function WorkGroupChevron({ expanded }: { expanded: boolean }) {
  return (
    <ChevronRightIcon
      aria-hidden
      className={cn(
        "size-3 shrink-0 text-icon-muted opacity-0 transition-[opacity,rotate] duration-150 ease-out group-hover/live-work:opacity-100 group-hover/timeline-row:opacity-100 group-focus-visible/live-work:opacity-100 group-focus-visible/timeline-row:opacity-100",
        expanded && "rotate-90 opacity-100",
      )}
    />
  );
}

export function WorkGroupToggleTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "work-toggle" }>;
}) {
  const ctx = use(TimelineRowCtx);
  return (
    <WorkGroupHeader
      label={row.summary}
      iconName={
        row.toolSurface ??
        (row.summaryRule === "tools"
          ? toolGroupSummaryIconName(row.summaryKind)
          : RUN_HEADER_ICONS[row.summaryRule])
      }
      toolIcon={row.toolIcon}
      failed={row.hasFailure}
      stats={row.summaryStats}
      expanded={row.expanded}
      onToggle={() => ctx.onToggleWorkGroup(row.groupId, row.id)}
    />
  );
}

function WorkGroupHeader(props: {
  label: string;
  iconName: WorkEntryIconName;
  toolIcon?: ToolActivityIcon | undefined;
  failed?: boolean | undefined;
  stats?: { readonly additions: number; readonly deletions: number } | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <WorkLogButton
      aria-label={props.failed ? `${props.label}, tool call failed` : props.label}
      aria-expanded={props.expanded}
      onClick={props.onToggle}
      icon={
        <ToolActivityIconView
          icon={props.toolIcon}
          fallbackName={props.iconName}
          className="size-4 shrink-0 stroke-2 text-icon-muted"
          muted
        />
      }
      label={
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">{props.label}</span>
          {props.stats ? (
            <DiffStatLabel
              additions={props.stats.additions}
              deletions={props.stats.deletions}
              layout="inline"
              hideZero
              className="ms-1 shrink-0 text-xs"
            />
          ) : null}
          <WorkGroupChevron expanded={props.expanded} />
        </span>
      }
    />
  );
}
