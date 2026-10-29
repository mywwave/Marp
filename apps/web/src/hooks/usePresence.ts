import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Exit length for overlays without Base UI: long enough to read, short enough not to block. */
const PRESENCE_EXIT_MS = 150;

/**
 * Keeps a closed overlay mounted for its exit. While `closing`, render it with `data-closing`,
 * `inert` and `data-closing:animate-fade-out`; it keeps its height until it unmounts.
 */
export function usePresence(open: boolean, exitMs = PRESENCE_EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- unmounts once the exit transition's time has passed
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(timer);
  }, [exitMs, mounted, open]);

  return { mounted: open || mounted, closing: !open && mounted };
}

interface PresenceRow<T> {
  readonly key: string;
  readonly item: T;
  readonly closing: boolean;
}

interface ExitingRow<T> {
  readonly key: string;
  readonly item: T;
  readonly index: number;
}

/**
 * `usePresence` for a keyed list: a removed item stays at its last position, `closing`, for
 * `exitMs`, then leaves. It remounts to do so, hence the exit is an animation, not a transition.
 */
export function usePresenceList<T>(
  items: ReadonlyArray<T>,
  getKey: (item: T) => string,
  exitMs = PRESENCE_EXIT_MS,
): ReadonlyArray<PresenceRow<T>> {
  const [exiting, setExiting] = useState<ReadonlyArray<ExitingRow<T>>>([]);
  const committedItems = useRef(items);

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- diffs against the last committed rows before paint, so a removed row keeps rendering what it last showed
  useLayoutEffect(() => {
    const previous = committedItems.current;
    committedItems.current = items;
    if (previous === items) return;
    const live = new Set(items.map(getKey));
    const removed = previous.flatMap((item, index) => {
      const key = getKey(item);
      return live.has(key) ? [] : [{ key, item, index }];
    });
    const removedKeys = new Set(removed.map((row) => row.key));
    setExiting((current) => {
      const kept = current.filter((row) => !live.has(row.key) && !removedKeys.has(row.key));
      return removed.length === 0 && kept.length === current.length
        ? current
        : [...kept, ...removed];
    });
  }, [getKey, items]);

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- drops exited rows once the exit transition's time has passed
  useEffect(() => {
    if (exiting.length === 0) return;
    const timer = setTimeout(() => setExiting([]), exitMs);
    return () => clearTimeout(timer);
  }, [exitMs, exiting]);

  const live = new Set(items.map(getKey));
  const rows: PresenceRow<T>[] = items.map((item) => ({ key: getKey(item), item, closing: false }));
  for (const row of [...exiting].sort((a, b) => a.index - b.index)) {
    if (live.has(row.key)) continue;
    rows.splice(Math.min(row.index, rows.length), 0, {
      key: row.key,
      item: row.item,
      closing: true,
    });
  }
  return rows;
}
