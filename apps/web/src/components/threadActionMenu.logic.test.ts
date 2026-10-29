import { describe, expect, it } from "vite-plus/test";

import {
  buildThreadActionMenuItems,
  type ThreadActionMenuState,
  withSidebarRowShortcuts,
} from "./threadActionMenu.logic";

const baseState: ThreadActionMenuState = {
  canOperate: true,
  branch: null,
  projectFilter: null,
  isPinned: false,
  isSettled: false,
  autoSettleEnabled: true,
  isSnoozed: false,
  canSnoozeNow: true,
  isRegeneratingTitle: false,
  isRunning: false,
  supports: {
    settlement: true,
    autoSettleOptOut: true,
    snooze: true,
    pinning: true,
    titleRegeneration: true,
  },
  snoozePresets: [
    { id: "hour", label: "In 1 hour", whenLabel: "3:00 PM", snoozedUntil: "2026-08-07T15:00:00Z" },
  ],
};

describe("buildThreadActionMenuItems", () => {
  it.each([false, true])(
    "disables both lifecycle directions without permission (reversed: %s)",
    (reversed) => {
      const items = buildThreadActionMenuItems({
        ...baseState,
        canOperate: false,
        isPinned: reversed,
        isSettled: reversed,
        isSnoozed: reversed,
      });
      const expected = reversed
        ? [
            "unpin",
            "unsettle",
            "unsnooze",
            "rename",
            "regenerate-title",
            "auto-settle",
            "archive",
            "delete",
          ]
        : [
            "pin",
            "settle",
            "snooze",
            "rename",
            "regenerate-title",
            "auto-settle",
            "archive",
            "delete",
          ];
      expect(items.filter((item) => item.disabled).map((item) => item.id)).toEqual(expected);
      expect(
        items.find((item) => item.id === "snooze")?.children?.every((child) => child.disabled) ??
          true,
      ).toBe(true);
    },
  );

  it("disables archive and turning into a project while the thread is running", () => {
    const items = buildThreadActionMenuItems({
      ...baseState,
      isRunning: true,
      canTurnIntoProject: true,
    });
    expect(items.find((item) => item.id === "archive")?.disabled).toBe(true);
    expect(items.find((item) => item.id === "turn-into-project")?.disabled).toBe(true);
  });
});

describe("withSidebarRowShortcuts", () => {
  const shortcuts = (state: Partial<ThreadActionMenuState>, platform: string) =>
    Object.fromEntries(
      withSidebarRowShortcuts(buildThreadActionMenuItems({ ...baseState, ...state }), {
        isSnoozed: state.isSnoozed ?? false,
        platform,
      }).flatMap((item) => (item.shortcut ? [[item.id, item.shortcut]] : [])),
    );

  it("labels only the keys a focused row answers to", () => {
    expect(shortcuts({}, "Win32")).toEqual({
      pin: "P",
      settle: "S",
      snooze: "Z",
      rename: "F2",
      delete: "Del",
    });
    expect(shortcuts({ isPinned: true, isSettled: true }, "MacIntel")).toMatchObject({
      unpin: "P",
      unsettle: "S",
      delete: "⌫",
    });
  });

  it("gives S to waking a snoozed thread, which is what the key does", () => {
    expect(shortcuts({ isSnoozed: true }, "Win32")).toEqual({
      pin: "P",
      unsnooze: "S",
      rename: "F2",
      delete: "Del",
    });
  });
});
