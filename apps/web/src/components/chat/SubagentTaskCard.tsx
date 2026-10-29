import { useAtomValue } from "@effect/atom-react";
import type { LegendListRef } from "@legendapp/list/react";
import { scopeThreadRef, scopedThreadKey } from "@marp/client-runtime/environment";
import { formatSubagentDisplayTitle } from "@marp/client-runtime/state/subagent-display";
import {
  deriveRunlessWorkStartedAt,
  deriveThreadActivityRun,
  deriveThreadStructureRuntime,
} from "@marp/client-runtime/state/thread-execution";
import {
  SUBAGENT_KIND_LABELS,
  subagentCardState,
  subagentCurrentStep,
  subagentKind,
  subagentResultSummary,
  type SubagentKind,
} from "@marp/client-runtime/work-log/live-cards";
import type {
  EnvironmentId,
  OrchestrationV2TurnItem,
  ScopedThreadRef,
  ThreadId,
} from "@marp/contracts";
import { formatModelSlugName } from "@marp/shared/model";
import * as DateTime from "effect/DateTime";
import {
  BotIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ScanSearchIcon,
  SearchIcon,
  TerminalIcon,
  XIcon,
} from "lucide-react";
import { use, useRef, useState } from "react";

import { useIncrementalTimelineEntries } from "../../hooks/useIncrementalTimelineEntries";
import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";
import { deriveActiveWorkStartedAt, derivePhase } from "../../session-logic";
import { useQuietThreadShell, useThreadVisibleTurnItems } from "../../state/entities";
import { environmentThreadDetails } from "../../state/threads";
import { ThreadHoverCardPopup } from "../ThreadHoverCard";
import { Button } from "../ui/button";
import { Sheet, SheetPopup } from "../ui/sheet";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipTrigger } from "../ui/tooltip";
import { AgentElapsed } from "./AgentElapsed";
import { MessagesTimeline } from "./MessagesTimeline";
import { ThreadFindTimelineContext } from "./ThreadFindProvider";
import { ActivityShimmerOverlay } from "./TimelineRowParts";
import { TimelineRowCtx } from "./timelineRowContext";
import { SubagentTimelineTooltip } from "./V2LifecycleRow";

type SubagentItem = Extract<OrchestrationV2TurnItem, { readonly type: "subagent" }>;

const KIND_ICONS: Record<SubagentKind, typeof BotIcon> = {
  explore: SearchIcon,
  shell: TerminalIcon,
  browser: GlobeIcon,
  review: ScanSearchIcon,
  custom: BotIcon,
};

const STATE_LABELS = {
  done: "Done",
  failed: "Failed",
  stopped: "Stopped",
  idle: "Idle",
  waiting: "Waiting",
} as const;

function isoOrNull(value: DateTime.Utc | null): string | null {
  return value === null ? null : DateTime.formatIso(value);
}

/**
 * A subagent where its parent spawned it: what it is, what it is doing now, and how it ended.
 * The current step comes from the provider's progress line or the child's shell, which every
 * client already holds; the child's timeline loads only while its preview is open.
 */
export function SubagentTaskCard({
  item,
  environmentId,
  onOpenThread,
}: {
  item: SubagentItem;
  environmentId: EnvironmentId;
  onOpenThread: (threadId: ThreadId) => void;
}) {
  const parentRef = scopeThreadRef(environmentId, item.threadId);
  const agent = useAtomValue(
    environmentThreadDetails.threadAtom(parentRef),
    (thread) => thread?.projection.subagents.find((agent) => agent.id === item.subagentId) ?? null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const status = agent?.status ?? item.status;
  const state = subagentCardState(status);
  const rawTitle = agent?.title ?? item.title;
  const title = formatSubagentDisplayTitle(rawTitle ?? "Subagent");
  const kind = subagentKind(rawTitle);
  const KindIcon = KIND_ICONS[kind];
  const childThreadId = agent?.childThreadId ?? item.childThreadId;
  const childRef = childThreadId === null ? null : scopeThreadRef(environmentId, childThreadId);
  const child = useQuietThreadShell(childRef);
  const live = state === "running" || state === "waiting";
  const progress = agent?.progress ?? item.progress;
  const result = agent?.result ?? item.result;
  const step = subagentCurrentStep({ status, progress, child: child?.source });
  const summary = live ? null : subagentResultSummary(result);
  const steps = child?.visibleItemCount ?? 0;
  const timing = {
    status,
    startedAt: isoOrNull(agent?.startedAt ?? item.startedAt),
    completedAt: isoOrNull(agent?.completedAt ?? item.completedAt),
  };
  const model = agent?.model ?? null;
  const stepLabel = step ?? (state === "running" ? "Working" : null);

  return (
    <>
      {/* The title button is the accessible way in; the rest of the card is a larger mouse target. */}
      <div
        data-v2-item-type="subagent"
        data-subagent-card={state}
        onClick={(event) => {
          if (childRef === null || (event.target as Element).closest("button,a")) return;
          setPreviewOpen(true);
        }}
        className={cn(
          "group/subagent-card my-1 min-w-0 overflow-hidden rounded-field bg-muted text-sm leading-relaxed",
          childRef !== null && "cursor-pointer",
        )}
      >
        <div className="flex h-8 min-w-0 items-center gap-2 px-3">
          <KindIcon aria-hidden className="size-4 shrink-0 text-icon-muted" />
          <button
            type="button"
            disabled={childRef === null}
            aria-haspopup="dialog"
            aria-label={`Preview ${title}`}
            onClick={() => setPreviewOpen(true)}
            className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70 disabled:cursor-default"
          >
            <span className="shrink-0 text-muted-foreground">{SUBAGENT_KIND_LABELS[kind]}</span>
            <span className="min-w-0 truncate text-foreground">{title}</span>
          </button>
          {model === null ? null : (
            <Tooltip>
              <TooltipTrigger
                delay={200}
                render={
                  <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground" />
                }
              >
                {formatModelSlugName(model)}
              </TooltipTrigger>
              <ThreadHoverCardPopup>
                <SubagentTimelineTooltip
                  parentRef={parentRef}
                  threadId={childThreadId}
                  title={title}
                  providerInstanceId={item.providerInstanceId}
                  origin={item.origin}
                  driver={item.driver}
                  model={model}
                  modelSelection={agent?.modelSelection}
                  elapsed={<AgentElapsed agent={timing} />}
                  status={status}
                  result={result}
                  progress={progress}
                />
              </ThreadHoverCardPopup>
            </Tooltip>
          )}
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-xs tabular-nums",
              state === "failed" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {state === "running" ? (
              <span className="flex text-info-foreground">
                <Spinner size="sm" />
              </span>
            ) : (
              <span>{STATE_LABELS[state]}</span>
            )}
            <AgentElapsed agent={timing} />
          </span>
        </div>
        {live && stepLabel !== null ? (
          <div className="flex h-7 min-w-0 items-center gap-2 px-3 pb-1">
            <span className="size-4 shrink-0" />
            <span
              ref={state === "running" ? observeVisibleAnimation : undefined}
              className="relative min-w-0 overflow-hidden truncate text-secondary-label"
            >
              {stepLabel}
              {state === "running" ? (
                <ActivityShimmerOverlay>{stepLabel}</ActivityShimmerOverlay>
              ) : null}
            </span>
          </div>
        ) : null}
        {!live && (summary !== null || steps > 0) ? (
          <div className="flex h-7 min-w-0 items-center gap-1.5 px-3 pb-1 text-muted-foreground">
            <span className="size-4 shrink-0" />
            {summary === null ? null : <span className="min-w-0 truncate">{summary}</span>}
            {steps > 0 ? (
              <span className="shrink-0 tabular-nums">
                {summary === null ? "" : "· "}
                {steps} {steps === 1 ? "step" : "steps"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {childRef === null || childThreadId === null ? null : (
        <SubagentPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          threadRef={childRef}
          title={title}
          onOpenThread={() => {
            setPreviewOpen(false);
            onOpenThread(childThreadId);
          }}
        />
      )}
    </>
  );
}

function SubagentPreview({
  open,
  onOpenChange,
  threadRef,
  title,
  onOpenThread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadRef: ScopedThreadRef;
  title: string;
  onOpenThread: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup
        side="right"
        variant="inset"
        showCloseButton={false}
        aria-label={`Subagent preview: ${title}`}
        className="w-[min(92vw,44rem)] max-w-[44rem]"
      >
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h2>
          <Button size="xs" variant="ghost" onClick={onOpenThread}>
            <ExternalLinkIcon aria-hidden />
            Open thread
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Close subagent preview"
            onClick={() => onOpenChange(false)}
          >
            <XIcon aria-hidden />
          </Button>
        </div>
        <div className="relative min-h-0 flex-1">
          {open ? <SubagentTranscript threadRef={threadRef} /> : null}
        </div>
      </SheetPopup>
    </Sheet>
  );
}

const NO_TURN_DIFFS: ReadonlyArray<never> = [];
const NO_MESSAGES: ReadonlyArray<never> = [];
const ignore = () => {};

/** The child's timeline, read-only; mounted only while the preview is open. */
function SubagentTranscript({ threadRef }: { threadRef: ScopedThreadRef }) {
  const ctx = use(TimelineRowCtx);
  const listRef = useRef<LegendListRef | null>(null);
  const threadKey = scopedThreadKey(threadRef);
  const projection = useAtomValue(environmentThreadDetails.quietThreadAtom(threadRef))?.projection;
  const visibleTurnItems = useThreadVisibleTurnItems(threadRef);
  const entries = useIncrementalTimelineEntries(threadKey, {
    visibleTurnItems,
    optimisticMessages: NO_MESSAGES,
    ...(projection === undefined
      ? {}
      : { attempts: projection.attempts, nodes: projection.nodes, plans: projection.plans }),
  });
  const activityRun = projection ? deriveThreadActivityRun(projection) : null;
  const runtime = projection ? deriveThreadStructureRuntime(projection) : null;
  const runlessWorkStartedAt = projection ? deriveRunlessWorkStartedAt(projection) : null;
  return (
    // The parent's thread find must not drive this timeline.
    <ThreadFindTimelineContext value={null}>
      <MessagesTimeline
        listRef={listRef}
        timelineEntries={entries}
        isWorking={derivePhase(runtime) === "running" || runlessWorkStartedAt !== null}
        activeTurnStartedAt={
          deriveActiveWorkStartedAt(activityRun, runtime, null) ?? runlessWorkStartedAt
        }
        latestRun={activityRun}
        runningRunId={runtime?.activeRunId ?? null}
        turnDiffSummaries={NO_TURN_DIFFS}
        runs={projection?.runs ?? NO_MESSAGES}
        routeThreadKey={threadKey}
        announceTurnStatus={false}
        onOpenThread={ctx.onOpenThread}
        supportsConversationRollback={false}
        onRevertToTurnCount={ignore}
        isRevertingCheckpoint={false}
        onImageExpand={ctx.onImageExpand}
        activeThreadEnvironmentId={threadRef.environmentId}
        markdownCwd={ctx.markdownCwd}
        resolvedTheme={ctx.resolvedTheme}
        timestampFormat={ctx.timestampFormat}
        workspaceRoot={ctx.workspaceRoot}
        anchorMessageId={null}
        onAnchorReady={ignore}
        onAnchorSizeChanged={ignore}
        contentInsetEndAdjustment={0}
        emptyPlaceholderInset={0}
        liveFollowEnabled
        onIsAtEndChange={ignore}
      />
    </ThreadFindTimelineContext>
  );
}
