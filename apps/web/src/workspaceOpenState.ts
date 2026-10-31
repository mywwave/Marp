import type { ScopedThreadRef, WorkspaceOpenState } from "@marp/contracts";
import { create } from "zustand";

import { selectThreadDiffPanelSelection, useDiffPanelStore } from "./diffPanelStore";
import { selectActiveRightPanelSurface, useRightPanelStore } from "./rightPanelStore";

const MAX_PATH_LENGTH = 1024;

interface WorkspaceLineSelection {
  readonly surface: "file" | "diff";
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
}

// Read only when a message is sent, so line drags re-render nothing.
const useWorkspaceSelectionStore = create<{
  readonly byComposerTarget: Readonly<Record<string, WorkspaceLineSelection>>;
}>()(() => ({ byComposerTarget: {} }));

/** Records the line range selected in the right panel; null clears it. */
export function setWorkspaceLineSelection(
  composerTargetKey: string,
  selection:
    | (Omit<WorkspaceLineSelection, "startLine" | "endLine"> & {
        readonly start: number;
        readonly end: number;
      })
    | null,
) {
  useWorkspaceSelectionStore.setState((state) => {
    const { [composerTargetKey]: _previous, ...rest } = state.byComposerTarget;
    return {
      byComposerTarget:
        selection === null
          ? rest
          : {
              ...rest,
              [composerTargetKey]: {
                surface: selection.surface,
                path: selection.path,
                startLine: Math.min(selection.start, selection.end),
                endLine: Math.max(selection.start, selection.end),
              },
            },
    };
  });
}

const boundedPath = (path: string | null | undefined) =>
  path && path.trim().length > 0 && path.length <= MAX_PATH_LENGTH ? path : undefined;

/** What the thread's right panel shows right now, for the agent's workspace context. */
export function readWorkspaceOpenState(input: {
  readonly threadRef: ScopedThreadRef;
  readonly composerTargetKey: string;
}): WorkspaceOpenState | undefined {
  const surface = selectActiveRightPanelSurface(
    useRightPanelStore.getState().byThreadKey,
    input.threadRef,
  );
  if (surface?.kind !== "file" && surface?.kind !== "diff") return undefined;
  const diff =
    surface.kind === "diff"
      ? selectThreadDiffPanelSelection(useDiffPanelStore.getState().byThreadKey, input.threadRef)
      : null;
  // Attachments are not workspace files.
  const file =
    surface.kind === "file"
      ? surface.attachment === undefined
        ? boundedPath(surface.relativePath)
        : undefined
      : diff?.kind === "turn"
        ? boundedPath(diff.filePath)
        : undefined;
  const selection = useWorkspaceSelectionStore.getState().byComposerTarget[input.composerTargetKey];
  const selectionPath =
    selection?.surface === surface.kind && (surface.kind === "diff" || selection.path === file)
      ? boundedPath(selection.path)
      : undefined;
  const state: WorkspaceOpenState = {
    ...(file === undefined ? {} : { file }),
    // The message context has no shape for a reviewed local commit, so that view is not sent.
    ...(diff === null || diff.kind === "commit"
      ? {}
      : { diff: diff.kind === "tool-call" ? "turn" : diff.kind }),
    ...(selection === undefined || selectionPath === undefined || selection.startLine < 1
      ? {}
      : {
          selection: {
            path: selectionPath,
            startLine: selection.startLine,
            endLine: selection.endLine,
          },
        }),
  };
  return Object.keys(state).length === 0 ? undefined : state;
}
