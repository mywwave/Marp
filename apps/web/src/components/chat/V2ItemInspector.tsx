import type { ToolCallDiffTarget } from "../../diffPanelStore";
import type { EnvironmentId, OrchestrationV2ProjectedTurnItem } from "@marp/contracts";
import {
  toolCallLines,
  turnItemDetailRevision,
  turnItemNeedsDetailFetch,
  turnItemOutputImages,
  turnItemOutputText,
} from "@marp/client-runtime/work-log/item-detail";
import { formatDiffCount } from "@marp/client-runtime/diff-count";
import { isJavaScriptReplTool } from "@marp/shared/toolActivity";
import { CircleCheckIcon, CircleDotIcon, CircleIcon, ExternalLinkIcon } from "lucide-react";
import { memo, type ReactNode, Suspense, use } from "react";

import { useRenderedAppearance } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";
import { resolveDiffThemeName } from "../../lib/diffRendering";
import { getSyntaxHighlighterPromise } from "../../lib/syntaxHighlighting";
import { useTurnItemDetail } from "../../state/queries";
import { formatWorkspaceRelativePath } from "../../filePathDisplay";
import { Button } from "../ui/button";
import ChatMarkdown from "../ChatMarkdown";
import { ChatMarkdownAssetImage } from "./ChatMarkdownMedia";
import { RenderErrorBoundary } from "../RenderErrorBoundary";
import {
  CommandCodeOutput,
  commandCodeLanguage,
  type CommandCodeTarget,
} from "./CommandCodeOutput";
import { CommandOutputPanel, useCommandOutputStreaming } from "./CommandOutputPanel";
import { MessageCopyButton } from "./MessageCopyButton";
import { resolveExternalWebLinkHref } from "./externalLinkContextMenu";
import type { ExpandedImagePreview } from "./ExpandedImagePreview";
import { ShellCommandBlock } from "./ShellCommandBlock";
import type { TurnItemSource } from "./timelineRowContext";

interface V2ItemInspectorProps {
  readonly projectedItem: OrchestrationV2ProjectedTurnItem;
  readonly environmentId: EnvironmentId;
  readonly cwd?: string | undefined;
  readonly workspaceRoot?: string | undefined;
  readonly onOpenToolDiff?: ((target: ToolCallDiffTarget) => void) | undefined;
  readonly onImageExpand?: ((preview: ExpandedImagePreview) => void) | undefined;
  readonly source?: TurnItemSource | undefined;
}

function SyntaxTokens({
  text,
  language,
}: {
  readonly text: string;
  readonly language: "json" | "typescript";
}) {
  const resolvedTheme = useRenderedAppearance();
  const highlighter = use(getSyntaxHighlighterPromise(language));
  const { tokens } = highlighter.codeToTokens(text, {
    lang: language,
    theme: resolveDiffThemeName(resolvedTheme),
  });
  return tokens.flatMap((line, lineIndex) => [
    lineIndex > 0 ? "\n" : "",
    ...line.map((token) => (
      <span key={token.offset} style={{ color: token.color }}>
        {token.content}
      </span>
    )),
  ]);
}

const monoClassName =
  "font-mono text-(length:--font-size-code,var(--text-2xs)) leading-relaxed whitespace-pre-wrap break-words select-text";

function isJsonText(text: string): boolean {
  if (!text) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function StructuredValue({
  value,
  highlightJson = false,
  language,
}: {
  readonly value: unknown;
  readonly highlightJson?: boolean;
  readonly language?: "typescript";
}) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const isJson = highlightJson && isJsonText(text);
  if (!text) return null;
  return (
    <pre className={cn("max-h-80 overflow-auto text-muted-foreground", monoClassName)}>
      {language || isJson ? (
        <RenderErrorBoundary fallback={text}>
          <Suspense fallback={text}>
            <SyntaxTokens text={text} language={language ?? "json"} />
          </Suspense>
        </RenderErrorBoundary>
      ) : (
        text
      )}
    </pre>
  );
}

function useFetchedTurnItem(
  projectedItem: OrchestrationV2ProjectedTurnItem,
  environmentId: EnvironmentId,
  source: TurnItemSource | undefined,
  skip = false,
) {
  const wireItem = projectedItem.item;
  const fetches = !skip && turnItemNeedsDetailFetch(wireItem);
  const detail = useTurnItemDetail(
    fetches
      ? {
          environmentId,
          threadId: projectedItem.sourceThreadId,
          itemId: projectedItem.sourceItemId,
          revision: turnItemDetailRevision(wireItem),
        }
      : null,
    source?.detail,
  );
  const fetchedItem = detail.data?.item;
  const item = fetchedItem?.type === wireItem.type ? fetchedItem : wireItem;
  return {
    item,
    output: {
      output: turnItemOutputText(item),
      images: turnItemOutputImages(item),
      environmentId,
      pending: item === wireItem && detail.isPending,
      error:
        item !== wireItem
          ? null
          : detail.data?.item === null
            ? "Output is no longer available."
            : detail.error,
      empty: fetches && item !== wireItem,
    },
  };
}

interface ToolOutputState {
  readonly output: string | null;
  readonly images: ReturnType<typeof turnItemOutputImages>;
  readonly environmentId: EnvironmentId;
  readonly pending: boolean;
  readonly error: string | null;
  readonly empty: boolean;
  readonly onImageExpand?: ((preview: ExpandedImagePreview) => void) | undefined;
}

function ToolOutput(props: ToolOutputState) {
  const images = props.images.map((resource) => (
    <ChatMarkdownAssetImage
      key={resource.index}
      environmentId={props.environmentId}
      resource={resource}
      alt="Tool output image"
      maxHeightRem={16}
      onImageExpand={props.onImageExpand}
    />
  ));
  const text = props.output ? (
    <div className="max-h-80 overflow-auto text-muted-foreground">{props.output}</div>
  ) : props.pending ? (
    <div className="min-h-16 text-muted-foreground italic">Loading output…</div>
  ) : props.error ? (
    <div className="text-destructive">Couldn&apos;t load output: {props.error}</div>
  ) : props.empty && images.length === 0 ? (
    <div className="text-muted-foreground italic">No output.</div>
  ) : null;
  return (
    <>
      {images}
      {text}
    </>
  );
}

export function FetchedToolOutput(props: {
  readonly projectedItem: OrchestrationV2ProjectedTurnItem;
  readonly environmentId: EnvironmentId;
  readonly onImageExpand?: ((preview: ExpandedImagePreview) => void) | undefined;
  readonly source?: TurnItemSource | undefined;
}) {
  const { output } = useFetchedTurnItem(props.projectedItem, props.environmentId, props.source);
  return (
    <div className={cn("mt-1.5 space-y-1.5", monoClassName)}>
      <ToolOutput {...output} onImageExpand={props.onImageExpand} />
    </div>
  );
}

/**
 * A command's output alone, for the terminal card; it streams when the environment can. `lead`
 * scrolls with the output, as the command line does in Cursor's shell card.
 */
export function CommandItemOutput(props: {
  readonly projectedItem: OrchestrationV2ProjectedTurnItem;
  readonly environmentId: EnvironmentId;
  readonly source?: TurnItemSource | undefined;
  readonly code?: CommandCodeTarget | undefined;
  readonly lead?: ReactNode;
  readonly actions?: ReactNode;
  readonly scrollClassName?: string;
}) {
  const environmentStreamsOutput = useCommandOutputStreaming(props.environmentId);
  const streams = props.source !== undefined || environmentStreamsOutput;
  const { output } = useFetchedTurnItem(
    props.projectedItem,
    props.environmentId,
    props.source,
    streams,
  );
  const codeLanguage =
    props.code && output.output && !output.output.includes("\u001b")
      ? commandCodeLanguage(props.code, output.output)
      : null;
  return (
    <div className={cn("space-y-1.5", monoClassName)}>
      {streams ? (
        <CommandOutputPanel
          environmentId={props.environmentId}
          threadId={props.projectedItem.sourceThreadId}
          itemId={props.projectedItem.sourceItemId}
          source={props.source?.commandOutput}
          copyable
          code={props.code}
          lead={props.lead}
          actions={props.actions}
          {...(props.scrollClassName ? { scrollClassName: props.scrollClassName } : {})}
        />
      ) : (
        <>
          {output.output || props.actions ? (
            <div className="flex justify-end gap-0.5">
              {props.actions}
              {output.output ? (
                <MessageCopyButton
                  text={output.output}
                  label="Copy output"
                  size="icon-xs"
                  variant="ghost"
                />
              ) : null}
            </div>
          ) : null}
          <div className={cn("overflow-auto", props.scrollClassName ?? "max-h-80")}>
            {props.lead}
            {codeLanguage && output.output ? (
              <CommandCodeOutput
                text={output.output}
                language={codeLanguage}
                startLine={props.code?.startLine ?? 1}
              />
            ) : (
              <ToolOutput {...output} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ToolCallBody(
  props: ToolOutputState & {
    readonly command?: string;
    readonly args?: unknown;
    readonly toolName?: string | null;
    readonly exitCode?: number | undefined;
    /** Replaces fetched output. */
    readonly outputSlot?: ReactNode;
  },
) {
  const call = toolCallLines({ command: props.command, args: props.args });
  return (
    <div className={cn("space-y-1.5", monoClassName)}>
      {call.command ? <ShellCommandBlock command={call.command} /> : null}
      {call.args ? (
        <div className="text-foreground/85">
          {call.args.map(([key, value]) => (
            <div key={key}>
              <span className="text-muted-foreground">{key} </span>
              {key === "code" && isJavaScriptReplTool(props.toolName) ? (
                <StructuredValue value={value} language="typescript" />
              ) : (
                value
              )}
            </div>
          ))}
        </div>
      ) : null}
      {call.argsText ? <StructuredValue value={call.argsText} highlightJson /> : null}
      {props.outputSlot ?? <ToolOutput {...props} />}
      {props.exitCode !== undefined && props.exitCode !== 0 ? (
        <div className="text-destructive">exit {props.exitCode}</div>
      ) : null}
    </div>
  );
}

export const V2ItemInspector = memo(function V2ItemInspector(props: V2ItemInspectorProps) {
  // Command rows stream their output, including the final output, from the server.
  const environmentStreamsOutput = useCommandOutputStreaming(props.environmentId);
  const streamsOutput =
    (props.source !== undefined || environmentStreamsOutput) &&
    props.projectedItem.item.type === "command_execution";
  const fetched = useFetchedTurnItem(
    props.projectedItem,
    props.environmentId,
    props.source,
    streamsOutput,
  );
  const item = fetched.item;
  const outputState = fetched.output;
  return (
    <div className="space-y-2 text-xs" data-v2-item-inspector={item.type}>
      {item.type === "reasoning" && item.text ? (
        <div className="rounded-field bg-muted p-3 text-muted-foreground">
          <ChatMarkdown
            text={item.text}
            cwd={props.cwd}
            threadRef={{
              environmentId: props.environmentId,
              threadId: props.projectedItem.sourceThreadId,
            }}
            lineBreaks
          />
        </div>
      ) : null}

      {item.type === "command_execution" ? (
        <ToolCallBody
          command={item.input}
          exitCode={item.exitCode}
          {...outputState}
          onImageExpand={props.onImageExpand}
          outputSlot={
            streamsOutput ? (
              <CommandOutputPanel
                environmentId={props.environmentId}
                threadId={props.projectedItem.sourceThreadId}
                itemId={props.projectedItem.sourceItemId}
                source={props.source?.commandOutput}
              />
            ) : undefined
          }
        />
      ) : null}

      {item.type === "file_change" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-muted-foreground">
              {formatWorkspaceRelativePath(item.fileName, props.workspaceRoot)}
            </span>
            {item.additions !== undefined || item.deletions !== undefined ? (
              <span>
                <span className="text-diff-addition">+{formatDiffCount(item.additions ?? 0)}</span>{" "}
                <span className="text-diff-deletion">-{formatDiffCount(item.deletions ?? 0)}</span>
              </span>
            ) : null}
            {props.onOpenToolDiff ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  props.onOpenToolDiff?.({
                    threadId: props.projectedItem.sourceThreadId,
                    itemId: props.projectedItem.sourceItemId,
                    revision: turnItemDetailRevision(item),
                  })
                }
              >
                Open diff
              </Button>
            ) : null}
          </div>
          {item.status === "failed" && item.diffStr?.trim() ? (
            <StructuredValue value={item.diffStr} />
          ) : null}
          {item.changes !== undefined && item.changes.length > 0 ? (
            <ul className="space-y-1 font-mono text-muted-foreground">
              {item.changes.map((change) => (
                <li key={JSON.stringify([change.operation, change.oldPath, change.path])}>
                  {change.operation} {change.oldPath ? `${change.oldPath} → ` : ""}
                  {formatWorkspaceRelativePath(change.path, props.workspaceRoot)}
                  {change.fileType || change.mimeType
                    ? ` (${[change.fileType, change.mimeType].filter(Boolean).join(", ")})`
                    : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {item.type === "file_search" && item.pattern?.trim() ? (
        <div className={cn("text-foreground/85", monoClassName)}>{item.pattern}</div>
      ) : null}

      {item.type === "web_search" && item.patterns?.length ? (
        <div className={cn("text-foreground/85", monoClassName)}>{item.patterns.join("\n")}</div>
      ) : null}

      {item.type === "file_search" && item.results?.length ? (
        <ul className="space-y-1">
          {item.results.map((result) => (
            <li key={JSON.stringify(result)}>
              <span className="font-mono text-foreground/80">
                {formatWorkspaceRelativePath(result.fileName, props.workspaceRoot)}
                {result.line === undefined ? "" : `:${result.line}`}
                {result.column === undefined ? "" : `:${result.column}`}
              </span>
              {result.preview ? (
                <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{result.preview}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {item.type === "web_search" && item.results?.length ? (
        <ul className="space-y-1.5">
          {item.results.map((result) => {
            const safeHref = resolveExternalWebLinkHref(result.url);
            return (
              <li key={JSON.stringify(result)}>
                {safeHref ? (
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    {result.title ?? result.url}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                ) : (
                  <p className="font-medium text-foreground">
                    {result.title ?? result.url ?? "Search result"}
                  </p>
                )}
                {result.snippet ? <p className="text-muted-foreground">{result.snippet}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {item.type === "dynamic_tool" ? (
        <ToolCallBody
          toolName={item.toolName}
          args={item.input}
          {...outputState}
          onImageExpand={props.onImageExpand}
        />
      ) : null}

      {item.type === "approval_request" ? <StructuredValue value={item.prompt} /> : null}
      {item.type === "user_input_request" ? (
        <StructuredValue
          value={item.questions
            .map((question) =>
              [question.question, ...question.options.map((option) => `• ${option.label}`)].join(
                "\n",
              ),
            )
            .join("\n\n")}
        />
      ) : null}
      {item.type === "notification" ? <StructuredValue value={item.detail} /> : null}
      {item.type === "system_notice" ? <StructuredValue value={item.message} /> : null}
      {item.type === "error" ? <StructuredValue value={item.failure.message} /> : null}
      {item.type === "todo_list" ? (
        <ul aria-label="To-dos" className="space-y-0.5 rounded-field bg-muted px-3 py-2 text-sm">
          {item.steps.map((step, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- steps have no id and keep their order
            <li key={index} className="flex min-h-7 items-start gap-2">
              <span className="flex h-6 shrink-0 items-center">
                {step.status === "completed" ? (
                  <CircleCheckIcon aria-label="Done" className="size-4 text-success" />
                ) : step.status === "running" ? (
                  <CircleDotIcon aria-label="In progress" className="size-4 text-foreground" />
                ) : (
                  <CircleIcon aria-label="To do" className="size-4 text-icon-muted" />
                )}
              </span>
              <span
                className={cn(
                  "min-w-0 py-0.5 leading-5",
                  step.status === "completed"
                    ? "text-muted-foreground line-through"
                    : "text-foreground",
                )}
              >
                {step.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
