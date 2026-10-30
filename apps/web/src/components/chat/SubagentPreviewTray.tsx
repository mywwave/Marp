import { useAtomValue } from "@effect/atom-react";
import type { LegendListRef } from "@legendapp/list/react";
import { scopeThreadRef, scopedThreadKey } from "@marp/client-runtime/environment";
import {
  deriveRunlessWorkStartedAt,
  deriveThreadActivityRun,
  deriveThreadStructureRuntime,
} from "@marp/client-runtime/state/thread-execution";
import { subagentCardState, subagentStatusLabel } from "@marp/client-runtime/work-log/live-cards";
import type { ScopedThreadRef, ThreadId } from "@marp/contracts";
import { formatModelSlugName } from "@marp/shared/model";
import { ExternalLinkIcon, XIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";

import { useIncrementalTimelineEntries } from "../../hooks/useIncrementalTimelineEntries";
import { usePresence } from "../../hooks/usePresence";
import { observeResize } from "../../lib/observeResize";
import { deriveActiveWorkStartedAt, derivePhase } from "../../session-logic";
import { useThreadVisibleTurnItems } from "../../state/entities";
import { environmentThreadDetails } from "../../state/threads";
import { Button } from "../ui/button";
import { MessagesTimeline } from "./MessagesTimeline";
import { ThreadFindTimelineContext } from "./ThreadFindProvider";
import type { SubagentPreviewTarget } from "./subagentPreviewContext";

type TimelineProps = ComponentProps<typeof MessagesTimeline>;

export type SubagentTranscriptSettings = Pick<
  TimelineProps,
  "onImageExpand" | "markdownCwd" | "resolvedTheme" | "timestampFormat" | "workspaceRoot"
>;

/**
 * A subagent's read-only timeline in a tray above the composer, at the chat's width, over a scrim
 * on the transcript. `bottom` is the composer's height, so the tray never covers its input.
 */
export function SubagentPreviewTray({
  target,
  bottom,
  settings,
  onClose,
  onOpenThread,
}: {
  target: SubagentPreviewTarget | null;
  bottom: number;
  settings: SubagentTranscriptSettings;
  onClose: () => void;
  onOpenThread: (threadId: ThreadId) => void;
}) {
  // The last target stays shown while the tray plays its exit.
  const [shown, setShown] = useState(target);
  if (target !== null && target !== shown) setShown(target);
  const { mounted, closing } = usePresence(target !== null);
  if (!mounted || shown === null) return null;
  return (
    <SubagentPreviewLayer
      key={shown.childThreadId}
      target={shown}
      closing={closing}
      bottom={bottom}
      settings={settings}
      onClose={onClose}
      onOpenThread={onOpenThread}
    />
  );
}

function SubagentPreviewLayer({
  target,
  closing,
  bottom,
  settings,
  onClose,
  onOpenThread,
}: {
  target: SubagentPreviewTarget;
  closing: boolean;
  bottom: number;
  settings: SubagentTranscriptSettings;
  onClose: () => void;
  onOpenThread: (threadId: ThreadId) => void;
}) {
  const agent = useAtomValue(
    environmentThreadDetails.threadAtom(
      scopeThreadRef(target.environmentId, target.parentThreadId),
    ),
    (thread) =>
      thread?.projection.subagents.find((agent) => agent.id === target.subagentId) ?? null,
  );
  const state = agent === null ? null : subagentCardState(agent.status);
  // A short transcript gets a short tray; a long one stops at 60vh and scrolls.
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- Esc anywhere in the window closes the preview
  useEffect(() => {
    if (closing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closing, onClose]);

  const fade =
    "transition-[opacity,translate] duration-enter ease-out starting:opacity-0 data-closing:animate-fade-out motion-reduce:transition-none";
  return (
    <div
      data-subagent-preview
      data-closing={closing || undefined}
      inert={closing}
      className="absolute inset-x-0 top-0 z-20"
      style={{ bottom }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close subagent preview"
        data-closing={closing || undefined}
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-background/60 ${fade}`}
      />
      <div className="chat-composer-lane pointer-events-none absolute inset-0 flex flex-col justify-end pt-3 pb-2">
        <section
          role="dialog"
          aria-label={`Subagent preview: ${target.title}`}
          data-closing={closing || undefined}
          style={{
            height:
              contentHeight === null
                ? "60vh"
                : `min(60vh, ${Math.ceil(contentHeight) + TRAY_HEADER_PX}px)`,
          }}
          className={`pointer-events-auto mx-auto flex max-h-full w-full max-w-(--chat-content-max-width) flex-col overflow-hidden rounded-card bg-popover shadow-pop starting:translate-y-2 motion-reduce:starting:translate-y-0 ${fade}`}
        >
          <header className="flex h-11 shrink-0 items-center gap-2 ps-4 pe-2 text-sm">
            <h2 className="min-w-0 truncate font-medium">{target.title}</h2>
            {agent?.model ? (
              <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground">
                {formatModelSlugName(agent.model)}
              </span>
            ) : null}
            {state === null ? null : (
              <span
                className={
                  state === "failed"
                    ? "shrink-0 text-xs text-destructive"
                    : "shrink-0 text-xs text-muted-foreground"
                }
              >
                {state === "running" ? "Working" : subagentStatusLabel(state, null, true)}
              </span>
            )}
            <span className="ms-auto flex shrink-0 items-center gap-0.5">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  onClose();
                  onOpenThread(target.childThreadId);
                }}
              >
                <ExternalLinkIcon aria-hidden />
                Open thread
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Close"
                title="Close (Esc)"
                onClick={onClose}
              >
                <XIcon aria-hidden />
              </Button>
            </span>
          </header>
          <div className="relative min-h-0 flex-1">
            <SubagentTranscript
              threadRef={scopeThreadRef(target.environmentId, target.childThreadId)}
              settings={settings}
              onOpenThread={onOpenThread}
              onContentHeight={setContentHeight}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

const TRAY_HEADER_PX = 44;
const NO_TURN_DIFFS: ReadonlyArray<never> = [];
const NO_MESSAGES: ReadonlyArray<never> = [];
const ignore = () => {};

/** The child's timeline, read-only; mounted only while the preview is open. */
function SubagentTranscript({
  threadRef,
  settings,
  onOpenThread,
  onContentHeight,
}: {
  threadRef: ScopedThreadRef;
  settings: SubagentTranscriptSettings;
  onOpenThread: (threadId: ThreadId) => void;
  onContentHeight: (height: number) => void;
}) {
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
  const hasEntries = entries.length > 0;
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- observes the list's content size so the tray fits it
  useLayoutEffect(() => {
    // The list mounts with the first entry; before that there is nothing to fit.
    const content = hasEntries
      ? listRef.current?.getScrollableNode()?.firstElementChild
      : undefined;
    if (!content) return;
    onContentHeight(content.getBoundingClientRect().height);
    return observeResize(content, () => onContentHeight(content.getBoundingClientRect().height));
  }, [hasEntries, onContentHeight]);
  return (
    // The parent's thread find must not drive this timeline.
    <ThreadFindTimelineContext value={null}>
      <MessagesTimeline
        {...settings}
        listRef={listRef}
        timelineEntries={entries}
        isWorking={derivePhase(runtime) === "running" || runlessWorkStartedAt !== null}
        activeTurnStartedAt={
          deriveActiveWorkStartedAt(activityRun, runtime, null) ?? runlessWorkStartedAt
        }
        latestRun={activityRun}
        runningRunId={runtime?.activeRunId ?? null}
        runlessWorkActive={runlessWorkStartedAt !== null}
        turnDiffSummaries={NO_TURN_DIFFS}
        runs={projection?.runs ?? NO_MESSAGES}
        routeThreadKey={threadKey}
        announceTurnStatus={false}
        onOpenThread={onOpenThread}
        supportsConversationRollback={false}
        onRevertToTurnCount={ignore}
        isRevertingCheckpoint={false}
        activeThreadEnvironmentId={threadRef.environmentId}
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
