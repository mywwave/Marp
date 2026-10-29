import type { ProviderApprovalDecision, ProviderApprovalOption } from "@marp/contracts";

const TYPING_TARGETS = [
  "input",
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
  '[role="textbox"]',
  '[role="combobox"]',
];
// Enter on a focused control already means "press this", and Esc in an open layer means "close it".
const KEY_OWNING_TARGETS = [
  ...TYPING_TARGETS,
  "button",
  "a[href]",
  "summary",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(", ");
const TYPING_SELECTOR = TYPING_TARGETS.join(", ");

function closestMatches(target: EventTarget | null, selector: string): boolean {
  return typeof Element !== "undefined" && target instanceof Element
    ? target.closest(selector) !== null
    : false;
}

interface DecisionKeyEvent {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly defaultPrevented: boolean;
  readonly target: EventTarget | null;
}

function isBareKey(event: DecisionKeyEvent): boolean {
  return (
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.defaultPrevented
  );
}

/**
 * Which answers have a key: Enter approves, Esc declines. An approve option that carries a warning
 * needs a click, and providers that omit an answer get no key for it.
 */
export function approvalShortcuts(options: ReadonlyArray<ProviderApprovalOption> | undefined): {
  readonly approve: boolean;
  readonly decline: boolean;
} {
  const offered = (decision: ProviderApprovalDecision) =>
    options === undefined ||
    options.some((option) => option.decision === decision && option.warning === undefined);
  return { approve: offered("accept"), decline: offered("decline") };
}

export function approvalShortcutDecision(
  event: DecisionKeyEvent,
  options: ReadonlyArray<ProviderApprovalOption> | undefined,
): ProviderApprovalDecision | null {
  if (!isBareKey(event) || event.shiftKey || closestMatches(event.target, KEY_OWNING_TARGETS)) {
    return null;
  }
  const shortcuts = approvalShortcuts(options);
  if (event.key === "Enter") return shortcuts.approve ? "accept" : null;
  if (event.key === "Escape") return shortcuts.decline ? "decline" : null;
  return null;
}

/** Digits 1–9 pick the matching option of the question on screen, even from a focused option. */
export function questionShortcutOptionIndex(
  event: DecisionKeyEvent,
  optionCount: number,
): number | null {
  if (!isBareKey(event) || closestMatches(event.target, TYPING_SELECTOR)) return null;
  const digit = Number.parseInt(event.key, 10);
  if (!/^[1-9]$/.test(event.key) || digit > optionCount) return null;
  return digit - 1;
}
