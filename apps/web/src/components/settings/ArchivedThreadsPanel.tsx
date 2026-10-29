import { settingsScopeEnvironmentLabels } from "./settingsScopeAxis";
import { Spinner } from "~/components/ui/spinner";
import { ArchiveIcon, ArchiveRestoreIcon, EyeIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { type ScopedThreadRef } from "@marp/contracts";
import { scopedThreadKey, scopeThreadRef } from "@marp/client-runtime/environment";
import { presentThreadShell } from "@marp/client-runtime/state/shell";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@marp/client-runtime/state/runtime";
import { useSettingsScope } from "./SettingsScopeContext";
import { confirmDestructiveAction } from "../../confirmDialog";
import { useThreadActions } from "../../hooks/useThreadActions";
import { useNowMinute } from "../../hooks/useNowMinute";
import { useArchivedThreadSnapshots } from "../../lib/archivedThreadsState";
import { buildThreadRouteParams } from "../../threadRoutes";
import { RelativeTime } from "../RelativeTime";
import { deleteSelectedThreadEntries } from "../Sidebar.logic";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import {
  filterArchivedThreads,
  groupArchivedThreadsByRecency,
  toggleAllVisibleArchived,
  toggleArchivedSelection,
} from "./ArchivedThreadsPanel.logic";

function failureToast(title: string, result: Parameters<typeof squashAtomCommandFailure>[0]) {
  const error = squashAtomCommandFailure(result);
  toastManager.add(
    stackedThreadToast({
      type: "error",
      title,
      description: error instanceof Error ? error.message : "An error occurred.",
    }),
  );
}

export function ArchivedThreadsPanel() {
  const { scope, groups: projectGroups, environments } = useSettingsScope();
  const { unarchiveThread, deleteThread } = useThreadActions();
  const navigate = useNavigate();
  const nowMinute = useNowMinute();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [isBusy, setIsBusy] = useState(false);
  const {
    snapshots: archivedSnapshots,
    error: archiveError,
    isLoading: isLoadingArchive,
    refresh: refreshArchivedThreads,
  } = useArchivedThreadSnapshots(scope.environmentIds);

  const { threads: archivedThreads, hasMultipleEnvironments } = (() => {
    const selectedProjectKeys =
      scope.kind === "project" || scope.kind === "checkout"
        ? new Set(scope.members.map((member) => `${member.environmentId}:${member.id}`))
        : null;
    const projectsByEnvironmentAndId = new Map(
      archivedSnapshots.flatMap(({ environmentId, snapshot }) =>
        snapshot.projects
          .filter(
            (project) =>
              selectedProjectKeys === null ||
              selectedProjectKeys.has(`${environmentId}:${project.id}`),
          )
          .map((project) => [`${environmentId}:${project.id}`, project] as const),
      ),
    );
    const environmentLabels = new Map(
      environments.map((environment) => {
        const { primary, secondary } = settingsScopeEnvironmentLabels(environment, environments);
        return [environment.environmentId, secondary ? `${primary} (${secondary})` : primary];
      }),
    );
    const scopedThreads = archivedSnapshots.flatMap(({ environmentId, snapshot }) =>
      snapshot.threads.flatMap((thread) => {
        const project = projectsByEnvironmentAndId.get(`${environmentId}:${thread.projectId}`);
        return project ? [{ shell: presentThreadShell(environmentId, thread), project }] : [];
      }),
    );
    const hasMultipleEnvironments =
      new Set(scopedThreads.map(({ shell }) => shell.environmentId)).size > 1;
    const logicalTitles = new Map(
      projectGroups.flatMap((group) =>
        group.memberProjectRefs.map(
          (member) => [`${member.environmentId}:${member.projectId}`, group.displayName] as const,
        ),
      ),
    );
    const threads = scopedThreads
      .map(({ shell, project }) => {
        const ref = scopeThreadRef(shell.environmentId, shell.id);
        return {
          key: scopedThreadKey(ref),
          ref,
          title: shell.title,
          projectTitle:
            (hasMultipleEnvironments
              ? logicalTitles.get(`${shell.environmentId}:${shell.projectId}`)
              : undefined) ?? project.title,
          environmentLabel: environmentLabels.get(shell.environmentId) ?? shell.environmentId,
          archivedAt: shell.archivedAt ?? shell.createdAt,
        };
      })
      .toSorted(
        (left, right) =>
          right.archivedAt.localeCompare(left.archivedAt) || right.key.localeCompare(left.key),
      );
    return { threads, hasMultipleEnvironments };
  })();

  const visibleThreads = filterArchivedThreads(archivedThreads, query);
  const visibleKeys = visibleThreads.map((thread) => thread.key);
  // Bulk actions only touch what the user can see; a search hides rows from the selection.
  const selectedThreads = visibleThreads.filter((thread) => selected.has(thread.key));
  const selectedCount = selectedThreads.length;
  const groups = groupArchivedThreadsByRecency(visibleThreads, nowMinute);

  const finishAction = (handledKeys: ReadonlyArray<string>) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const key of handledKeys) next.delete(key);
      return next;
    });
    refreshArchivedThreads();
  };

  const unarchive = async (threads: ReadonlyArray<{ key: string; ref: ScopedThreadRef }>) => {
    setIsBusy(true);
    const handled: string[] = [];
    for (const thread of threads) {
      const result = await unarchiveThread(thread.ref);
      if (result._tag === "Success") {
        handled.push(thread.key);
        continue;
      }
      if (isAtomCommandInterrupted(result)) break;
      failureToast(
        threads.length === 1 ? "Failed to unarchive thread" : "Failed to unarchive threads",
        result,
      );
      break;
    }
    setIsBusy(false);
    finishAction(handled);
  };

  const remove = async (
    threads: ReadonlyArray<{ key: string; ref: ScopedThreadRef; title: string }>,
  ) => {
    const count = threads.length;
    const confirmed = await confirmDestructiveAction(
      count === 1
        ? {
            title: `Delete “${threads[0]!.title}”?`,
            description: "Its conversation history is cleared for good. You can't undo this.",
            confirmLabel: "Delete thread",
          }
        : {
            title: `Delete ${count} archived threads?`,
            description: "Their conversation history is cleared for good. You can't undo this.",
            confirmLabel: `Delete ${count} threads`,
          },
    );
    if (!confirmed) return;
    setIsBusy(true);
    const byKey = new Map(threads.map((thread) => [thread.key, thread.ref]));
    const { deletedThreadKeys, firstFailure } = await deleteSelectedThreadEntries({
      entries: threads.map((thread) => ({ threadKey: thread.key })),
      delete: async ({ threadKey }, deletedThreadKeys) => {
        const ref = byKey.get(threadKey);
        return ref ? deleteThread(ref, { deletedThreadKeys }) : null;
      },
    });
    setIsBusy(false);
    if (firstFailure !== null) {
      failureToast(
        count === 1 ? "Failed to delete thread" : "Failed to delete threads",
        firstFailure,
      );
    }
    finishAction([...deletedThreadKeys]);
  };

  if (archivedThreads.length === 0) {
    return (
      <SettingsPageContainer>
        <SettingsSection
          id={isLoadingArchive ? undefined : searchableSetting("archive").id}
          title={searchableSetting("archive").title}
        >
          <SettingsRow
            title={
              <span className="inline-flex items-center gap-2">
                {isLoadingArchive ? (
                  <Spinner size="sm" tone="muted" />
                ) : (
                  <ArchiveIcon className="size-3.5 text-muted-foreground" />
                )}
                {isLoadingArchive
                  ? "Loading archived threads"
                  : archiveError
                    ? "Could not load archived threads"
                    : "No archived threads"}
              </span>
            }
            description={
              isLoadingArchive
                ? "Checking connected environments."
                : (archiveError ?? "Archived threads will appear here.")
            }
          />
        </SettingsSection>
      </SettingsPageContainer>
    );
  }

  const allVisibleSelected = visibleKeys.length > 0 && selectedCount === visibleKeys.length;

  return (
    <SettingsPageContainer>
      <div className="flex flex-wrap items-center gap-3 px-3 sm:px-4">
        <Checkbox
          aria-label="Select all shown threads"
          checked={allVisibleSelected}
          indeterminate={selectedCount > 0 && !allVisibleSelected}
          disabled={visibleKeys.length === 0 || isBusy}
          onCheckedChange={() => setSelected(toggleAllVisibleArchived(selected, visibleKeys))}
        />
        <InputGroup className="min-w-0 flex-1 basis-48">
          <InputGroupAddon>
            <SearchIcon aria-hidden className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              if (query.length > 0) setQuery("");
              else event.currentTarget.blur();
            }}
            placeholder="Search archived threads"
            aria-label="Search archived threads"
          />
        </InputGroup>
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {selectedCount} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => void unarchive(selectedThreads)}
            >
              <ArchiveRestoreIcon />
              Unarchive
            </Button>
            <Button
              size="sm"
              variant="destructive-outline"
              disabled={isBusy}
              onClick={() => void remove(selectedThreads)}
            >
              <Trash2Icon />
              Delete…
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground tabular-nums">
            {archivedThreads.length === 1 ? "1 thread" : `${archivedThreads.length} threads`}
          </span>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground sm:px-4">
          No archived threads match “{query.trim()}”.
        </p>
      ) : (
        groups.map((group, index) => (
          <SettingsSection
            key={group.label}
            id={index === 0 ? searchableSetting("archive").id : undefined}
            title={group.label}
          >
            {group.threads.map((thread) => (
              <div
                key={thread.key}
                className="group/archived-row flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 sm:px-4"
              >
                <Checkbox
                  aria-label={`Select ${thread.title}`}
                  checked={selected.has(thread.key)}
                  disabled={isBusy}
                  onCheckedChange={() =>
                    setSelected((current) => toggleArchivedSelection(current, thread.key))
                  }
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-foreground">{thread.title}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {thread.projectTitle}
                    {hasMultipleEnvironments ? ` · ${thread.environmentLabel}` : null}
                    {" · Archived "}
                    <RelativeTime timestamp={thread.archivedAt} />
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within/archived-row:opacity-100 group-hover/archived-row:opacity-100 pointer-coarse:opacity-100">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      void navigate({
                        to: "/$environmentId/$threadId",
                        params: buildThreadRouteParams(thread.ref),
                      })
                    }
                  >
                    <EyeIcon />
                    Open
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => void unarchive([thread])}
                  >
                    <ArchiveRestoreIcon />
                    Unarchive
                  </Button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon-xs"
                          variant="ghost-destructive"
                          disabled={isBusy}
                          aria-label={`Delete ${thread.title}`}
                          onClick={() => void remove([thread])}
                        />
                      }
                    >
                      <Trash2Icon />
                    </TooltipTrigger>
                    <TooltipPopup side="top">Delete…</TooltipPopup>
                  </Tooltip>
                </div>
              </div>
            ))}
          </SettingsSection>
        ))
      )}
    </SettingsPageContainer>
  );
}
