import { useSyncExternalStore } from "react";

import { isElectron } from "~/env";

import { isMacPlatform, isWindowsPlatform } from "./utils";

const WCO_CLASS_NAME = "wco";
const ELECTRON_CLASS_NAME = "electron";
const ELECTRON_WINDOWS_CLASS_NAME = "electron-windows";
const CUSTOM_WINDOW_CONTROLS_CLASS_NAME = "custom-window-controls";
// The desktop window controls (macOS traffic lights, WindowControls elsewhere) stay inside this
// topbar at every zoom level, drawn over the page like a native caption strip.
const DESKTOP_TITLEBAR_HEIGHT = 52;

/** Windows and Linux desktop windows have no native caption buttons; WindowControls draws them. */
export const hasCustomWindowControls = isElectron && !isMacPlatform(navigator.platform);

interface WindowControlsOverlayLike {
  readonly visible: boolean;
  getTitlebarAreaRect(): DOMRect;
  addEventListener(type: "geometrychange", listener: EventListener): void;
  removeEventListener(type: "geometrychange", listener: EventListener): void;
}

interface NavigatorWithWindowControlsOverlay extends Navigator {
  readonly windowControlsOverlay?: WindowControlsOverlayLike;
}

function getWindowControlsOverlay(): WindowControlsOverlayLike | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as NavigatorWithWindowControlsOverlay).windowControlsOverlay ?? null;
}

/** Height of the window-controls strip drawn over the page, or 0 when the window has none. */
export function windowControlsOverlayHeight(): number {
  if (hasCustomWindowControls) return DESKTOP_TITLEBAR_HEIGHT;
  const overlay = getWindowControlsOverlay();
  return overlay?.visible ? overlay.getTitlebarAreaRect().height : 0;
}

export function onWindowControlsOverlayGeometryChange(listener: () => void): () => void {
  const overlay = getWindowControlsOverlay();
  if (!overlay) {
    return () => {};
  }

  overlay.addEventListener("geometrychange", listener);
  return () => {
    overlay.removeEventListener("geometrychange", listener);
  };
}

export function syncDocumentWindowControlsOverlayClass(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const overlay = getWindowControlsOverlay();
  const update = () => {
    document.documentElement.classList.toggle(WCO_CLASS_NAME, overlay !== null && overlay.visible);
  };

  update();
  return onWindowControlsOverlayGeometryChange(update);
}

function subscribeTitlebarArea(listener: () => void): () => void {
  const overlay = getWindowControlsOverlay();
  overlay?.addEventListener("geometrychange", listener);
  return () => overlay?.removeEventListener("geometrychange", listener);
}

function getNativeTitlebarHeight(): number {
  if (isElectron) return DESKTOP_TITLEBAR_HEIGHT;
  const overlay = getWindowControlsOverlay();
  return overlay?.visible ? overlay.getTitlebarAreaRect().bottom : 0;
}

export function useNativeTitlebarHeight(): number {
  return useSyncExternalStore(subscribeTitlebarArea, getNativeTitlebarHeight, () => 0);
}

function getElectronPlatformClassNames(platform: string): readonly string[] {
  return [
    ELECTRON_CLASS_NAME,
    ...(isWindowsPlatform(platform) ? [ELECTRON_WINDOWS_CLASS_NAME] : []),
    ...(isMacPlatform(platform) ? [] : [CUSTOM_WINDOW_CONTROLS_CLASS_NAME]),
  ];
}

export function syncDocumentElectronPlatformClasses(platform: string): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  const classNames = getElectronPlatformClassNames(platform);
  document.documentElement.classList.add(...classNames);
  return () => {
    document.documentElement.classList.remove(...classNames);
  };
}
