import {
  FULL_ACCESS_OVERRIDE_QUESTION,
  fullAccessOverrideExplanation,
} from "@marp/client-runtime/state/thread-requests";
import { HandIcon } from "lucide-react";
import { memo, use, useEffect, useEffectEvent, useState } from "react";
import { type PendingApproval } from "../../session-logic";
import { Badge } from "../ui/badge";
import { Kbd } from "../ui/kbd";
import { InlineButton } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";
import { ComposerPendingApprovalActions } from "./ComposerPendingApprovalActions";
import { ToolActivityIconView, type WorkEntryIconName } from "./TimelineToolActivityIcon";
import { BackgroundThreadContext } from "./backgroundThread";
import { approvalShortcutDecision, approvalShortcuts } from "./decisionCardKeys";
import { FileEditCard } from "./TimelineWorkEvents";
import { TimelineRowCtx } from "./timelineRowContext";

const APPROVAL_PRESENTATION = {
  command: { icon: "terminal", label: "Command approval", detailLabel: "Command" },
  "file-change": { icon: "square-pen", label: "File change approval", detailLabel: "File change" },
  "file-read": { icon: "eye", label: "File read approval", detailLabel: "File to read" },
  permission: {
    icon: "wrench",
    label: "App permission approval",
    detailLabel: "Permission request",
  },
  "mcp-elicitation": {
    icon: "hammer",
    label: "App access approval",
    detailLabel: "App access request",
  },
} satisfies Record<
  PendingApproval["requestKind"],
  { icon: WorkEntryIconName; label: string; detailLabel: string }
>;

const APPROVAL_TITLE = {
  command: "Run a command",
  "file-change": "Change files",
  "file-read": "Read a file",
  permission: "Grant an app permission",
  "mcp-elicitation": "Give an app access",
} satisfies Record<PendingApproval["requestKind"], string>;

/** A decision card: what the agent wants, why, and the answers, in one place. */
export const TimelinePendingApprovalRow = memo(function TimelinePendingApprovalRow({
  approval,
}: {
  approval: PendingApproval;
}) {
  const {
    pendingApprovals,
    approvalEditEntries,
    respondingRequestIds,
    canOperateThread,
    onRespondToApproval,
  } = use(TimelineRowCtx);
  const editEntry = approvalEditEntries.get(approval.requestId);
  const [editExpanded, setEditExpanded] = useState(false);
  const backgroundThread = use(BackgroundThreadContext);
  const presentation = APPROVAL_PRESENTATION[approval.requestKind];
  const canRespond = approval.responseCapability === "live";
  const isResponding = respondingRequestIds.includes(approval.requestId);
  // Only the oldest waiting approval answers to Enter and Esc.
  const shortcuts = approvalShortcuts(approval.options);
  const ownsShortcuts =
    (shortcuts.approve || shortcuts.decline) &&
    canRespond &&
    canOperateThread &&
    onRespondToApproval !== undefined &&
    !backgroundThread &&
    !isResponding &&
    pendingApprovals.keys().next().value === approval.requestId;
  const respondFromShortcut = useEffectEvent((event: KeyboardEvent) => {
    const decision = approvalShortcutDecision(event, approval.options);
    if (decision === null || onRespondToApproval === undefined) return;
    event.preventDefault();
    void onRespondToApproval(approval.requestId, decision);
  });
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- listens on the document for Enter and Esc while this card owns the decision keys
  useEffect(() => {
    if (!ownsShortcuts) return;
    const handler = (event: KeyboardEvent) => respondFromShortcut(event);
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [ownsShortcuts]);
  const decision = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted-foreground">
        {approval.reason ? (
          <span className="select-text wrap-anywhere">{approval.reason}</span>
        ) : null}
        {ownsShortcuts ? (
          <span className="flex items-center gap-1.5">
            {shortcuts.approve ? (
              <span>
                <Kbd>Enter</Kbd> approves
              </span>
            ) : null}
            {shortcuts.approve && shortcuts.decline ? <span aria-hidden>·</span> : null}
            {shortcuts.decline ? (
              <span>
                <Kbd>Esc</Kbd> declines
              </span>
            ) : null}
          </span>
        ) : null}
        {canRespond ? null : (
          <span className="text-warning-foreground">
            Provider process is gone. Interrupt or restart the run to respond.
          </span>
        )}
        {approval.fullAccessOverride ? (
          <Popover>
            <PopoverTrigger openOnHover render={<InlineButton tone="muted" />}>
              {FULL_ACCESS_OVERRIDE_QUESTION}
            </PopoverTrigger>
            <PopoverPopup
              aria-label={FULL_ACCESS_OVERRIDE_QUESTION}
              tooltipStyle
              side="top"
              className="max-w-[min(22rem,calc(100vw-2rem))] whitespace-normal"
            >
              {fullAccessOverrideExplanation(approval.fullAccessOverride)}
            </PopoverPopup>
          </Popover>
        ) : null}
      </div>
      {canRespond && onRespondToApproval ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ComposerPendingApprovalActions
            requestId={approval.requestId}
            disabled={!canOperateThread}
            isResponding={isResponding}
            canRespond={canRespond}
            options={approval.options}
            onRespondToApproval={onRespondToApproval}
          />
        </div>
      ) : null}
    </div>
  );
  if (editEntry) {
    return (
      <div
        role="group"
        aria-label={presentation.label}
        data-v2-item-type="approval_request"
        className="my-2"
      >
        <FileEditCard
          workEntry={editEntry}
          live={false}
          shimmer={false}
          expanded={editExpanded}
          onToggleExpanded={() => setEditExpanded((value) => !value)}
          footer={
            <div className="flex min-w-0 flex-col gap-2 px-3 pt-1 pb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-warning-foreground">
                <HandIcon aria-hidden className="size-3.5" />
                Approval needed
              </span>
              {decision}
            </div>
          }
        />
      </div>
    );
  }
  return (
    <div
      role="group"
      aria-label={presentation.label}
      data-v2-item-type="approval_request"
      className="my-2 flex min-w-0 flex-col gap-3 rounded-card bg-card px-5 py-4 shadow-raised"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Badge variant="warning">
          <HandIcon aria-hidden />
          Approval needed
        </Badge>
        {approval.appName ? (
          <span className="ms-auto min-w-0 truncate text-xs text-muted-foreground">
            {approval.appName}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-foreground">
        <ToolActivityIconView
          icon={undefined}
          fallbackName={presentation.icon}
          className="block size-4 shrink-0 stroke-2 text-icon-muted"
          muted
        />
        {APPROVAL_TITLE[approval.requestKind]}
      </div>
      <code
        aria-label={presentation.detailLabel}
        className="block max-h-40 min-w-0 overflow-auto rounded-field bg-muted px-3 py-2.5 font-mono text-sm leading-5 whitespace-pre-wrap text-foreground select-text! wrap-anywhere [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
        data-approval-detail="complete"
        tabIndex={0}
      >
        {approval.detail || presentation.label}
      </code>
      {decision}
    </div>
  );
});
