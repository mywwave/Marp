import { describe, expect, it } from "vite-plus/test";

import { resolveComposerControlsOwnership } from "./composerControlsOwnership";

const base = {
  hasTraits: true,
  planModeUiEnabled: false,
  collapsed: false,
  measuredHiddenBlockCount: 0,
};

describe("resolveComposerControlsOwnership", () => {
  it("shows a labelled chip that owns composer.mode while everything fits", () => {
    const result = resolveComposerControlsOwnership(base);
    expect(result).toMatchObject({
      accessDisplay: "label",
      hiddenBlockIds: [],
      effortOwnsModeShortcut: false,
    });
  });

  it("never leaves an empty overflow menu: the effort chip overflows with the chip", () => {
    const result = resolveComposerControlsOwnership({ ...base, measuredHiddenBlockCount: 1 });
    expect(result.hiddenBlockIds).toEqual(["traits", "mode"]);
    expect(result.overflowShowsPermissions).toBe(true);
    // One composer.mode target: the overflow menu, not the overflowed effort chip.
    expect(result.effortOwnsModeShortcut).toBe(false);
  });

  it("overflows only the chip when the Plan toggle gives the overflow menu content", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      planModeUiEnabled: true,
      measuredHiddenBlockCount: 1,
    });
    expect(result.hiddenBlockIds).toEqual(["mode"]);
    // Permissions stay in the visible effort menu, which now answers composer.mode.
    expect(result.overflowShowsPermissions).toBe(false);
    expect(result.effortOwnsModeShortcut).toBe(true);
  });

  it("moves Permissions into the overflow for models without traits", () => {
    const overflowed = resolveComposerControlsOwnership({
      ...base,
      hasTraits: false,
      measuredHiddenBlockCount: 1,
    });
    expect(overflowed.hiddenBlockIds).toEqual(["mode"]);
    expect(overflowed.overflowShowsPermissions).toBe(true);
  });

  it("shows the chip as an icon in the compacted row", () => {
    const result = resolveComposerControlsOwnership({ ...base, collapsed: true });
    expect(result.accessDisplay).toBe("icon");
  });
});
