import { shouldPreserveAssistantLineBreaks } from "@marp/shared/markdownPipeline";
import { type MessageId } from "@marp/contracts";
import { canForkProjectedAssistantItem } from "@marp/client-runtime/state/thread-workflows";
import { useAtomValue } from "@effect/atom-react";
import { use, useState } from "react";
import { type ChatMessage, type TurnDiffSummary } from "../../types";
import ChatMarkdown from "../ChatMarkdown";
import { GitForkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { ProposedPlanCard } from "./ProposedPlanCard";
import { HtmlRenderFrame } from "./HtmlRenderFrame";
import { ChatMarkdownAssetImage } from "./ChatMarkdownMedia";
import { MEDIA_GRID_IMAGE_CLASS_NAME, MEDIA_GRID_IMAGE_STYLE, MediaGrid } from "./MediaGrid";
import { timelineMediaCaption } from "./timelineMedia.logic";
import { McpAppFrame } from "./McpAppFrame";
import { MessageCopyButton } from "./MessageCopyButton";
import { AssistantCitationSource } from "./AssistantCitationSource";
import { resolveAssistantMessageCopyState } from "./MessagesTimeline.logic";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { cn } from "~/lib/utils";
import { shortcutLabelForCommand } from "~/keybindings";
import { summarizeTurnDiffStats } from "~/lib/turnDiffStats";
import { primaryServerKeybindingsAtom } from "~/state/server";
import { Kbd } from "../ui/kbd";
import { Spinner } from "../ui/spinner";
import { DiffStatLabel } from "./DiffStatLabel";
import { formatChatTimestampTooltip, formatDayAwareTimestamp } from "../../timestampFormat";
import { useV2ItemSupport } from "../../state/v2ItemSupport";
import { TimelineRowCtx, TimelineRowActivityCtx, type TimelineRow } from "./timelineRowContext";
import { MESSAGE_HEADING_LEVEL, MessageAuthorHeading } from "./TimelineRowParts";

export function AssistantTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "message" }> }) {
  const ctx = use(TimelineRowCtx);
  const messageText = row.message.text || (row.message.streaming ? "" : "(empty response)");

  return (
    <>
      <div className="relative min-w-0 px-1 py-0.5">
        <MessageAuthorHeading>Marp</MessageAuthorHeading>
        <div data-thread-find-text="true">
          <AssistantCitationSource
            messageId={row.message.id}
            {...(ctx.threadRef ? { threadRef: ctx.threadRef } : {})}
            itemKey={row.id}
            request={ctx.citationRequest}
            listRef={ctx.listRef}
          >
            <ChatMarkdown
              text={messageText}
              cwd={ctx.markdownCwd}
              threadRef={ctx.threadRef ?? undefined}
              isStreaming={Boolean(row.message.streaming)}
              lineBreaks={shouldPreserveAssistantLineBreaks(messageText)}
              skills={ctx.skills}
              headingLevelOffset={MESSAGE_HEADING_LEVEL}
              onUseArtifactTemplate={ctx.onUseArtifactTemplate}
              onRunShellCommand={ctx.onRunShellCommand}
              onImageExpand={ctx.onImageExpand}
            />
          </AssistantCitationSource>
        </div>
        {row.showAssistantMeta ? (
          <AssistantMessageMeta
            className="mt-1.5"
            projectedItem={row.projectedItem}
            message={row.message}
            showCopyButton={row.showAssistantCopyButton}
            copyStreaming={row.assistantCopyStreaming}
          />
        ) : row.reserveAssistantMeta ? (
          // Same height as the meta row's xs button, so turn end swaps it in without a jump.
          <div aria-hidden className="invisible mt-1.5 h-7 sm:h-6" />
        ) : null}
        {row.assistantTurnDiffSummary && row.assistantTurnDiffSummary.files.length > 0 ? (
          <CheckpointDivider
            turnSummary={row.assistantTurnDiffSummary}
            restore={row.checkpointRestore}
          />
        ) : null}
      </div>
    </>
  );
}

/** Ends a turn that changed files: one way to review what changed, and the way back. */
function CheckpointDivider({
  turnSummary,
  restore,
}: {
  turnSummary: TurnDiffSummary;
  restore: { turnCount: number; messageId: MessageId } | undefined;
}) {
  const ctx = use(TimelineRowCtx);
  const activity = use(TimelineRowActivityCtx);
  const onOpenTurnDiff = ctx.onOpenTurnDiff;
  const fileCount = turnSummary.files.length;
  const files = `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  return (
    <div
      role="group"
      aria-label="Checkpoint"
      className="live-enter mt-4 flex items-center gap-2 text-xs text-muted-foreground [--live-enter-y:4px]"
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="shrink-0">
        {onOpenTurnDiff ? "Checkpoint" : `Checkpoint · ${files} changed`}
      </span>
      {onOpenTurnDiff ? (
        <TurnChangesPill
          turnSummary={turnSummary}
          files={files}
          onOpen={() => onOpenTurnDiff(turnSummary.runId)}
        />
      ) : null}
      {restore ? (
        <Button
          size="micro"
          variant="ghost"
          disabled={activity.isRevertingCheckpoint || activity.isWorking}
          onClick={() => ctx.onRevertToTurnCount(restore.turnCount, restore.messageId)}
        >
          Restore
        </Button>
      ) : null}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

function TurnChangesPill({
  turnSummary,
  files,
  onOpen,
}: {
  turnSummary: TurnDiffSummary;
  files: string;
  onOpen: () => void;
}) {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const shortcutLabel = shortcutLabelForCommand(keybindings, "diff.reviewTurn");
  const stat = summarizeTurnDiffStats(turnSummary.files);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="xs"
            variant="outline"
            aria-label={`Review changes: ${files}, ${stat.additions} additions, ${stat.deletions} deletions`}
            onClick={onOpen}
          />
        }
      >
        Changes
        <DiffStatLabel {...stat} layout="inline" hideZero />
      </TooltipTrigger>
      <TooltipPopup side="top">
        Review changes · {files}
        {shortcutLabel ? <Kbd className="ms-1.5">{shortcutLabel}</Kbd> : null}
      </TooltipPopup>
    </Tooltip>
  );
}

function AssistantForkButton({
  projectedItem,
}: {
  readonly projectedItem: NonNullable<Extract<TimelineRow, { kind: "message" }>["projectedItem"]>;
}) {
  const ctx = use(TimelineRowCtx);
  const [busy, setBusy] = useState(false);
  const support = useV2ItemSupport({
    environmentId: ctx.activeThreadEnvironmentId,
    sourceThreadId: projectedItem.sourceThreadId,
    sourceItemId: projectedItem.sourceItemId,
  });
  const canFork = canForkProjectedAssistantItem({
    projectedItem,
    capabilities: support.providerSession?.capabilities,
  });

  const onForkFromRun = ctx.onForkFromRun;
  if (!canFork || onForkFromRun === undefined || projectedItem.item.runId === null) return null;
  const runId = projectedItem.item.runId;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onForkFromRun({ sourceThreadId: projectedItem.sourceThreadId, runId }).finally(
                () => setBusy(false),
              );
            }}
            aria-label="Fork from this response"
          />
        }
      >
        {busy ? <Spinner size="xs" /> : <GitForkIcon className="size-3" />}
      </TooltipTrigger>
      <TooltipPopup side="top">Fork from this response</TooltipPopup>
    </Tooltip>
  );
}

export function AssistantMetaTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "assistant-meta" }>;
}) {
  return (
    <div className="px-1">
      <AssistantMessageMeta
        className="mt-0.5"
        projectedItem={row.projectedItem}
        message={row.message}
        showCopyButton={row.showAssistantCopyButton}
        copyStreaming={row.assistantCopyStreaming}
        alwaysVisible
      />
    </div>
  );
}

function AssistantMessageMeta({
  className,
  projectedItem,
  message,
  showCopyButton,
  copyStreaming,
  alwaysVisible = false,
}: {
  className?: string;
  projectedItem?: Extract<TimelineRow, { kind: "message" }>["projectedItem"];
  message: ChatMessage;
  showCopyButton: boolean;
  copyStreaming: boolean;
  alwaysVisible?: boolean;
}) {
  const ctx = use(TimelineRowCtx);

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs tabular-nums transition-opacity",
        alwaysVisible
          ? "opacity-100"
          : "opacity-0 duration-100 pointer-coarse:opacity-100 focus-within:opacity-100 focus-within:duration-150 group-hover/assistant:opacity-100 group-hover/assistant:duration-150",
        className,
      )}
    >
      {projectedItem && projectedItem.item.status !== "completed" ? (
        <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-3xs text-muted-foreground">
          {projectedItem.item.status}
        </span>
      ) : null}
      <AssistantCopyButton
        message={message}
        showCopyButton={showCopyButton}
        streaming={copyStreaming}
      />
      {projectedItem?.item.type === "assistant_message" ? (
        <AssistantForkButton projectedItem={projectedItem} />
      ) : null}
      {!message.streaming && (
        <Tooltip>
          <TooltipTrigger render={<p className="text-muted-foreground text-xs tabular-nums" />}>
            {formatDayAwareTimestamp(message.updatedAt, ctx.timestampFormat)}
          </TooltipTrigger>
          <TooltipPopup>
            {formatChatTimestampTooltip(message.updatedAt, ctx.timestampFormat)}
          </TooltipPopup>
        </Tooltip>
      )}
    </div>
  );
}

function AssistantCopyButton({
  message,
  showCopyButton,
  streaming,
}: {
  message: ChatMessage;
  showCopyButton: boolean;
  streaming: boolean;
}) {
  const assistantCopyState = resolveAssistantMessageCopyState({
    text: message.text ?? null,
    showCopyButton,
    streaming,
  });

  if (!assistantCopyState.visible) {
    return null;
  }

  return <MessageCopyButton text={assistantCopyState.text ?? ""} variant="ghost" />;
}

export function ProposedPlanTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "proposed-plan" }>;
}) {
  const ctx = use(TimelineRowCtx);

  return (
    <div className="min-w-0 px-1 py-0.5">
      <ProposedPlanCard
        actions={ctx.planActions?.planId === row.proposedPlan.id ? ctx.planActions : null}
        planMarkdown={row.proposedPlan.planMarkdown}
        environmentId={ctx.activeThreadEnvironmentId}
        threadRef={ctx.threadRef ?? undefined}
        cwd={ctx.markdownCwd}
        workspaceRoot={ctx.workspaceRoot}
        findActive={ctx.findActive}
      />
    </div>
  );
}

export function HtmlRenderTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "html-render" }>;
}) {
  const ctx = use(TimelineRowCtx);
  const { onAppFullscreenChange } = ctx;
  const onFullscreenChange = (fullscreen: boolean) => onAppFullscreenChange(row.id, fullscreen);

  if (ctx.renderHtmlRender) {
    return <div className="min-w-0 px-1">{ctx.renderHtmlRender(row)}</div>;
  }
  return (
    <div className="min-w-0 px-1">
      <HtmlRenderFrame
        key={row.htmlRender.attachmentId}
        environmentId={ctx.activeThreadEnvironmentId}
        htmlRender={row.htmlRender}
        threadRef={ctx.threadRef ?? undefined}
        onFullscreenChange={onFullscreenChange}
      />
    </div>
  );
}

export function McpAppTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "mcp-app" }> }) {
  const ctx = use(TimelineRowCtx);
  const { awaitingUser } = use(TimelineRowActivityCtx);

  return (
    <div className="min-w-0 px-1">
      <McpAppFrame
        key={row.mcpApp.attachmentId}
        environmentId={ctx.activeThreadEnvironmentId}
        threadId={row.sourceThreadId}
        conversationThreadId={ctx.threadRef?.threadId ?? row.sourceThreadId}
        itemId={row.itemId}
        revision={row.revision}
        app={row.mcpApp}
        onSendMessage={ctx.onSendAppMessage}
        awaitingUser={awaitingUser}
        onFullscreenChange={(fullscreen) => ctx.onAppFullscreenChange(row.id, fullscreen)}
      />
    </div>
  );
}

/** Images tools returned, loaded by index only when the row renders. */
export function ToolMediaTimelineRow({
  row,
}: {
  row: Extract<TimelineRow, { kind: "tool-media" }>;
}) {
  const ctx = use(TimelineRowCtx);
  // Tool images load from the environment; the guest page has no route for them.
  if (ctx.turnItemSource !== undefined) return null;
  const grid = row.images.length > 1;
  return (
    <div className="min-w-0 px-1">
      <MediaGrid
        caption={timelineMediaCaption(row.images)}
        items={row.images.map((image) => (
          <ChatMarkdownAssetImage
            key={`${image.resource.itemId}:${image.resource.index}`}
            environmentId={ctx.activeThreadEnvironmentId}
            resource={image.resource}
            alt={image.name}
            standalone={!grid}
            {...(grid
              ? {
                  framed: false,
                  className: MEDIA_GRID_IMAGE_CLASS_NAME,
                  style: MEDIA_GRID_IMAGE_STYLE,
                }
              : {})}
            onImageExpand={ctx.onImageExpand}
          />
        ))}
      />
    </div>
  );
}
