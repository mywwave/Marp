import { formatDuration } from "@marp/shared/orchestrationTiming";

function formatWorkingTimer(startIso: string, endIso: string): string | null {
  const startedAtMs = Date.parse(startIso);
  const endedAtMs = Date.parse(endIso);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
    return null;
  }

  const elapsedSeconds = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  return formatDuration(elapsedSeconds * 1_000);
}

export function formatWorkingTimerNow(startIso: string): string {
  return formatWorkingTimer(startIso, new Date().toISOString()) ?? "0s";
}

const PRE_ACTIVITY_SLOW_MS = 20_000;

/** What a turn says before its first thought, tool, or text arrives. */
export function preActivityLabel(startIso: string | null, nowMs: number): string {
  const startedAtMs = startIso === null ? Number.NaN : Date.parse(startIso);
  return Number.isFinite(startedAtMs) && nowMs - startedAtMs >= PRE_ACTIVITY_SLOW_MS
    ? "Taking a little while…"
    : "Planning next moves";
}

export const AWAITING_USER_LABELS = {
  approval: "Waiting for approval",
  input: "Waiting for response",
} as const;
