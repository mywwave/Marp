import { WorkLogBlock } from "./WorkLog";
import { scopeThreadRef } from "@marp/client-runtime/environment";
import { useAtomValue } from "@effect/atom-react";
import { environmentThreadDetails } from "../../state/threads";
import {
  subagentGroupSummary,
  summarizeSubagentStatuses,
} from "@marp/client-runtime/state/subagent-display";
import { memo, use, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "../ui/collapsible";
import { EnvironmentSubagentAvatar, SubagentElapsed, V2LifecycleRow } from "./V2LifecycleRow";
import { LinkRequestCard } from "./LinkRequestCard";
import { SecretRequestCard } from "./SecretRequestCard";
import { TimelineRowCtx, type TimelineRow } from "./timelineRowContext";
import { subagentGroupTiming } from "./TimelineV2EventRow.logic";
import { SubagentTaskRow } from "./SubagentTaskCard";
import type { OrchestrationV2TurnItem } from "@marp/contracts";

export function V2EventTimelineRow({ row }: { row: Extract<TimelineRow, { kind: "event" }> }) {
  const ctx = use(TimelineRowCtx);
  const { item, visibility } = row.projectedItem;
  if (item.type === "subagent" && (row.subagents?.length ?? 1) > 1) {
    return <V2SubagentGroup key={row.id} row={row} />;
  }
  if (item.type === "subagent" && subagentShowsAsCard(item)) {
    return (
      <div data-subagent-task-card className="py-1">
        <SubagentRows members={[item]} />
      </div>
    );
  }
  if (item.type === "secret_request") {
    return (
      <SecretRequestCard
        environmentId={ctx.activeThreadEnvironmentId}
        item={item}
        visibility={visibility}
      />
    );
  }
  if (item.type === "link_request") {
    return (
      <LinkRequestCard
        environmentId={ctx.activeThreadEnvironmentId}
        item={item}
        visibility={visibility}
      />
    );
  }
  return (
    <V2LifecycleRow
      environmentId={ctx.activeThreadEnvironmentId}
      item={item}
      resourceSummary={row.resourceSummary}
      runs={ctx.runs}
      onOpenThread={ctx.onOpenThread}
    />
  );
}

// A task running in a linked environment opens there, so it keeps the linking row.
function subagentShowsAsCard(
  item: Extract<OrchestrationV2TurnItem, { readonly type: "subagent" }>,
) {
  return item.remoteChild === undefined || item.childThreadId !== null;
}

const V2SubagentGroup = memo(function V2SubagentGroup({
  row,
}: {
  row: Extract<TimelineRow, { kind: "event" }>;
}) {
  const ctx = use(TimelineRowCtx);
  // Open by default; the set remembers the groups the user folded.
  const foldedId = `subagent-group-folded:${row.id}`;
  const [expanded, setExpanded] = useState(
    () => !ctx.workGroupViewState.expandedEntries.has(foldedId),
  );
  const members = (row.subagents ?? [row.projectedItem]).flatMap(({ item }) =>
    item.type === "subagent" ? [item] : [],
  );
  const liveAgents = useAtomValue(
    environmentThreadDetails.threadAtom(
      scopeThreadRef(ctx.activeThreadEnvironmentId, row.projectedItem.item.threadId),
    ),
    (thread) => thread?.projection.subagents,
  );
  const agents = members.map((item) => {
    const live = liveAgents?.find((agent) => agent.id === item.subagentId);
    return {
      item,
      status: live?.status ?? item.status,
      startedAt: live?.startedAt ?? item.startedAt,
      completedAt: live?.completedAt ?? item.completedAt,
    };
  });
  const summary = subagentGroupSummary(agents);
  const label = `${members.length} subagents`;
  const statusSummary = summarizeSubagentStatuses(agents.map(({ status }) => status));
  const toggleExpanded = (open: boolean) => {
    ctx.onToggleWorkEntry(row.id, expanded);
    if (open) ctx.workGroupViewState.expandedEntries.delete(foldedId);
    else ctx.workGroupViewState.expandedEntries.add(foldedId);
    setExpanded(open);
  };
  return (
    <WorkLogBlock continues={row.continuesWorkLog}>
      <Collapsible
        open={expanded}
        onOpenChange={toggleExpanded}
        data-subagent-task-card
        className="my-1"
      >
        <CollapsibleTrigger
          aria-label={label}
          aria-description={statusSummary}
          className="flex h-7 w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm px-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70"
        >
          <span className="flex shrink-0 items-center -space-x-1.5" aria-hidden>
            {agents.slice(0, 3).map(({ item }) => (
              <EnvironmentSubagentAvatar
                key={item.id}
                environmentId={ctx.activeThreadEnvironmentId}
                providerInstanceId={item.providerInstanceId}
                driver={item.driver}
                remote={item.remoteChild}
              />
            ))}
          </span>
          <span className={cn("min-w-0 truncate", summary.failed && "text-destructive")}>
            {label} · {statusSummary}
          </span>
          <span className="ms-auto shrink-0 tabular-nums">
            <SubagentElapsed agent={subagentGroupTiming(agents)} />
          </span>
          <ChevronDownIcon
            aria-hidden
            className={cn("size-3.5 shrink-0 transition-transform", !expanded && "-rotate-90")}
          />
        </CollapsibleTrigger>
        {/* Virtualized rows must settle before disclosure scroll anchoring resumes. */}
        <CollapsiblePanel animate={false}>
          {expanded ? <SubagentRows members={members} /> : null}
        </CollapsiblePanel>
      </Collapsible>
    </WorkLogBlock>
  );
});

function SubagentRows({
  members,
}: {
  members: ReadonlyArray<Extract<OrchestrationV2TurnItem, { readonly type: "subagent" }>>;
}) {
  const ctx = use(TimelineRowCtx);
  return (
    <div className="flex flex-col">
      {members.map((item) =>
        subagentShowsAsCard(item) ? (
          <SubagentTaskRow
            key={item.id}
            item={item}
            environmentId={ctx.activeThreadEnvironmentId}
            onOpenThread={ctx.onOpenThread}
          />
        ) : (
          <V2LifecycleRow
            environmentId={ctx.activeThreadEnvironmentId}
            key={item.id}
            item={item}
            runs={ctx.runs}
            onOpenThread={ctx.onOpenThread}
          />
        ),
      )}
    </div>
  );
}
