/**
 * Where the permissions control lives, which blocks overflow, and which menu answers the
 * composer.mode shortcut. Blocks are ordered [traits, mode]; the last block overflows first.
 * The mode block holds the Plan toggle and the permissions chip, which owns composer.mode
 * until it overflows; then the effort menu, which always ends with Permissions, answers it.
 */
export function resolveComposerControlsOwnership(input: {
  /** The model has an effort (traits) menu, which then always holds Permissions. */
  readonly hasTraits: boolean;
  readonly planModeUiEnabled: boolean;
  readonly collapsed: boolean;
  /** How many trailing blocks the width measurement moved into the overflow menu. */
  readonly measuredHiddenBlockCount: number;
}) {
  const accessDisplay = input.collapsed ? ("icon" as const) : ("label" as const);
  const blockIds = [...(input.hasTraits ? ["traits" as const] : []), "mode" as const];
  const hiddenFor = (count: number) => blockIds.slice(blockIds.length - count);
  const overflowShowsPermissionsFor = (hidden: ReadonlyArray<string>) =>
    hidden.includes(input.hasTraits ? "traits" : "mode");
  const overflowHasContent = (hidden: ReadonlyArray<string>) =>
    hidden.includes("traits") ||
    (input.planModeUiEnabled && hidden.includes("mode")) ||
    overflowShowsPermissionsFor(hidden);

  let hiddenBlockCount = Math.min(input.measuredHiddenBlockCount, blockIds.length);
  // An overflow menu with nothing in it must not exist: overflow one more block instead.
  while (
    hiddenBlockCount > 0 &&
    hiddenBlockCount < blockIds.length &&
    !overflowHasContent(hiddenFor(hiddenBlockCount))
  ) {
    hiddenBlockCount += 1;
  }
  const hiddenBlockIds = hiddenFor(hiddenBlockCount);
  const modeHidden = hiddenBlockIds.includes("mode");
  const traitsHidden = hiddenBlockIds.includes("traits");
  return {
    accessDisplay,
    hiddenBlockCount,
    hiddenBlockIds,
    traitsHidden,
    effortOwnsModeShortcut: modeHidden && !traitsHidden,
    overflowShowsPermissions: overflowShowsPermissionsFor(hiddenBlockIds),
  };
}
