import { ChevronDownIcon, PaperclipIcon } from "lucide-react";

import { Button } from "../ui/button";

export function WorkspaceFileDropOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-primary/[0.035]"
      data-chat-workspace-drop-overlay="true"
    >
      <div
        role="status"
        className="flex items-center gap-2 rounded-full border border-primary/25 bg-background/95 px-4 py-2.5 text-sm font-medium text-foreground shadow-lg"
      >
        <PaperclipIcon className="size-4 text-primary" aria-hidden="true" />
        Drop files to attach
      </div>
    </div>
  );
}

/**
 * Sits `bottom` pixels up, clear of the composer and its attached banners. The summary names
 * what waits at the end of the timeline, which is out of view while it shows. Stays mounted
 * while hidden so it can fade out.
 */
export function ScrollToEndButton(props: {
  readonly visible: boolean;
  readonly bottom: number;
  /** While a turn runs, the end holds work the user has not seen yet. */
  readonly newActivity: boolean;
  readonly summary: string | null;
  readonly onScrollToEnd: () => void;
}) {
  return (
    <div
      className="chat-scroll-to-bottom pointer-events-none absolute z-30 flex translate-y-1 justify-center py-1.5 opacity-0 transition-[opacity,translate] duration-exit ease-in-exit data-visible:translate-y-0 data-visible:animate-rise-in data-visible:opacity-100 data-visible:duration-enter data-visible:ease-out motion-reduce:translate-y-0 motion-reduce:data-visible:animate-none"
      style={{ bottom: props.bottom }}
      data-visible={props.visible || undefined}
      inert={!props.visible}
    >
      <Button
        data-scroll-to-end="true"
        onPointerDown={(event) => event.preventDefault()}
        onClick={props.onScrollToEnd}
        className="in-data-visible:pointer-events-auto"
        size="xs"
        variant="glass"
      >
        <ChevronDownIcon className="size-3.5" />
        {props.newActivity ? "New activity" : "Scroll to end"}
        {props.summary === null ? null : (
          <span className="text-muted-foreground">
            <span aria-hidden>· </span>
            {props.summary}
          </span>
        )}
      </Button>
    </div>
  );
}
