import type { ChatAttachmentId, EnvironmentId, ScopedThreadRef } from "@marp/contracts";
import {
  HTML_RENDER_COLUMN_WIDTH,
  htmlRenderFileName,
  htmlRenderFrameHeight,
  stripHtmlRenderBootstrap,
  type HtmlRenderReference,
} from "@marp/shared/htmlRender";
import { Check, Copy } from "lucide";
import { Maximize2Icon, PanelRightIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";

import { useAssetUrlRefresh } from "~/assets/assetUrls";
import { useLongLivedAssetUrl } from "~/assets/longLivedAssetUrls";
import { MorphIcon } from "~/components/MorphIcon";
import { useCopyToClipboard } from "~/hooks/useCopyToClipboard";
import { observeIntersection } from "~/lib/observeIntersection";
import { observeResize } from "~/lib/observeResize";
import { cn } from "~/lib/utils";
import { useRightPanelStore } from "~/rightPanelStore";

import { HtmlRenderDocument } from "../files/BrowserDocumentFrame";
import {
  ANCHORED_COPY_TOAST_TIMEOUT_MS,
  showAnchoredCopyErrorToast,
  showAnchoredCopySuccessToast,
} from "../ui/anchoredCopyToast";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { toastManager } from "../ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { HtmlRenderDialog } from "./HtmlRenderDialog";

const MIN_URL_LIFE_MS = 5 * 60_000;
/** Taller pages scroll inside the card so one chart cannot take over the thread. */
const HTML_RENDER_CARD_MAX_HEIGHT = 480;
const NEAR_VIEWPORT_MARGIN = "400px";

/**
 * An agent's `html_render` page, inline in the reply. The frame and its URL
 * mount only once the card nears the viewport, so old turns cost nothing.
 */
export function HtmlRenderFrame(props: {
  readonly environmentId: EnvironmentId;
  readonly htmlRender: HtmlRenderReference;
  readonly threadRef: ScopedThreadRef | undefined;
  readonly onFullscreenChange?: (fullscreen: boolean) => void;
}) {
  const { title } = props.htmlRender;
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");
  const [width, setWidth] = useState(HTML_RENDER_COLUMN_WIDTH);
  // Client fonts can exceed the server-measured height and cause nested scrolling.
  const [contentHeight, setContentHeight] = useState<number>();
  const pageHeight = htmlRenderFrameHeight(props.htmlRender, width, contentHeight);
  const observeBody = (body: HTMLDivElement) => {
    setWidth(body.clientWidth);
    const stopResize = observeResize(body, ([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    const stopIntersection = near
      ? undefined
      : observeIntersection(
          body,
          (entry) => {
            if (entry.isIntersecting) setNear(true);
          },
          { rootMargin: NEAR_VIEWPORT_MARGIN },
        );
    return () => {
      stopResize();
      stopIntersection?.();
    };
  };

  return (
    <section aria-label={title} className="min-w-0">
      {near ? (
        <HtmlRenderCardContent
          {...props}
          pageHeight={pageHeight}
          observeBody={observeBody}
          onContentHeight={setContentHeight}
        />
      ) : (
        <>
          <HtmlRenderCardHeader title={title} />
          <div ref={observeBody} style={{ height: cardBodyHeight(pageHeight) }}>
            <Skeleton shape="card" className="size-full" />
          </div>
        </>
      )}
    </section>
  );
}

function cardBodyHeight(pageHeight: number) {
  return Math.min(pageHeight, HTML_RENDER_CARD_MAX_HEIGHT);
}

function HtmlRenderCardHeader(props: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div className="flex h-7 min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 truncate text-muted-foreground text-xs">{props.title}</span>
      {props.children}
    </div>
  );
}

function HtmlRenderCardContent(props: {
  readonly environmentId: EnvironmentId;
  readonly htmlRender: HtmlRenderReference;
  readonly threadRef: ScopedThreadRef | undefined;
  readonly onFullscreenChange?: ((fullscreen: boolean) => void) | undefined;
  readonly pageHeight: number;
  readonly observeBody: (body: HTMLDivElement) => () => void;
  readonly onContentHeight: (height: number) => void;
}) {
  const { attachmentId, title } = props.htmlRender;
  const fileName = htmlRenderFileName(title);
  const resource = {
    _tag: "attachment" as const,
    attachmentId,
    fileName,
    mimeType: "text/html",
    disposition: "inline" as const,
  };
  // The frame keeps the first URL it loads, so later mints do not reload the page.
  const [loaded, setLoaded] = useState<{ src: string; expiresAt: number } | null>(null);
  const assetUrl = useLongLivedAssetUrl(loaded === null ? props.environmentId : null, resource);
  if (loaded === null && assetUrl._tag === "Success") {
    setLoaded({ src: assetUrl.url, expiresAt: assetUrl.expiresAt });
  }
  const src = loaded?.src ?? null;
  const failed = loaded === null && assetUrl._tag === "Failure";
  const [frameLoaded, setFrameLoaded] = useState(false);
  const refresh = useAssetUrlRefresh(props.environmentId, resource);
  const freshUrl = async () =>
    loaded !== null && loaded.expiresAt - Date.now() > MIN_URL_LIFE_MS
      ? loaded.src
      : await refresh().catch(() => null);
  const [expandedSrc, setExpandedSrc] = useState<string | null>(null);
  const { onFullscreenChange, threadRef } = props;
  // Tied to the viewer's lifetime: unmounting while expanded must still release
  // the timeline's follow pin, which a close handler alone never reaches.
  const expanded = expandedSrc !== null;
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- holds the parent's fullscreen pin while expanded and releases it on collapse or unmount
  useEffect(() => {
    if (!expanded) return;
    onFullscreenChange?.(true);
    return () => onFullscreenChange?.(false);
  }, [expanded, onFullscreenChange]);
  const unavailable = () =>
    toastManager.add({
      type: "error",
      title: "Page unavailable",
      description: "Reconnect to the environment and try again.",
    });

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard<void>({
    target: "HTML",
    onCopy: () => showAnchoredCopySuccessToast(copyButtonRef),
    onError: (error: Error) => showAnchoredCopyErrorToast(copyButtonRef, error),
    timeout: ANCHORED_COPY_TOAST_TIMEOUT_MS,
  });
  const copyHtml = async () => {
    const url = await freshUrl();
    const html =
      url === null
        ? null
        : await fetch(url)
            .then((response) => (response.ok ? response.text() : null))
            .catch(() => null);
    if (html === null) unavailable();
    else copyToClipboard(stripHtmlRenderBootstrap(html));
  };

  if (failed) {
    return (
      <p role="alert" className="truncate py-1 text-muted-foreground text-xs">
        Unable to load {title}
      </p>
    );
  }
  const { observeBody, pageHeight } = props;
  const bodyHeight = cardBodyHeight(pageHeight);
  return (
    <>
      <HtmlRenderCardHeader title={title}>
        {threadRef !== undefined ? (
          <HtmlRenderCardAction
            label="Open in right panel"
            disabled={src === null}
            onClick={() =>
              useRightPanelStore.getState().openAttachment(threadRef, {
                type: "file",
                id: attachmentId as ChatAttachmentId,
                name: fileName,
                mimeType: "text/html",
                sizeBytes: 0,
                htmlRender: true,
              })
            }
          >
            <PanelRightIcon />
          </HtmlRenderCardAction>
        ) : null}
        <HtmlRenderCardAction
          label="Open full screen"
          disabled={src === null}
          onClick={async () => {
            const url = await freshUrl();
            if (url !== null) setExpandedSrc(url);
            else unavailable();
          }}
        >
          <Maximize2Icon />
        </HtmlRenderCardAction>
        <HtmlRenderCardAction
          ref={copyButtonRef}
          label="Copy HTML"
          disabled={src === null || isCopied}
          onClick={copyHtml}
        >
          <MorphIcon
            className={cn("size-3.5", isCopied && "text-primary")}
            icon={isCopied ? Check : Copy}
          />
        </HtmlRenderCardAction>
      </HtmlRenderCardHeader>
      <div
        ref={observeBody}
        className={cn("relative", pageHeight > bodyHeight && "overflow-y-auto overscroll-contain")}
        style={{ height: bodyHeight }}
      >
        {src !== null ? (
          <div style={{ height: pageHeight }}>
            <HtmlRenderDocument
              src={src}
              title={title}
              threadRef={threadRef}
              className="block size-full"
              onContentHeight={props.onContentHeight}
              onLoad={() => setFrameLoaded(true)}
              onFullscreenChange={onFullscreenChange}
            />
          </div>
        ) : null}
        {frameLoaded ? null : (
          <Skeleton
            shape="card"
            role="status"
            aria-label={`Loading ${title}`}
            className="absolute inset-0"
          />
        )}
      </div>
      {expandedSrc !== null ? (
        <HtmlRenderDialog
          src={expandedSrc}
          title={title}
          threadRef={threadRef}
          onClose={() => setExpandedSrc(null)}
        />
      ) : null}
    </>
  );
}

function HtmlRenderCardAction({
  ref,
  ...props
}: {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly ref?: Ref<HTMLButtonElement>;
  readonly children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            ref={ref}
            aria-label={props.label}
            size="icon-xs"
            variant="ghost-muted"
            disabled={props.disabled}
            onClick={props.onClick}
          />
        }
      >
        {props.children}
      </TooltipTrigger>
      <TooltipPopup side="top">{props.label}</TooltipPopup>
    </Tooltip>
  );
}
