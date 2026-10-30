import { TimelinePendingApprovalRow } from "./TimelinePendingApprovalRow";
import { WorkLogButton, WorkLogList, WorkLogRow } from "./WorkLog";
import type { WorktreeSetupSnapshot } from "@marp/contracts";
import { type ToolActivityIcon } from "@marp/contracts";
import {
  thoughtTitle,
  workEventAction,
  workEventActionText,
  workEventIsFileChange,
  workEventKind,
  workRunHeader,
  type WorkRunHeaderRule,
} from "@marp/client-runtime/work-log/event-presentation";
import { responseStalled } from "@marp/client-runtime/work-log/live-cards";
import { workEntryWasSkipped } from "@marp/client-runtime/work-log/presentation";
import { observeVisibleAnimation } from "../../lib/visibleAnimation";
import { tickTextContent } from "../../lib/tickTextContent";
import { memo, use, useEffect, useId, useState, type ReactNode } from "react";
import { workEntryDisplayIndicatesToolFailure } from "../../session-logic";
import { ChevronRightIcon, Minimize2Icon, XIcon } from "lucide-react";
import { DiffStatLabel } from "./DiffStatLabel";
import { Button } from "../ui/button";
import {
  liveWorkEntryLabel,
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
  type TimelineWorkEntry,
  type TimelineRow,
} from "./timelineRowContext";
import {
  ActivityShimmerOverlay,
  RollingText,
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
import { CommandOutputTail, useCommandOutputStreaming } from "./CommandOutputPanel";
import { AWAITING_USER_LABELS, preActivityLabel } from "./TimelineWorkGroupRows.logic";

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
  if (isExpandedToolGroup) {
    return (
      <ExpandedRunSteps
        key={`${routeThreadKey}:${anchorKey}`}
        entries={nonEmptyEntries}
        workspaceRoot={workspaceRoot}
        onToggleEntry={onToggleStandaloneEntry}
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

/** An open run flows in the page scroll; a very long one reveals older steps a page at a time. */
const RUN_STEP_PAGE = 50;

function ExpandedRunSteps({
  entries,
  workspaceRoot,
  onToggleEntry,
}: {
  entries: TimelineWorkEntry[];
  workspaceRoot: string | undefined;
  onToggleEntry: (collapsed: boolean) => void;
}) {
  const [shownCount, setShownCount] = useState(RUN_STEP_PAGE);
  const hiddenCount = Math.max(0, entries.length - shownCount);
  return (
    <WorkLogList>
      {hiddenCount > 0 ? (
        <WorkLogButton
          onClick={() => setShownCount((count) => count + RUN_STEP_PAGE)}
          icon={<span className="size-4" />}
          label={`${hiddenCount} earlier ${hiddenCount === 1 ? "step" : "steps"}`}
        />
      ) : null}
      {entries.slice(hiddenCount).map((workEntry) => (
        <SimpleWorkEntryRow
          key={workEntry.id}
          workEntry={workEntry}
          workspaceRoot={workspaceRoot}
          onToggleEntry={onToggleEntry}
          compact
        />
      ))}
    </WorkLogList>
  );
}

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
    <CompactingLabel />
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

function CompactingLabel() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Minimize2Icon aria-hidden="true" className="size-3" />
      Summarizing chat context
    </span>
  );
}

export function ThinkingTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "thinking" }> }) {
  const ctx = use(TimelineRowCtx);
  const { isCompacting, isPreparingWorktree, awaitingUser } = use(TimelineRowActivityCtx);
  if (isPreparingWorktree || isCompacting) return <WorkLogRow label="" />;
  if (row.preActivity) {
    if (awaitingUser)
      return (
        <LiveActivityRow
          label={AWAITING_USER_LABELS[awaitingUser]}
          labelKey={AWAITING_USER_LABELS[awaitingUser]}
          active
          shimmer
        />
      );
    const label = (
      <span ref={tickTextContent((nowMs) => preActivityLabel(row.createdAt, nowMs), true)} />
    );
    return <LiveActivityRow label={label} labelKey="Planning next moves" active shimmer />;
  }
  if (row.waitingForSubagent && !awaitingUser) {
    return (
      <LiveActivityRow
        label="Waiting for subagent"
        labelKey="Waiting for subagent"
        active
        shimmer
      />
    );
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
  const activity = (
    <LiveActivityRow
      label={label}
      labelKey="Thinking"
      iconName="brain"
      active={live}
      shimmer={live}
    />
  );
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

/**
 * Cursor's status line is one row, so planning rolls into the first step and a live header into
 * its settled title. Ours are separate rows: a label still on screen when the row replacing it
 * mounts hands over its text, and the new row rolls from it once.
 */
function useLabelHandoff(slot: string, text: string | undefined): string | null {
  const labels = use(TimelineRowCtx).workGroupViewState.liveLabels;
  const owner = useId();
  const [from, setFrom] = useState(() => {
    const shown = text === undefined ? undefined : labels.get(slot);
    return shown !== undefined && shown.text !== text ? shown.text : null;
  });
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- registers the shown label for the row that replaces this one
  useEffect(() => {
    if (text === undefined) return;
    labels.set(slot, { text, owner });
    return () => {
      if (labels.get(slot)?.owner === owner) labels.delete(slot);
    };
  }, [labels, slot, text, owner]);
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- the handover rolls the labels mounted with it, never one mounted later
  useEffect(() => {
    if (from === null) return;
    const timer = window.setTimeout(() => setFrom(null), 0);
    return () => window.clearTimeout(timer);
  }, [from]);
  return from;
}

function LiveActivityRow({
  label,
  labelKey,
  iconName,
  toolIcon,
  failed = false,
  active = false,
  shimmer = false,
  spinner = false,
}: {
  label: ReactNode;
  /** A new key rolls the label, as Cursor's status line does. */
  labelKey?: string | undefined;
  iconName?: WorkEntryIconName | undefined;
  toolIcon?: ToolActivityIcon | undefined;
  failed?: boolean;
  active?: boolean;
  shimmer?: boolean;
  /** A running tool shows the spinner in place of its icon. */
  spinner?: boolean;
}) {
  const from = useLabelHandoff("status", labelKey);
  const rolled =
    labelKey === undefined ? (
      label
    ) : (
      <RollingText rollKey={labelKey} from={from}>
        {label}
      </RollingText>
    );
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
        label={rolled}
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
            label={rolled}
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

/** Cursor holds each live status for at least this long, so quick steps stay readable. */
const LIVE_STATUS_HOLD_MS = 1_200;

/** The step the status line names: the newest one, but never replaced sooner than the hold. */
function useHeldLiveEntry(
  entry: TimelineWorkEntry,
  entries: ReadonlyArray<TimelineWorkEntry>,
): TimelineWorkEntry {
  const [held, setHeld] = useState({ id: entry.id, since: 0 });
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- a wall-clock hold before the status names the next step
  useEffect(() => {
    if (held.id === entry.id) return;
    const wait = Math.max(0, held.since + LIVE_STATUS_HOLD_MS - Date.now());
    const timer = window.setTimeout(() => setHeld({ id: entry.id, since: Date.now() }), wait);
    return () => window.clearTimeout(timer);
  }, [entry.id, held]);
  return entries.find((candidate) => candidate.id === held.id) ?? entry;
}

/**
 * A live run, as in Cursor: a run of several steps is one collapsed group whose header counts what
 * it has done so far under its loading verb, with the current step on a status line below it.
 * A run of one step is that step's own row.
 */
export function LiveWorkEntryTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "work-live" }>;
}) {
  const ctx = use(TimelineRowCtx);
  const { awaitingUser } = use(TimelineRowActivityCtx);
  const grouped = row.groupedEntries.length > 1;
  const heldEntry = useHeldLiveEntry(row.entry, row.groupedEntries);
  const entry = grouped ? heldEntry : row.entry;
  const threadTarget = useThreadReadTarget(entry, ctx.activeThreadEnvironmentId);
  const label = liveWorkEntryLabel(entry, ctx.workspaceRoot, row.active);
  const threadLabel = threadReadLabel(label, threadTarget);
  const streamsOutput = useCommandOutputStreaming(ctx.activeThreadEnvironmentId);

  const item = row.entry.projectedItem?.item;
  const pendingApproval =
    item?.type === "approval_request" ? ctx.pendingApprovals.get(item.requestId) : undefined;
  const approvalResolved = useApprovalResolved(pendingApproval !== undefined, () =>
    ctx.onToggleWorkEntry(row.id, true),
  );
  // A streaming thought stays closed, as in Cursor, until the user opens it.
  const [thoughtToggle, setThoughtToggle] = useState<{ id: string; open: boolean } | null>(null);
  // As in Cursor, the status line keeps saying what the turn is blocked on.
  const waiting = awaitingUser === null ? null : AWAITING_USER_LABELS[awaitingUser];
  const waitingStatus = waiting ? (
    <LiveActivityRow label={waiting} labelKey={waiting} active shimmer />
  ) : null;
  if (pendingApproval) {
    return (
      <div className="flex min-w-0 flex-col">
        <TimelinePendingApprovalRow approval={pendingApproval} />
        {waitingStatus}
      </div>
    );
  }

  const failed = workEntryDisplayIndicatesToolFailure(entry) && !workEntryWasSkipped(entry);
  const toggleGroup = () => ctx.onToggleWorkGroup(row.groupId, row.id);
  // Waiting on the user is not work in progress: no spinner or sweep.
  const live = row.active && !awaitingUser;
  const isReasoning = entry.itemType === "reasoning";
  const toolIsRunning = live && !isReasoning;
  const thoughtText =
    isReasoning && live && entry.toolLifecycleStatus === "inProgress"
      ? (entry.detail?.trim() ?? "")
      : "";
  const thoughtOpen = thoughtToggle?.id === entry.id ? thoughtToggle.open : false;
  const toggleThought = () => {
    const open = !thoughtOpen;
    setThoughtToggle({ id: entry.id, open });
    // What the user chose while it streamed is how the finished thought opens.
    if (open) ctx.workGroupViewState.expandedEntries.add(entry.id);
    else ctx.workGroupViewState.expandedEntries.delete(entry.id);
  };
  const header = grouped ? workRunHeader(row.groupedEntries, live) : null;
  const action = isReasoning || threadLabel ? null : workEventAction(entry, live);
  const projected = entry.projectedItem;
  // A command reads as its description, as its card does.
  const description =
    action?.kind === "shell" && projected?.item.type === "command_execution"
      ? projected.item.description?.trim()
      : undefined;
  const stepLabel = description ? (
    description
  ) : isReasoning ? (
    thoughtTitle([entry], row.active)
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
  const stepText =
    description ??
    (isReasoning
      ? thoughtTitle([entry], row.active)
      : (threadLabel?.text ?? (action ? workEventActionText(action) : label)));
  // Beyond Cursor: a running command's newest output shows under the status line.
  const outputTail =
    toolIsRunning &&
    projected?.item.type === "command_execution" &&
    workEventKind(entry) === "shell" &&
    (ctx.turnItemSource !== undefined || streamsOutput) ? (
      <CommandOutputTail
        environmentId={ctx.activeThreadEnvironmentId}
        threadId={projected.sourceThreadId}
        itemId={projected.sourceItemId}
        source={ctx.turnItemSource?.commandOutput}
        className="ms-6 mt-0.5 mb-1"
        onOpen={toggleGroup}
      />
    ) : null;

  return (
    <div
      data-live={approvalResolved || undefined}
      className={cn(
        "flex min-w-0 flex-col",
        approvalResolved && "live-enter [--live-enter-duration:150ms]",
      )}
    >
      {header ? (
        <WorkGroupHeader
          groupId={row.groupId}
          label={header.title}
          iconName={RUN_HEADER_ICONS[header.rule]}
          expanded={row.expanded}
          onToggle={toggleGroup}
        />
      ) : null}
      {grouped && row.expanded ? null : !grouped && workEntryShowsAsCard(entry) ? (
        <>
          <SimpleWorkEntryRow
            workEntry={entry}
            workspaceRoot={ctx.workspaceRoot}
            live={toolIsRunning}
            shimmer={toolIsRunning}
            onToggleEntry={(collapsed) => ctx.onToggleWorkEntry(row.id, collapsed)}
          />
          {waitingStatus}
        </>
      ) : (
        <>
          <button
            type="button"
            data-live-status
            className="group/live-work flex min-h-7 w-full max-w-full cursor-pointer items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
            aria-label={failed && !waiting ? `${stepText}, tool call failed` : undefined}
            aria-expanded={thoughtText ? thoughtOpen : row.expanded}
            onClick={thoughtText ? toggleThought : toggleGroup}
          >
            <LiveActivityRow
              label={waiting ?? stepLabel}
              labelKey={waiting ?? stepText}
              iconName={waiting ? undefined : workEntryIconName(entry)}
              toolIcon={waiting ? undefined : (entry.toolIcon ?? entry.toolSource?.icon)}
              failed={failed && !waiting}
              active={row.active}
              shimmer={live || waiting !== null}
              spinner={toolIsRunning}
            />
          </button>
          {outputTail}
        </>
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
      groupId={row.groupId}
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
  /** The run this header titles, so its live title rolls into the settled one. */
  groupId: string;
  iconName: WorkEntryIconName;
  toolIcon?: ToolActivityIcon | undefined;
  failed?: boolean | undefined;
  stats?: { readonly additions: number; readonly deletions: number } | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const from = useLabelHandoff(`header:${props.groupId}`, props.label);
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
          <span className="min-w-0 truncate">
            <RollingText rollKey={props.label} from={from}>
              {props.label}
            </RollingText>
          </span>
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
