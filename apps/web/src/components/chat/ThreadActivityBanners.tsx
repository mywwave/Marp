import type {
  OrchestrationV2PendingBackgroundTask,
  OrchestrationV2ProviderGoal,
  ThreadId,
} from "@marp/contracts";
import type { EnvironmentThreadShell, ThreadStructure } from "@marp/client-runtime/state/shell";
import { presentProviderGoal } from "@marp/client-runtime/state/thread-execution";
import {
  summarizeBackgroundTasks,
  type BackgroundTaskRow,
} from "@marp/client-runtime/work-log/live-cards";
import { childThreadInputsTitle } from "@marp/client-runtime/state/threads";
import { formatDuration } from "@marp/shared/orchestrationTiming";
import {
  ActivityIcon,
  BotIcon,
  CheckIcon,
  CircleDashedIcon,
  GitBranchIcon,
  MessageCircleIcon,
  ShieldQuestionIcon,
  TargetIcon,
  TerminalIcon,
} from "lucide-react";
import { Fragment } from "react";
import { tickTextContent } from "~/lib/tickTextContent";
import { cn } from "~/lib/utils";
import { Button, InlineButton } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { ComposerBannerStackItem } from "./ComposerBannerStack";
import type { ThreadNowItem } from "./ThreadNow";

/** Subagents waiting on the user, unless the parent is itself waiting on them. */
export function childInputNowItem(input: {
  readonly childThreadInputs: ReadonlyArray<EnvironmentThreadShell>;
  readonly parentAwaitingUser: boolean;
  readonly onOpenThread: (threadId: ThreadId) => void;
}): ThreadNowItem | null {
  const { childThreadInputs, onOpenThread } = input;
  const first = childThreadInputs[0];
  if (!first || input.parentAwaitingUser) return null;
  return {
    id: `child-input:${first.id}`,
    // The only line at the end of the timeline that needs you gets the info color.
    icon: first.hasPendingApprovals ? (
      <ShieldQuestionIcon className="text-info-foreground" />
    ) : (
      <MessageCircleIcon className="text-info-foreground" />
    ),
    title: childThreadInputsTitle(childThreadInputs),
    description: childThreadInputs.map((child, index) => (
      <Fragment key={child.id}>
        {index > 0 ? " " : null}
        <span className="whitespace-nowrap">
          <InlineButton tone="muted" onClick={() => onOpenThread(child.id)}>
            {child.title}
          </InlineButton>
          {index < childThreadInputs.length - 1 ? "," : null}
        </span>
      </Fragment>
    )),
    actions: (
      <InlineButton onClick={() => onOpenThread(first.id)}>
        {first.hasPendingApprovals ? "Open approval" : "Open question"}
      </InlineButton>
    ),
  };
}

/** The thread's goal, for the end of the timeline. */
export function goalNowItem(input: {
  readonly threadId: ThreadId;
  readonly goal: OrchestrationV2ProviderGoal;
  readonly isWorking: boolean;
  readonly onSendCommand: (text: string, failureMessage: string) => Promise<void>;
}): ThreadNowItem {
  const { isWorking, onSendCommand } = input;
  const presentation = presentProviderGoal(input.goal, isWorking);
  return {
    id: `goal:${input.threadId}`,
    icon: <TargetIcon />,
    title:
      presentation.usage === null
        ? presentation.title
        : `${presentation.title} · ${presentation.usage}`,
    description: presentation.objective,
    // Clear stops goal work; Resume would stop unrelated work, so it waits.
    actions: (
      <>
        {presentation.canResume && !isWorking ? (
          <>
            <InlineButton
              onClick={() => void onSendCommand("/goal resume", "Failed to resume goal.")}
            >
              Resume
            </InlineButton>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <InlineButton
          tone="muted"
          onClick={() => void onSendCommand("/goal clear", "Failed to clear goal.")}
        >
          Clear
        </InlineButton>
      </>
    ),
  };
}

/** Background commands and subagents, for the end of the timeline. */
export function backgroundWorkNowItem(input: {
  readonly threadId: ThreadId;
  readonly tasks: ReadonlyArray<OrchestrationV2PendingBackgroundTask>;
  readonly turnItems: ThreadStructure["turnItems"];
  readonly stopDisabled: boolean;
  readonly stopping: boolean;
  readonly onStop: () => Promise<void>;
  readonly onOpenThread: (threadId: ThreadId) => void;
}): ThreadNowItem | null {
  const { onOpenThread } = input;
  const summary = summarizeBackgroundTasks(input.tasks, input.turnItems);
  if (summary === null) return null;
  const running = summary.rows.filter((row) => row.state === "running");
  const [only] = running.length === 1 ? running : [];
  const withActivity = running.find((row) => row.activity !== null);
  const onlyThreadId = only?.childThreadId;
  const startedAt = only?.startedAt ?? null;
  return {
    id: `background-work:${input.threadId}`,
    icon: running.every((row) => row.kind !== "subagent") ? <TerminalIcon /> : <CircleDashedIcon />,
    title: summary.title,
    description: only
      ? [only.label, only.activity].filter((part) => part !== null).join(" · ")
      : withActivity
        ? `${withActivity.label}: ${withActivity.activity}`
        : running.map((row) => row.label).join(", "),
    actions: (
      <>
        {startedAt === null ? null : <ElapsedSince startedAt={startedAt} />}
        {onlyThreadId === undefined ? null : (
          <InlineButton tone="muted" onClick={() => onOpenThread(onlyThreadId)}>
            Open
          </InlineButton>
        )}
        <InlineButton disabled={input.stopDisabled} onClick={() => void input.onStop()}>
          {input.stopping ? "Stopping..." : "Stop"}
        </InlineButton>
      </>
    ),
    details: <BackgroundTaskList rows={summary.rows} onOpenThread={onOpenThread} />,
  };
}

function ElapsedSince({ startedAt }: { readonly startedAt: string }) {
  const startedAtMs = Date.parse(startedAt);
  return (
    <span
      ref={tickTextContent((nowMs) => formatDuration(Math.max(1_000, nowMs - startedAtMs)), true)}
      className="tabular-nums"
    />
  );
}

const BACKGROUND_KIND_ICONS = {
  subagent: BotIcon,
  command: TerminalIcon,
  monitor: ActivityIcon,
  background_task: CircleDashedIcon,
} as const;

const BACKGROUND_STATE_LABELS = { done: "Done", failed: "Failed", stopped: "Stopped" } as const;

function BackgroundTaskList({
  rows,
  onOpenThread,
}: {
  readonly rows: ReadonlyArray<BackgroundTaskRow>;
  readonly onOpenThread: (threadId: ThreadId) => void;
}) {
  return (
    <ul aria-label="Background tasks" className="flex flex-col">
      {rows.map((row) => {
        const Icon = BACKGROUND_KIND_ICONS[row.kind];
        const childThreadId = row.childThreadId;
        return (
          <li key={row.id} className="flex h-6 min-w-0 items-center gap-1.5">
            <Icon aria-hidden />
            <span
              className={cn(
                "min-w-0 truncate",
                row.kind === "command" && row.state === "running" && "font-mono",
              )}
            >
              {row.label}
            </span>
            <span className="ms-auto flex shrink-0 items-center gap-2.5">
              {row.state === "running" ? (
                row.startedAt === null ? (
                  "Running"
                ) : (
                  <ElapsedSince startedAt={row.startedAt} />
                )
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    row.state === "failed" && "text-destructive",
                  )}
                >
                  {row.state === "done" ? <CheckIcon aria-hidden /> : null}
                  {BACKGROUND_STATE_LABELS[row.state]}
                </span>
              )}
              {childThreadId === undefined ? null : (
                <InlineButton tone="muted" onClick={() => onOpenThread(childThreadId)}>
                  Open
                </InlineButton>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The local checkout moved off the branch this thread last ran on. */
export function branchMismatchBannerItem(input: {
  readonly mismatchKey: string;
  readonly mismatch: { readonly threadBranch: string; readonly currentBranch: string };
  readonly restoreDisabled: boolean;
  readonly restoring: boolean;
  readonly onRestore: () => void;
  readonly onDismiss: () => void;
}): ComposerBannerStackItem {
  const { mismatch } = input;
  return {
    id: `branch-mismatch:${input.mismatchKey}`,
    variant: "info",
    icon: <GitBranchIcon />,
    title: (
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="shrink-0 font-normal text-muted-foreground">Branch changed from</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <code className="min-w-0 truncate font-medium text-foreground">
                {mismatch.threadBranch}
              </code>
            }
          />
          <TooltipPopup side="top">
            This thread last ran on {mismatch.threadBranch}. Sending will continue on{" "}
            {mismatch.currentBranch}.
          </TooltipPopup>
        </Tooltip>
      </span>
    ),
    actions: (
      <Button size="xs" variant="ghost" disabled={input.restoreDisabled} onClick={input.onRestore}>
        {input.restoring ? "Restoring..." : "Restore branch"}
      </Button>
    ),
    dismissLabel: "Dismiss branch change notice",
    onDismiss: input.onDismiss,
  };
}
