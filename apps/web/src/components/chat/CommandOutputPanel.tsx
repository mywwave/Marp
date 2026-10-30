import {
  commandOutputPreview,
  type CommandOutputView,
} from "@marp/client-runtime/state/command-output";
import type { EnvironmentId, ThreadId, TurnItemId } from "@marp/contracts";
import { TERMINAL_PALETTES, terminalOutputSpans } from "@marp/shared/terminalOutput";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import { useTheme } from "../../hooks/useTheme";
import { cn } from "~/lib/utils";
import { useServerConfigs } from "../../state/entities";
import { orchestrationEnvironment } from "../../state/orchestration";
import { useEnvironmentQuery } from "../../state/query";
import {
  CommandCodeOutput,
  commandCodeLanguage,
  type CommandCodeTarget,
} from "./CommandCodeOutput";
import { MessageCopyButton } from "./MessageCopyButton";
import type { TurnItemSource } from "./timelineRowContext";

const FOLLOW_SLACK_PX = 8;

export function useCommandOutputStreaming(environmentId: EnvironmentId): boolean {
  return (
    useServerConfigs().get(environmentId)?.environment.capabilities.commandOutputStreaming === true
  );
}

/**
 * A command card's newest output lines, shown without a click while it runs (and after it fails).
 * Like the panel, it subscribes only while mounted.
 */
export function CommandOutputTail(props: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly itemId: TurnItemId;
  readonly source?: TurnItemSource["commandOutput"] | undefined;
  /** Layout around the box: margins that line it up with the row's label. */
  readonly className?: string;
  readonly onOpen?: () => void;
}) {
  const input = { threadId: props.threadId, itemId: props.itemId };
  const { data } = useEnvironmentQuery<CommandOutputView, unknown>(
    props.source
      ? props.source(input)
      : orchestrationEnvironment.v2.commandOutput({ environmentId: props.environmentId, input }),
  );
  return (
    <CommandOutputPreview
      text={data?.output.text ?? ""}
      className={props.className}
      onOpen={props.onOpen}
    />
  );
}

/** The newest few lines of a command's output, as Cursor's collapsed shell card shows them. */
export function CommandOutputPreview(props: {
  readonly text: string;
  readonly className?: string | undefined;
  readonly onOpen?: (() => void) | undefined;
}) {
  const preview = commandOutputPreview(props.text);
  if (preview.length === 0) return null;
  // The preview keeps only the newest lines, so a shorter preview means earlier output is cut.
  const clipped = preview.length < props.text.trimEnd().length;
  const box = cn(
    "flex max-h-50 w-auto flex-col justify-end overflow-hidden rounded-sm bg-muted px-3 py-2 text-left font-mono text-xs leading-4.5 break-all whitespace-pre-wrap text-muted-foreground",
    clipped && "mask-t-from-70%",
    props.className,
  );
  return props.onOpen ? (
    <button
      type="button"
      aria-live="off"
      aria-label="Show full command output"
      data-command-output-tail
      onClick={props.onOpen}
      className={cn(
        box,
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
      )}
    >
      {preview}
    </button>
  ) : (
    <div aria-live="off" data-command-output-tail className={box}>
      {preview}
    </div>
  );
}

/**
 * Output of one expanded command row: streams while the command runs, then
 * shows its final output. Mount it only when `useCommandOutputStreaming` holds
 * or a `source` serves the output.
 * It subscribes only while mounted, so collapsed rows and other threads receive nothing.
 */
export function CommandOutputPanel(props: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
  readonly itemId: TurnItemId;
  readonly source?: TurnItemSource["commandOutput"] | undefined;
  readonly copyable?: boolean;
  /** The output is one file's lines: shown as code with line numbers. */
  readonly code?: CommandCodeTarget | undefined;
  /** Scrolls with the output above it, as the command line does in the terminal card. */
  readonly lead?: ReactNode;
  /** Beside the copy button. */
  readonly actions?: ReactNode;
  /** The scroller's height cap. */
  readonly scrollClassName?: string;
}) {
  const input = { threadId: props.threadId, itemId: props.itemId };
  const { data, error } = useEnvironmentQuery<CommandOutputView, unknown>(
    props.source
      ? props.source(input)
      : orchestrationEnvironment.v2.commandOutput({ environmentId: props.environmentId, input }),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const text = data?.output.text ?? "";
  const { resolvedTheme } = useTheme();

  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- pins the output scroller's scrollTop to the bottom after each commit while the user follows
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && followRef.current) element.scrollTop = element.scrollHeight;
  });

  if (text.length === 0) {
    const empty = error ? (
      <div className="text-destructive">Couldn&apos;t load output: {error}</div>
    ) : data === null ? (
      <div className="min-h-16 text-muted-foreground italic">Loading output…</div>
    ) : data.running ? null : (
      <div className="text-muted-foreground italic">No output.</div>
    );
    return props.lead === undefined ? (
      empty
    ) : (
      <div>
        {props.actions ? <div className="flex justify-end gap-0.5">{props.actions}</div> : null}
        {props.lead}
        {empty}
      </div>
    );
  }
  // Colored output keeps its own colors; a printed file is highlighted once it has finished.
  const codeLanguage =
    props.code && !data?.running && !text.includes("\u001b") && !data?.output.truncated
      ? commandCodeLanguage(props.code, text)
      : null;
  // Parse after all hooks to preserve the text/theme compiler cache.
  const spans = codeLanguage ? [] : terminalOutputSpans(text, TERMINAL_PALETTES[resolvedTheme]);
  return (
    <div>
      {props.copyable || props.actions ? (
        <div className="flex justify-end gap-0.5">
          {props.actions}
          {props.copyable ? (
            <MessageCopyButton text={text} label="Copy output" size="icon-xs" variant="ghost" />
          ) : null}
        </div>
      ) : null}
      {data?.output.truncated ? (
        <div className="text-muted-foreground italic">Earlier output not shown</div>
      ) : null}
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          followRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <= FOLLOW_SLACK_PX;
        }}
        className={cn("overflow-auto text-muted-foreground", props.scrollClassName ?? "max-h-80")}
      >
        {props.lead}
        {props.code && codeLanguage ? (
          <CommandCodeOutput text={text} language={codeLanguage} startLine={props.code.startLine} />
        ) : null}
        {spans.map((span, index) =>
          span.style === null ? (
            span.text
          ) : (
            // Spans never reorder and are rebuilt on each update.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} style={span.style}>
              {span.text}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
