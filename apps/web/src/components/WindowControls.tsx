import { Copy, Minus, Square, X, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "../lib/utils";
import { hasCustomWindowControls } from "../lib/windowControlsOverlay";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

// Cache the synchronous maximized-state IPC read until subscription.
let windowMaximizedSnapshot: boolean | null = null;

function subscribeToWindowMaximized(onChange: () => void): () => void {
  const unsubscribe = window.desktopBridge?.onWindowMaximizedStateChange((maximized) => {
    windowMaximizedSnapshot = maximized;
    onChange();
  });
  // The window may have changed state between the first render and this subscription.
  windowMaximizedSnapshot = null;
  return () => {
    unsubscribe?.();
    windowMaximizedSnapshot = null;
  };
}

function readWindowMaximized(): boolean {
  windowMaximizedSnapshot ??= window.desktopBridge?.getWindowMaximizedState() ?? false;
  return windowMaximizedSnapshot;
}

function WindowControlButton(props: {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly iconClassName: string;
  readonly close?: boolean;
  readonly onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={props.label}
            className={cn(
              "flex h-full w-(--window-control-width) cursor-default items-center justify-center text-muted-foreground outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              props.close
                ? "hover:bg-destructive hover:text-white active:bg-destructive/90 active:text-white md:rounded-tr-card"
                : "hover:bg-muted hover:text-foreground active:bg-surface-hover active:text-foreground",
            )}
            onClick={props.onClick}
          />
        }
      >
        <Icon aria-hidden className={props.iconClassName} strokeWidth={1.75} />
      </TooltipTrigger>
      <TooltipPopup side="bottom">{props.label}</TooltipPopup>
    </Tooltip>
  );
}

function WindowControlButtons() {
  const maximized = useSyncExternalStore(
    subscribeToWindowMaximized,
    readWindowMaximized,
    () => false,
  );
  const bridge = window.desktopBridge;
  return (
    <div className="fixed top-(--window-controls-top) right-(--window-controls-end) z-[120] flex h-(--window-controls-height) [-webkit-app-region:no-drag]">
      <WindowControlButton
        label="Minimize"
        icon={Minus}
        iconClassName="size-4"
        onClick={() => void bridge?.minimizeWindow()}
      />
      <WindowControlButton
        label={maximized ? "Restore" : "Maximize"}
        icon={maximized ? Copy : Square}
        iconClassName="size-3.5"
        onClick={() => void bridge?.toggleMaximizeWindow()}
      />
      <WindowControlButton
        label="Close"
        icon={X}
        iconClassName="size-4"
        close
        onClick={() => void bridge?.closeWindow()}
      />
    </div>
  );
}

/** Minimize, maximize and close for the frameless desktop window on Windows and Linux. */
export function WindowControls() {
  return hasCustomWindowControls ? <WindowControlButtons /> : null;
}
