const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface ArchivedThreadListItem {
  readonly key: string;
  readonly title: string;
  readonly projectTitle: string;
  readonly archivedAt: string;
}

export function filterArchivedThreads<T extends ArchivedThreadListItem>(
  threads: ReadonlyArray<T>,
  query: string,
): ReadonlyArray<T> {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return threads;
  return threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(needle) ||
      thread.projectTitle.toLowerCase().includes(needle),
  );
}

/** Expects threads sorted newest first; empty groups are dropped. */
export function groupArchivedThreadsByRecency<T extends ArchivedThreadListItem>(
  threads: ReadonlyArray<T>,
  nowIso: string,
): ReadonlyArray<{ readonly label: "This week" | "Earlier"; readonly threads: ReadonlyArray<T> }> {
  const weekAgo = Date.parse(nowIso) - WEEK_MS;
  const thisWeek = threads.filter((thread) => Date.parse(thread.archivedAt) >= weekAgo);
  const earlier = threads.filter((thread) => Date.parse(thread.archivedAt) < weekAgo);
  return [
    { label: "This week" as const, threads: thisWeek },
    { label: "Earlier" as const, threads: earlier },
  ].filter((group) => group.threads.length > 0);
}

export function toggleArchivedSelection(
  selected: ReadonlySet<string>,
  key: string,
): ReadonlySet<string> {
  const next = new Set(selected);
  if (!next.delete(key)) next.add(key);
  return next;
}

/** Selects every visible thread, or clears them when all are already selected. */
export function toggleAllVisibleArchived(
  selected: ReadonlySet<string>,
  visibleKeys: ReadonlyArray<string>,
): ReadonlySet<string> {
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selected.has(key));
  const next = new Set(selected);
  for (const key of visibleKeys) {
    if (allSelected) next.delete(key);
    else next.add(key);
  }
  return next;
}
