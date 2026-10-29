import type { ContextMenuItem } from "@marp/contracts";

const SVG_NS = "http://www.w3.org/2000/svg";

const ICON_PATHS: Record<string, ReadonlyArray<{ tag: string; attrs: Record<string, string> }>> = {
  archive: [
    { tag: "rect", attrs: { width: "20", height: "5", x: "2", y: "3", rx: "1" } },
    { tag: "path", attrs: { d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" } },
    { tag: "path", attrs: { d: "M10 12h4" } },
  ],
  check: [{ tag: "path", attrs: { d: "M20 6 9 17l-5-5" } }],
  "arrow-down": [
    { tag: "path", attrs: { d: "M12 5v14" } },
    { tag: "path", attrs: { d: "m19 12-7 7-7-7" } },
  ],
  "at-sign": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } },
    { tag: "path", attrs: { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" } },
  ],
  "chevron-down": [{ tag: "path", attrs: { d: "m6 9 6 6 6-6" } }],
  clipboard: [
    { tag: "rect", attrs: { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1" } },
    {
      tag: "path",
      attrs: {
        d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
      },
    },
  ],
  download: [
    { tag: "path", attrs: { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" } },
    { tag: "path", attrs: { d: "m7 10 5 5 5-5" } },
    { tag: "path", attrs: { d: "M12 15V3" } },
  ],
  "external-link": [
    { tag: "path", attrs: { d: "M15 3h6v6" } },
    { tag: "path", attrs: { d: "M10 14 21 3" } },
    { tag: "path", attrs: { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" } },
  ],
  file: [
    { tag: "path", attrs: { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" } },
    { tag: "path", attrs: { d: "M14 2v4a2 2 0 0 0 2 2h4" } },
  ],
  globe: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" } },
    { tag: "path", attrs: { d: "M2 12h20" } },
  ],
  image: [
    { tag: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" } },
    { tag: "circle", attrs: { cx: "9", cy: "9", r: "2" } },
    { tag: "path", attrs: { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" } },
  ],
  link: [
    { tag: "path", attrs: { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" } },
    { tag: "path", attrs: { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" } },
  ],
  plus: [
    { tag: "path", attrs: { d: "M5 12h14" } },
    { tag: "path", attrs: { d: "M12 5v14" } },
  ],
  unlink: [
    {
      tag: "path",
      attrs: {
        d: "m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71",
      },
    },
    {
      tag: "path",
      attrs: {
        d: "m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71",
      },
    },
    { tag: "path", attrs: { d: "M8 2v3" } },
    { tag: "path", attrs: { d: "M2 8h3" } },
    { tag: "path", attrs: { d: "M16 19v3" } },
    { tag: "path", attrs: { d: "M19 16h3" } },
  ],
  x: [
    { tag: "path", attrs: { d: "M18 6 6 18" } },
    { tag: "path", attrs: { d: "m6 6 12 12" } },
  ],
  timer: [
    { tag: "line", attrs: { x1: "10", x2: "14", y1: "2", y2: "2" } },
    { tag: "line", attrs: { x1: "12", x2: "15", y1: "14", y2: "11" } },
    { tag: "circle", attrs: { cx: "12", cy: "14", r: "8" } },
  ],
  "chevron-right": [{ tag: "path", attrs: { d: "m9 19 7-7-7-7" } }],
  "circle-check": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-4" } },
  ],
  "circle-stop": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "rect", attrs: { x: "9", y: "9", width: "6", height: "6", rx: "1" } },
  ],
  clock: [
    { tag: "path", attrs: { d: "M12 6v6l4 2" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
  ],
  pencil: [
    {
      tag: "path",
      attrs: {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      },
    },
    { tag: "path", attrs: { d: "m15 5 4 4" } },
  ],
  copy: [
    { tag: "rect", attrs: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" } },
    { tag: "path", attrs: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" } },
  ],
  folder: [
    {
      tag: "path",
      attrs: {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    },
  ],
  "git-branch": [
    { tag: "line", attrs: { x1: "6", x2: "6", y1: "3", y2: "15" } },
    { tag: "circle", attrs: { cx: "18", cy: "6", r: "3" } },
    { tag: "circle", attrs: { cx: "6", cy: "18", r: "3" } },
    { tag: "path", attrs: { d: "M18 9a9 9 0 0 1-9 9" } },
  ],
  hash: [
    { tag: "line", attrs: { x1: "4", x2: "20", y1: "9", y2: "9" } },
    { tag: "line", attrs: { x1: "4", x2: "20", y1: "15", y2: "15" } },
    { tag: "line", attrs: { x1: "10", x2: "8", y1: "3", y2: "21" } },
    { tag: "line", attrs: { x1: "16", x2: "14", y1: "3", y2: "21" } },
  ],
  "mail-open": [
    {
      tag: "path",
      attrs: {
        d: "M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z",
      },
    },
    { tag: "path", attrs: { d: "m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" } },
  ],
  "message-square": [
    {
      tag: "path",
      attrs: {
        d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
      },
    },
  ],
  "message-square-plus": [
    {
      tag: "path",
      attrs: {
        d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
      },
    },
    { tag: "path", attrs: { d: "M12 8v6" } },
    { tag: "path", attrs: { d: "M9 11h6" } },
  ],
  pin: [
    { tag: "path", attrs: { d: "M12 17v5" } },
    {
      tag: "path",
      attrs: {
        d: "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z",
      },
    },
  ],
  "pin-off": [
    { tag: "path", attrs: { d: "M12 17v5" } },
    { tag: "path", attrs: { d: "M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89" } },
    { tag: "path", attrs: { d: "m2 2 20 20" } },
    {
      tag: "path",
      attrs: {
        d: "M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11",
      },
    },
  ],
  "refresh-cw": [
    { tag: "path", attrs: { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" } },
    { tag: "path", attrs: { d: "M21 3v5h-5" } },
    { tag: "path", attrs: { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" } },
    { tag: "path", attrs: { d: "M8 16H3v5" } },
  ],
  settings: [
    {
      tag: "path",
      attrs: {
        d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",
      },
    },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "3" } },
  ],
  "user-plus": [
    { tag: "path", attrs: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "4" } },
    { tag: "line", attrs: { x1: "19", x2: "19", y1: "8", y2: "14" } },
    { tag: "line", attrs: { x1: "22", x2: "16", y1: "11", y2: "11" } },
  ],
  "folder-plus": [
    { tag: "path", attrs: { d: "M12 10v6" } },
    { tag: "path", attrs: { d: "M9 13h6" } },
    {
      tag: "path",
      attrs: {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    },
  ],
  "folder-tree": [
    {
      tag: "path",
      attrs: {
        d: "M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      },
    },
    {
      tag: "path",
      attrs: {
        d: "M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",
      },
    },
    { tag: "path", attrs: { d: "M3 5a2 2 0 0 0 2 2h3" } },
    { tag: "path", attrs: { d: "M3 3v13a2 2 0 0 0 2 2h3" } },
  ],
  "text-search": [
    { tag: "path", attrs: { d: "M21 5H3" } },
    { tag: "path", attrs: { d: "M10 12H3" } },
    { tag: "path", attrs: { d: "M10 19H3" } },
    { tag: "circle", attrs: { cx: "17", cy: "15", r: "3" } },
    { tag: "path", attrs: { d: "m21 19-1.9-1.9" } },
  ],
  trash: [
    { tag: "path", attrs: { d: "M3 6h18" } },
    { tag: "path", attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" } },
    { tag: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
    { tag: "line", attrs: { x1: "10", x2: "10", y1: "11", y2: "17" } },
    { tag: "line", attrs: { x1: "14", x2: "14", y1: "11", y2: "17" } },
  ],
};

function createIconElement(name: string, className: string): SVGSVGElement | null {
  const paths = ICON_PATHS[name];
  if (!paths || typeof document.createElementNS !== "function") {
    return null;
  }
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", className);
  for (const node of paths) {
    const child = document.createElementNS(SVG_NS, node.tag);
    for (const [key, value] of Object.entries(node.attrs)) {
      child.setAttribute(key, value);
    }
    svg.appendChild(child);
  }
  return svg;
}

const MAC_MODIFIER_SYMBOLS = new Set(["⌃", "⌥", "⇧", "⌘"]);

/** One chip per key, like the rest of the app: "Ctrl+Shift+S" and "⇧⌘S" both become three. */
function splitShortcutLabel(label: string): string[] {
  if (label.length > 1 && label.includes("+")) {
    const keys = label.split("+").filter((key) => key.length > 0);
    return label.endsWith("++") ? [...keys, "+"] : keys;
  }
  const keys: string[] = [];
  let rest = label;
  while (rest.length > 1 && MAC_MODIFIER_SYMBOLS.has(rest[0]!)) {
    keys.push(rest[0]!);
    rest = rest.slice(1);
  }
  return rest.length > 0 ? [...keys, rest] : keys;
}

const VIEWPORT_MARGIN = 8;

interface MenuAnchor {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Opens toward the preferred corner, flips across the anchor when that side lacks room, then shifts inside. */
function placeMenu(menu: HTMLDivElement, anchor: MenuAnchor) {
  // Layout sizes: getBoundingClientRect would include the pop-in scale.
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
  const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;
  const flipX = anchor.right > maxLeft && anchor.left - width >= VIEWPORT_MARGIN;
  const flipY = anchor.top > maxTop && anchor.bottom - height >= VIEWPORT_MARGIN;
  const left = flipX ? anchor.left - width : anchor.right;
  const top = flipY ? anchor.bottom - height : anchor.top;
  menu.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft))}px`;
  menu.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop))}px`;
  menu.style.transformOrigin = `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`;
}

function isNodeWithinMenuStack(target: EventTarget | null, menuStack: readonly HTMLDivElement[]) {
  if (typeof Node !== "undefined" && target instanceof Node) {
    return menuStack.some((menu) => menu.contains(target));
  }
  if (!target || typeof target !== "object") {
    return false;
  }

  let current: unknown = target;
  while (current && typeof current === "object") {
    if (menuStack.includes(current as HTMLDivElement)) {
      return true;
    }
    current = (current as { parent?: unknown }).parent;
  }
  return false;
}

let activeContextMenuDismiss: ((restoreFocus?: boolean) => void) | null = null;

export function isContextMenuOpen(): boolean {
  return activeContextMenuDismiss !== null;
}

export function dismissContextMenu(restoreFocus = true): void {
  activeContextMenuDismiss?.(restoreFocus);
  activeContextMenuDismiss = null;
}

export function showContextMenuFallback<T extends string>(
  items: readonly ContextMenuItem<T>[],
  position?: { x: number; y: number },
): Promise<T | null> {
  dismissContextMenu();
  return new Promise<T | null>((resolve) => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const menuStack: HTMLDivElement[] = [];
    const submenuTriggerStack: Array<HTMLButtonElement | undefined> = [];
    let isDisposed = false;
    let canDismissFromPointer = false;

    const dismiss = (restoreFocus = true) => cleanup(null, restoreFocus);

    const cleanup = (result: T | null, restoreFocus = true) => {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
      if (activeContextMenuDismiss === dismiss) {
        activeContextMenuDismiss = null;
      }
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("blur", onWindowBlur);
      const shouldRestoreFocus =
        restoreFocus && isNodeWithinMenuStack(document.activeElement, menuStack);
      for (const menu of menuStack) {
        menu.remove();
      }
      if (shouldRestoreFocus && previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus({ preventScroll: true });
      }
      resolve(result);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const level = menuStack.findIndex((menu) =>
        isNodeWithinMenuStack(document.activeElement, [menu]),
      );
      if (level < 0) return;
      const menu = menuStack[level]!;
      const buttons = [...menu.querySelectorAll<HTMLButtonElement>("button")].filter(
        (button) => !button.disabled,
      );
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      let target: HTMLButtonElement | undefined;
      switch (event.key) {
        case "ArrowDown":
          target = buttons[(index + 1) % buttons.length];
          break;
        case "ArrowUp":
          target =
            buttons[(index < 0 ? buttons.length - 1 : index - 1 + buttons.length) % buttons.length];
          break;
        case "Home":
          target = buttons[0];
          break;
        case "End":
          target = buttons.at(-1);
          break;
        case "ArrowRight":
          if (buttons[index]?.getAttribute("aria-haspopup") !== "menu") return;
          buttons[index]?.click();
          break;
        case " ":
        case "Enter":
          // Keyboard activation must not depend on the opening pointer gesture's frame.
          canDismissFromPointer = true;
          buttons[index]?.click();
          break;
        case "ArrowLeft":
          if (level === 0) return;
        // Fall through to cancel this submenu only.
        case "Escape": {
          const parent = submenuTriggerStack[level];
          if (parent) {
            parent.focus({ preventScroll: true });
            closeMenusFromLevel(level);
          } else cleanup(null);
          break;
        }
        case "Tab":
          // Tab closes the menu and continues from the element that opened it.
          cleanup(null);
          return;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (target && target !== submenuTriggerStack[level + 1]) closeMenusFromLevel(level + 1);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest" });
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isNodeWithinMenuStack(event.target, menuStack)) cleanup(null, false);
    };
    const onWindowBlur = () => cleanup(null, false);

    const onPointerDown = (event: PointerEvent) => {
      if (!canDismissFromPointer || isNodeWithinMenuStack(event.target, menuStack)) {
        return;
      }
      cleanup(null);
    };

    const onContextMenu = (event: MouseEvent) => {
      if (!canDismissFromPointer || isNodeWithinMenuStack(event.target, menuStack)) {
        return;
      }
      event.preventDefault();
      cleanup(null);
    };

    const closeMenusFromLevel = (level: number) => {
      while (menuStack.length > level) {
        submenuTriggerStack.pop()?.setAttribute("aria-expanded", "false");
        menuStack.pop()?.remove();
      }
    };

    const openMenu = (
      entries: readonly ContextMenuItem<T>[],
      anchor: MenuAnchor,
      level: number,
      parentTrigger?: HTMLButtonElement,
      parentLabel?: string,
    ) => {
      closeMenusFromLevel(level);

      const menu = document.createElement("div");
      // Electron drag regions swallow clicks on anything not opted out, even above them in z-order.
      menu.className =
        "fixed z-[10000] max-h-[calc(100vh-1rem)] min-w-[220px] max-w-[360px] overflow-y-auto overflow-x-hidden rounded-lg bg-popover p-1 font-sans text-[13px] text-foreground leading-5 shadow-pop outline-none [-webkit-app-region:no-drag] origin-top-left transition-[opacity,scale] duration-fast ease-out starting:scale-97 starting:opacity-0 motion-reduce:starting:scale-100";
      menu.style.left = `${anchor.right}px`;
      menu.style.top = `${anchor.top}px`;
      menu.dataset.level = String(level);
      menu.dataset.contextMenu = "true";
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", parentLabel ?? "Context menu");
      menu.tabIndex = -1;

      for (const item of entries) {
        if (item.separatorBefore === true && menu.children.length > 0) {
          const separator = document.createElement("div");
          separator.className = "my-1 h-px shrink-0 bg-border";
          separator.dataset.contextMenuSeparator = "true";
          separator.setAttribute("role", "separator");
          menu.appendChild(separator);
        }

        if (item.header === true) {
          const header = document.createElement("div");
          header.className = "truncate px-2 pt-2 pb-1 font-medium text-muted-foreground text-xs";
          header.textContent = item.label;
          menu.appendChild(header);
          continue;
        }

        const hasChildren = Array.isArray(item.children) && item.children.length > 0;
        const isLeafDestructive =
          !hasChildren && (item.destructive === true || item.id === ("delete" as T));

        const button = document.createElement("button");
        button.type = "button";
        const isDisabled = item.disabled === true;
        button.disabled = isDisabled;
        button.tabIndex = -1;
        button.setAttribute("role", "menuitem");
        button.setAttribute("aria-disabled", String(isDisabled));
        button.className = [
          "flex h-8 w-full cursor-default select-none items-center gap-2 whitespace-nowrap rounded-sm px-2.5 text-left outline-none transition-colors duration-100",
          isLeafDestructive
            ? "text-destructive"
            : "text-foreground/85 hover:text-foreground focus:text-foreground aria-expanded:text-foreground",
          isDisabled
            ? "pointer-events-none opacity-45"
            : "hover:bg-accent focus:bg-accent aria-expanded:bg-accent",
        ].join(" ");

        if (typeof item.checked === "boolean") {
          button.setAttribute("role", "menuitemradio");
          button.setAttribute("aria-checked", item.checked ? "true" : "false");
        }
        if (typeof item.icon === "string") {
          const icon = createIconElement(
            item.icon,
            isLeafDestructive ? "size-4 shrink-0" : "size-4 shrink-0 text-muted-foreground",
          );
          if (icon) button.appendChild(icon);
        }

        const label = document.createElement("span");
        label.className = "min-w-0 flex-1 truncate";
        label.textContent = item.label;
        button.appendChild(label);

        // Shortcuts, submenu chevrons and checks share the right edge and never shrink.
        const meta = document.createElement("span");
        meta.className = "ms-auto flex flex-none items-center gap-0.5 text-muted-foreground";
        meta.setAttribute("aria-hidden", "true");
        if (typeof item.shortcut === "string" && item.shortcut.length > 0) {
          for (const key of splitShortcutLabel(item.shortcut)) {
            const chip = document.createElement("kbd");
            chip.className =
              "inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] bg-foreground/[0.07] px-[5px] font-medium font-mono text-2xs text-muted-foreground";
            chip.textContent = key;
            meta.appendChild(chip);
          }
        }
        if (item.checked === true) {
          const check = createIconElement("check", "size-4 shrink-0 text-foreground");
          if (check) meta.appendChild(check);
        }
        if (hasChildren) {
          button.setAttribute("aria-haspopup", "menu");
          button.setAttribute("aria-expanded", "false");
          const chevron = createIconElement("chevron-right", "-me-0.5 size-3.5 shrink-0");
          if (chevron) {
            chevron.dataset.contextMenuChevron = "true";
            meta.appendChild(chevron);
          }
        }
        if (meta.children.length > 0) button.appendChild(meta);

        if (!isDisabled) {
          button.addEventListener("mouseenter", () => {
            button.focus({ preventScroll: true });
          });

          if (hasChildren) {
            const openSubmenu = (focusFirstItem = false) => {
              // Measured from layout, not the possibly mid-pop-in rect. The submenu's own
              // padding is subtracted so its first row lines up with the trigger.
              const menuLeft = Number.parseFloat(menu.style.left);
              const rowTop = Number.parseFloat(menu.style.top) + button.offsetTop - menu.scrollTop;
              openMenu(
                item.children!,
                {
                  left: menuLeft,
                  right: menuLeft + menu.offsetWidth,
                  top: rowTop - 4,
                  bottom: rowTop + button.offsetHeight + 4,
                },
                level + 1,
                button,
                item.label,
              );
              button.setAttribute("aria-expanded", "true");

              const childMenu = menuStack[level + 1];
              if (childMenu && focusFirstItem) {
                [...childMenu.querySelectorAll<HTMLButtonElement>("button")]
                  .find((childButton) => !childButton.disabled)
                  ?.focus();
              }
            };
            button.addEventListener("mouseenter", () => {
              openSubmenu();
            });
            button.addEventListener("click", (event) => {
              event.preventDefault();
              openSubmenu(true);
            });
          } else {
            button.addEventListener("mouseenter", () => {
              closeMenusFromLevel(level + 1);
            });
            button.addEventListener("click", () => {
              if (canDismissFromPointer) cleanup(item.id);
            });
          }
        }

        menu.appendChild(button);
      }

      menu.addEventListener("mouseenter", () => {
        closeMenusFromLevel(level + 1);
      });

      document.body.appendChild(menu);
      menuStack[level] = menu;
      submenuTriggerStack[level] = parentTrigger;
      placeMenu(menu, anchor);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    openMenu(items, { left: x, right: x, top: y, bottom: y }, 0);
    activeContextMenuDismiss = dismiss;
    // A keyboard-opened menu starts on its first action, a pointer-opened one on the menu itself.
    // Text fields always match :focus-visible, so they say nothing about how the menu opened.
    const firstAction =
      previouslyFocusedElement?.matches(":focus-visible") &&
      !previouslyFocusedElement.matches('input, textarea, select, [contenteditable="true"]')
        ? menuStack[0]?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        : null;
    (firstAction ?? menuStack[0])?.focus({ preventScroll: true });
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("blur", onWindowBlur);

    requestAnimationFrame(() => {
      canDismissFromPointer = true;
    });
  });
}
