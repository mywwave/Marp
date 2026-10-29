/** How a timeline row entered: appended while the user watched, revealed by their toggle, or neither. */
export type TimelineRowEnter = "live" | "reveal" | null;

/** A row appended after the list settled only animates if it mounts this soon. */
const LIVE_ROW_MOUNT_WINDOW_MS = 1000;

/**
 * Decides which rows play their entry. `@starting-style` fires on every mount, including the
 * first render of a thread, history loads and virtualized remounts while scrolling; only rows
 * appended at the end after the list settled, or mounted by the user's own disclosure toggle,
 * get to animate, and each only on its first mount.
 */
export function createTimelineRowEnterGate() {
  let identity: string | null = null;
  const seen = new Set<string>();
  /** Appended rows, stamped with when they were committed; unstamped ones are in this commit. */
  const live = new Map<string, number | undefined>();
  let revealing = false;

  return {
    /** Called on every render with the list's rows; idempotent. */
    observe(nextIdentity: string, rows: ReadonlyArray<{ readonly id: string }>, settling: boolean) {
      if (nextIdentity !== identity) {
        identity = nextIdentity;
        seen.clear();
        live.clear();
        revealing = false;
      }
      if (settling) {
        for (const row of rows) seen.add(row.id);
        return;
      }
      let lastSeenIndex = -1;
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (seen.has(rows[index]!.id)) {
          lastSeenIndex = index;
          break;
        }
      }
      for (const [index, row] of rows.entries()) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        // Rows inserted above the newest known row are history (earlier turns, unfolded work).
        if (index > lastSeenIndex) live.set(row.id, undefined);
      }
    },
    /** Called after each commit, so the mount window starts once a row could have mounted. */
    stamp(nowMs: number) {
      for (const [rowId, stampedAt] of live) {
        if (stampedAt === undefined) live.set(rowId, nowMs);
        else if (nowMs - stampedAt > LIVE_ROW_MOUNT_WINDOW_MS) live.delete(rowId);
      }
    },
    setRevealing(next: boolean) {
      revealing = next;
    },
    claim(rowId: string, nowMs: number): TimelineRowEnter {
      if (revealing) return "reveal";
      if (!live.has(rowId)) return null;
      const stampedAt = live.get(rowId);
      return stampedAt === undefined || nowMs - stampedAt <= LIVE_ROW_MOUNT_WINDOW_MS
        ? "live"
        : null;
    },
    /** A row that played its entry never replays it on a remount. */
    consume(rowId: string) {
      live.delete(rowId);
    },
  };
}

export type TimelineRowEnterGate = ReturnType<typeof createTimelineRowEnterGate>;
