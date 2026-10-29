import { useAtomValue } from "@effect/atom-react";
import { scopedThreadKey, scopeThreadRef } from "@marp/client-runtime/environment";
import type { EnvironmentThreadShell } from "@marp/client-runtime/state/models";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@marp/client-runtime/state/runtime";
import {
  buildStopThreadsPreview,
  planStopThreads,
  runStopThreadsPlan,
  stopThreadsConfirmTitle,
  threadIsStoppable,
  summarizeStopThreads,
  type StopThreadsPlan,
} from "@marp/client-runtime/state/stop-threads";
import { AuthOrchestrationOperateScope, type EnvironmentId } from "@marp/contracts";
import { create } from "zustand";

import { appAtomRegistry } from "../rpc/atomRegistry";
import {
  readThreadShells,
  useProjects,
  useServerConfigs,
  useThreadShells,
} from "../state/entities";
import { environmentPresentations } from "../state/presentation";
import { readEnvironmentScope, useEnvironmentsWithScope } from "../state/session";
import { liveShellEnvironmentIdsAtom } from "../state/shell";
import { threadEnvironment } from "../state/threads";
import { useOrchestrationCommand } from "../state/use-orchestration-command";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { toastManager } from "./ui/toast";

type ServerConfigs = ReturnType<typeof useServerConfigs>;

/** `null` stops every running thread; a set stops only those scoped thread keys. */
type StopThreadsScope = ReadonlySet<string> | null;

const useStopThreadsDialogStore = create<{
  readonly open: boolean;
  readonly scope: StopThreadsScope;
}>(() => ({ open: false, scope: null }));

function planFor(
  threads: ReadonlyArray<EnvironmentThreadShell>,
  scope: StopThreadsScope,
  live: ReadonlySet<EnvironmentId>,
  canStop: (environmentId: EnvironmentId) => boolean,
  serverConfigs: ServerConfigs,
): StopThreadsPlan<EnvironmentThreadShell> {
  // Cached shells of a disconnected machine can still say "running", so only live ones count.
  const liveThreads = threads.filter((thread) => live.has(thread.environmentId));
  const inScope = (thread: EnvironmentThreadShell) =>
    scope === null ||
    scope.has(scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id))) ||
    // Idle threads stay in, so a selected child can still find its running ancestor.
    !threadIsStoppable(thread);
  return planStopThreads(liveThreads.filter(inScope), {
    canStop,
    cascades: (environmentId) =>
      serverConfigs.get(environmentId)?.environment.capabilities.threadStop === true,
  });
}

/** For menus built in event handlers. */
export function readStopThreadsPlan(scope: StopThreadsScope) {
  return planFor(
    readThreadShells(),
    scope,
    appAtomRegistry.get(liveShellEnvironmentIdsAtom),
    (environmentId) => readEnvironmentScope(environmentId, AuthOrchestrationOperateScope),
    appAtomRegistry.get(environmentPresentations.serverConfigsAtom),
  );
}

export function useStopThreadsPlan(scope: StopThreadsScope) {
  const threads = useThreadShells();
  const live = useAtomValue(liveShellEnvironmentIdsAtom);
  const serverConfigs = useServerConfigs();
  const permitted = useEnvironmentsWithScope(
    [...live].map((environmentId) => ({ environmentId })),
    AuthOrchestrationOperateScope,
  );
  return planFor(
    threads,
    scope,
    live,
    (environmentId) => permitted.has(environmentId),
    serverConfigs,
  );
}

export function openStopThreadsDialog(scope: StopThreadsScope = null): void {
  const plan = readStopThreadsPlan(scope);
  if (plan.running.length === 0) {
    toastManager.add({
      type: "info",
      title:
        plan.skipped.length > 0
          ? "This connection can't stop the running threads"
          : "No threads are running",
    });
    return;
  }
  useStopThreadsDialogStore.setState({ open: true, scope });
}

function readEnvironmentLabel(environmentId: EnvironmentId): string {
  return (
    appAtomRegistry.get(environmentPresentations.presentationsAtom).get(environmentId)?.entry.target
      .label ?? "another machine"
  );
}

/** Mounted once in the app shell, so a stop keeps running after the dialog closes. */
export function StopThreadsDialog() {
  const open = useStopThreadsDialogStore((state) => state.open);
  const scope = useStopThreadsDialogStore((state) => state.scope);
  const interruptTurn = useOrchestrationCommand(threadEnvironment.interruptTurn, {
    reportFailure: false,
  });
  const stop = async (plan: StopThreadsPlan<EnvironmentThreadShell>) => {
    useStopThreadsDialogStore.setState({ open: false });
    const outcome = await runStopThreadsPlan(plan, async (thread) => {
      const result = await interruptTurn({
        environmentId: thread.environmentId,
        input: { threadId: thread.id },
      });
      if (result._tag !== "Failure") return null;
      if (isAtomCommandInterrupted(result)) return "The stop was cancelled.";
      const error = squashAtomCommandFailure(result);
      return error instanceof Error ? error.message : "Failed to stop the thread.";
    });
    const summary = summarizeStopThreads(outcome, readEnvironmentLabel);
    toastManager.add({
      type: summary.type,
      title: summary.title,
      ...(summary.description === null ? {} : { description: summary.description }),
    });
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => useStopThreadsDialogStore.setState({ open: next })}
    >
      <AlertDialogPopup finalFocus={(closeType) => closeType === "keyboard"}>
        {/* Only an open dialog subscribes to every thread shell. */}
        {open ? <StopThreadsDialogContent scope={scope} onStop={stop} /> : null}
      </AlertDialogPopup>
    </AlertDialog>
  );
}

function StopThreadsDialogContent(props: {
  scope: StopThreadsScope;
  onStop: (plan: StopThreadsPlan<EnvironmentThreadShell>) => void;
}) {
  const plan = useStopThreadsPlan(props.scope);
  const projects = useProjects();
  const presentations = useAtomValue(environmentPresentations.presentationsAtom);
  const label = (environmentId: EnvironmentId) =>
    presentations.get(environmentId)?.entry.target.label ?? "Unknown machine";
  const projectTitle = (thread: EnvironmentThreadShell) =>
    projects.find(
      (project) =>
        project.environmentId === thread.environmentId && project.id === thread.projectId,
    )?.title ?? null;
  const preview = buildStopThreadsPreview(plan.running);
  const count = plan.running.length;
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {count === 0 ? "Nothing to stop" : stopThreadsConfirmTitle(count)}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {count === 0
            ? "These threads finished on their own."
            : "Each agent stops its current turn."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {count > 0 || plan.skipped.length > 0 ? (
        <div className="flex flex-col gap-3 px-6 pb-4">
          {preview.groups.map((group) => (
            <div key={group.environmentId} className="flex flex-col">
              {preview.multipleEnvironments ? (
                <p className="pb-1 text-muted-foreground text-xs font-medium">
                  {label(group.environmentId)}
                </p>
              ) : null}
              <ul className="flex flex-col">
                {group.threads.map((thread) => {
                  const project = projectTitle(thread);
                  return (
                    <li
                      key={thread.id}
                      className="flex h-8 min-w-0 items-center gap-3 border-b border-border/50 text-sm last:border-b-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {thread.title || "Untitled thread"}
                      </span>
                      {project !== null ? (
                        <span className="max-w-40 shrink-0 truncate text-muted-foreground text-xs">
                          {project}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {preview.more > 0 ? (
            <p className="text-muted-foreground text-sm">+{preview.more} more</p>
          ) : null}
          {plan.skipped.map(({ environmentId, count: skipped }) => (
            <p key={environmentId} className="text-muted-foreground text-sm">
              {skipped} on {label(environmentId)} {skipped === 1 ? "stays" : "stay"} running: this
              connection can't stop threads there.
            </p>
          ))}
        </div>
      ) : null}
      <AlertDialogFooter>
        <AlertDialogClose render={<Button variant="outline" />}>
          {count === 0 ? "Close" : "Cancel"}
        </AlertDialogClose>
        {count > 0 ? (
          <Button variant="destructive" onClick={() => props.onStop(plan)}>
            {props.scope === null ? "Stop all" : "Stop"}
          </Button>
        ) : null}
      </AlertDialogFooter>
    </>
  );
}
