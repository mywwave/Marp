import { readOnlyCommandActions } from "@marp/client-runtime/work-log/command-label";
import { getFiletypeFromFileName } from "@pierre/diffs";
import { Suspense } from "react";

import { useRenderedAppearance } from "../../hooks/useTheme";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import { HighlightedTokens } from "./HighlightedTokens";

/** The one file a read-only command printed, and the line its output starts at when known. */
export interface CommandCodeTarget {
  readonly path: string;
  readonly startLine: number | null;
}

// Steps that print something other than the file's own lines: counts, columns, matches, blame.
const RESHAPES_OUTPUT =
  /\b(?:wc|awk|gawk|jq|blame|sort|uniq|cut|tr|grep|egrep|rg|select-string|sls|findstr|measure-object)\b/iu;
// From the end of a file, the first printed line's number is unknown.
const PRINTS_FROM_END = /\btail\b|-tail\b|-last\b/iu;

export function commandCodeTarget(command: string): CommandCodeTarget | undefined {
  if (RESHAPES_OUTPUT.test(command)) return undefined;
  const actions = readOnlyCommandActions(command);
  const read = actions?.length === 1 ? actions[0] : undefined;
  if (read?.type !== "read") return undefined;
  if (PRINTS_FROM_END.test(command)) return { path: read.path, startLine: null };
  const start = read.lines === undefined ? undefined : /^L(\d+)/u.exec(read.lines)?.[1];
  return { path: read.path, startLine: start === undefined ? 1 : Number(start) };
}

// `cat -n`, `nl` and `grep -n` already number their lines; a second gutter would repeat them.
const NUMBERED_LINE = /^\s*\d+[\t:→|]/u;

/** The language to color a printed file with, or null when it is plain text or pre-numbered. */
export function commandCodeLanguage(target: CommandCodeTarget, text: string): string | null {
  const language = getFiletypeFromFileName(target.path);
  if (language === "text") return null;
  const lines = text.split("\n", 8).filter((line) => line.trim().length > 0);
  return lines.length > 0 && lines.every((line) => NUMBERED_LINE.test(line)) ? null : language;
}

/** A printed file as code: a line-number gutter beside highlighted lines that never wrap. */
export function CommandCodeOutput({
  text,
  language,
  startLine,
}: {
  text: string;
  language: string;
  startLine: number | null;
}) {
  const theme = useRenderedAppearance();
  const code = text.replace(/\n$/u, "");
  const lineCount = code.split("\n").length;
  return (
    <div className="flex min-w-0 font-mono text-xs leading-5">
      {startLine === null ? null : (
        <div
          aria-hidden
          className="shrink-0 pe-3 text-end text-muted-foreground/60 tabular-nums select-none"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index}>{startLine + index}</div>
          ))}
        </div>
      )}
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-foreground/85 select-text [scrollbar-width:thin]">
        <RenderErrorBoundary fallback={code} resetKeys={[code, language]}>
          <Suspense fallback={code}>
            <HighlightedTokens code={code} language={language} theme={theme} />
          </Suspense>
        </RenderErrorBoundary>
      </pre>
    </div>
  );
}
