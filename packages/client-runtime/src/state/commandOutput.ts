import type { OrchestrationV2CommandOutputFrame } from "@marp/contracts";
import {
  appendTerminalOutput,
  EMPTY_TERMINAL_OUTPUT,
  terminalOutputPlainText,
  type TerminalOutputState,
} from "@marp/shared/terminalOutput";

/** One command row's output as a client holds it. */
export interface CommandOutputView {
  readonly output: TerminalOutputState;
  /** False once the command settled and `output` is final. */
  readonly running: boolean;
}

export const EMPTY_COMMAND_OUTPUT: CommandOutputView = {
  output: EMPTY_TERMINAL_OUTPUT,
  running: true,
};

/**
 * Applies one server frame. A `replace` carries the whole bounded tail (the
 * first frame, a viewer that fell behind, or the final output); an `append`
 * is raw terminal text normalized with the same rules the server uses.
 */
export function applyCommandOutputFrame(
  view: CommandOutputView,
  frame: OrchestrationV2CommandOutputFrame,
): CommandOutputView {
  const base = frame.kind === "replace" ? EMPTY_TERMINAL_OUTPUT : view.output;
  return {
    output: appendTerminalOutput(
      { ...base, truncated: base.truncated || frame.truncated },
      frame.text,
    ),
    running: frame.running,
  };
}

const PREVIEW_MAX_LINES = 5;
const PREVIEW_MAX_CHARS = 2_000;

/** What a running command's card shows without a click: its last few plain lines, bounded. */
export function commandOutputPreview(text: string): string {
  const lines = terminalOutputPlainText(text).replace(/\s+$/u, "").split("\n");
  const tail = lines.slice(-PREVIEW_MAX_LINES).join("\n");
  return tail.length <= PREVIEW_MAX_CHARS ? tail : tail.slice(-PREVIEW_MAX_CHARS);
}
