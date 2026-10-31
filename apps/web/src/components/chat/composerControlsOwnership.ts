/**
 * Whether the mode block overflows, and which control answers the composer.mode shortcut. The
 * mode block holds the interaction mode control and the permissions chip, which owns
 * composer.mode until it overflows; the model picker's footer always holds Permissions too.
 * The rule: composer.mode has one target.
 */
export function resolveComposerControlsOwnership(input: {
  readonly planModeUiEnabled: boolean;
  readonly collapsed: boolean;
  /** How many trailing blocks the width measurement moved into the overflow menu. */
  readonly measuredHiddenBlockCount: number;
}) {
  const accessDisplay = input.collapsed ? ("icon" as const) : ("label" as const);
  const modeHidden = input.measuredHiddenBlockCount > 0;
  const hiddenBlockIds = modeHidden ? (["mode"] as const) : ([] as const);
  // An overflowed chip needs a home for Permissions only when the mode toggle is not there to fill
  // the overflow menu; otherwise Permissions stay in the model picker.
  const overflowShowsPermissions = modeHidden && !input.planModeUiEnabled;
  return {
    accessDisplay,
    hiddenBlockCount: hiddenBlockIds.length,
    hiddenBlockIds,
    overflowShowsPermissions,
    /** Without a visible chip or an overflow menu holding it, the model picker answers composer.mode. */
    pickerOwnsModeShortcut: modeHidden && !overflowShowsPermissions,
  };
}
