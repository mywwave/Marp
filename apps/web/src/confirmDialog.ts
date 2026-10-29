import type { ConfirmDialogOptions, ConfirmDialogVariant } from "@marp/contracts";

type ConfirmDialogRequest = {
  readonly message: string;
  readonly variant: ConfirmDialogVariant;
  readonly confirmLabel?: string;
};

export type ConfirmDialogState =
  | { readonly status: "idle" }
  | ({ readonly status: "confirming" } & ConfirmDialogRequest)
  | ({ readonly status: "closing" } & ConfirmDialogRequest);

type PendingConfirmation = ConfirmDialogRequest & {
  readonly resolve: (confirmed: boolean) => void;
};

// Keeps an absent label absent so state snapshots stay comparable.
function requestOf({
  message,
  variant,
  confirmLabel,
}: {
  readonly message: string;
  readonly variant: ConfirmDialogVariant;
  readonly confirmLabel?: string | undefined;
}): ConfirmDialogRequest {
  return confirmLabel === undefined ? { message, variant } : { message, variant, confirmLabel };
}

const idleState: ConfirmDialogState = { status: "idle" };
let state: ConfirmDialogState = idleState;
let activeConfirmation: PendingConfirmation | null = null;
let queuedConfirmations: PendingConfirmation[] = [];
const listeners = new Set<() => void>();

function publish(next: ConfirmDialogState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function resolvePendingConfirmations(confirmed: boolean): void {
  activeConfirmation?.resolve(confirmed);
  for (const confirmation of queuedConfirmations) {
    confirmation.resolve(confirmed);
  }
  activeConfirmation = null;
  queuedConfirmations = [];
}

export function readConfirmDialogState(): ConfirmDialogState {
  return state;
}

/**
 * Only themed hosts subscribe, so a subscriber is a mounted host. When the last
 * one leaves, pending confirmations resolve as cancelled.
 */
export function subscribeConfirmDialogHost(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    if (!listeners.delete(listener) || listeners.size > 0) return;
    resolvePendingConfirmations(false);
    publish(idleState);
  };
}

/** Undefined means no themed host is available. */
export function requestConfirmDialog(
  message: string,
  options?: ConfirmDialogOptions,
): Promise<boolean> | undefined {
  if (listeners.size === 0) return undefined;

  const confirmation = new Promise<boolean>((resolve) => {
    const pending: PendingConfirmation = {
      ...requestOf({
        message,
        variant: options?.variant ?? "default",
        confirmLabel: options?.confirmLabel,
      }),
      resolve,
    };
    if (activeConfirmation || state.status === "closing") {
      queuedConfirmations.push(pending);
      return;
    }

    activeConfirmation = pending;
    publish({ status: "confirming", ...requestOf(pending) });
  });

  return confirmation;
}

/**
 * The one confirmation for destructive, irreversible actions. The title is a
 * question naming the object; the description says exactly what is lost.
 */
export function confirmDestructiveAction(input: {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
}): Promise<boolean> {
  return (
    requestConfirmDialog(
      `${input.title}
${input.description}`,
      {
        variant: "destructive",
        confirmLabel: input.confirmLabel,
      },
    ) ?? Promise.resolve(false)
  );
}

export function isConfirmDialogActive(): boolean {
  return state.status !== "idle" || activeConfirmation !== null || queuedConfirmations.length > 0;
}

export function respondToConfirmDialog(confirmed: boolean): void {
  if (state.status !== "confirming" || !activeConfirmation) return;

  const confirmation = activeConfirmation;
  activeConfirmation = null;
  confirmation.resolve(confirmed);
  publish({ status: "closing", ...requestOf(state) });
}

export function completeConfirmDialogClose(): void {
  if (state.status !== "closing") return;

  const next = queuedConfirmations.shift();
  if (!next) {
    publish(idleState);
    return;
  }

  activeConfirmation = next;
  publish({ status: "confirming", ...requestOf(next) });
}

export function resetConfirmDialogForTests(): void {
  listeners.clear();
  resolvePendingConfirmations(false);
  publish(idleState);
}
