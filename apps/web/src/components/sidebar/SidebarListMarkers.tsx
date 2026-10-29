import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRightIcon, HandIcon } from "lucide-react";
import { type ReactNode, useId, useLayoutEffect } from "react";
import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";
import {
  animateSidebarLayoutChanges,
  sidebarMarkerId,
  type SidebarListMarker,
} from "../Sidebar.logic";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { sidebarFolderRowId } from "./SidebarProjectFolderHeader";
import { SIDEBAR_SORTABLE_DRAG_DISABLED } from "./SidebarThreadRow";

function SortableSidebarMarker(props: {
  marker: SidebarListMarker;
  className?: string;
  children?: ReactNode;
  revealOverflow?: boolean;
  "data-testid"?: string;
}) {
  const { node, setNodeRef, transform, transition } = useSortable({
    id: sidebarMarkerId(props.marker),
    disabled: SIDEBAR_SORTABLE_DRAG_DISABLED,
    animateLayoutChanges: animateSidebarLayoutChanges,
  });
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- keeps the projected drop box inside the scroll viewport as drag transforms move it
  useLayoutEffect(() => {
    if (props.revealOverflow && transform?.y !== undefined) {
      node.current?.firstElementChild?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [node, props.revealOverflow, transform?.y]);
  return (
    <li
      ref={setNodeRef}
      data-thread-selection-safe
      data-testid={props["data-testid"]}
      className={cn("list-none", props.className)}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: props.marker.endsWith("-placeholder") ? "none" : transition,
        visibility: transform?.scaleY === 0 ? "hidden" : undefined,
      }}
    >
      {props.children}
    </li>
  );
}

export function SidebarSectionPlaceholder(props: {
  marker: "active-placeholder" | "settled-placeholder";
  label: string;
  showHint: boolean;
  isDropTarget: boolean;
}) {
  return (
    <SortableSidebarMarker
      marker={props.marker}
      data-testid={`sidebar-${props.marker}`}
      className="relative mx-0.5 -mb-px h-0"
      revealOverflow={props.marker === "settled-placeholder" && props.showHint}
    >
      {props.showHint ? (
        <div
          className={cn(
            "absolute inset-x-0 top-0 flex h-9 items-center justify-center rounded-md border border-dashed border-sidebar-foreground/25 text-xs text-sidebar-foreground/80",
            props.isDropTarget && "border-primary/40 bg-primary/5 text-primary",
          )}
        >
          {props.label}
        </div>
      ) : null}
    </SortableSidebarMarker>
  );
}

export function SidebarDragBoundary(props: {
  marker: "pinned-header" | "pinned-divider";
  label: string;
  visible: boolean;
  isDropTarget: boolean;
}) {
  return (
    <SortableSidebarMarker
      marker={props.marker}
      data-testid={`sidebar-${props.marker}`}
      className="pointer-events-none relative mx-0.5 -mb-px h-0"
    >
      {props.visible ? (
        <div className="sidebar-drag-boundary-label absolute inset-x-2 top-1 flex h-4 items-center gap-2">
          <span
            className={cn(
              "shrink-0 text-xs font-medium",
              props.isDropTarget ? "text-primary" : "text-sidebar-foreground/80",
            )}
          >
            {props.label}
          </span>
          <span
            aria-hidden
            className={cn(
              "h-px flex-1",
              props.isDropTarget ? "bg-primary/50" : "bg-sidebar-foreground/25",
            )}
          />
        </div>
      ) : null}
    </SortableSidebarMarker>
  );
}

export function SidebarSectionHeader(props: {
  marker: "working-header" | "snoozed-header" | "settled-header";
  label: string;
  /** A muted trailing count. */
  count: number;
  className?: string;
  dragging?: boolean;
  isDropTarget?: boolean;
  toggle: { expanded: boolean; onToggle: () => void };
}) {
  const shelf =
    props.marker === "working-header"
      ? "working"
      : props.marker === "snoozed-header"
        ? "snoozed"
        : "settled";
  return (
    <SortableSidebarMarker
      marker={props.marker}
      data-testid={`sidebar-${props.marker}`}
      className={cn("relative h-8", props.className)}
    >
      <button
        type="button"
        role="treeitem"
        tabIndex={-1}
        data-sidebar-row={`shelf:${shelf}`}
        aria-expanded={props.toggle.expanded}
        onClick={props.toggle.onToggle}
        data-testid={`sidebar-${shelf}-shelf-toggle`}
        className={cn(
          "group/shelf flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm font-medium outline-none transition-colors duration-150 hover:bg-sidebar-row-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none",
          props.isDropTarget
            ? "text-primary"
            : props.dragging
              ? "text-sidebar-foreground"
              : "text-muted-foreground",
        )}
      >
        <ChevronRightIcon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-placeholder transition-transform duration-200 motion-reduce:transition-none",
            props.toggle.expanded && "rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{props.label}</span>
        <span className="shrink-0 text-xs font-normal tabular-nums text-placeholder">
          {props.count}
        </span>
      </button>
    </SortableSidebarMarker>
  );
}

/** A section title such as "Pinned"; it lights up while a drag would drop into it. */
export function SidebarGroupLabel(props: { label: string; isDropTarget: boolean }) {
  return (
    <li
      aria-hidden
      className={cn(
        "flex h-7 list-none items-center px-3 text-xs font-medium",
        props.isDropTarget ? "text-primary" : "text-muted-foreground",
      )}
    >
      {props.label}
    </li>
  );
}

/** Threads waiting on the user, from every project, on an amber backing above the projects. */
export function SidebarNeedsYouSection(props: { count: number; children: ReactNode }) {
  const labelId = useId();
  return (
    <li className="mb-3 list-none rounded-lg bg-warning-surface p-1">
      <div
        id={labelId}
        className="flex h-7 items-center gap-2 px-3 text-xs font-medium text-warning-foreground"
      >
        <HandIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="flex-1">Needs you</span>
        <span className="tabular-nums">{props.count}</span>
      </div>
      <ul role="group" aria-labelledby={labelId} className="mt-0.5 flex flex-col gap-0.5">
        {props.children}
      </ul>
    </li>
  );
}

/** "Show N more" under a project's first threads, and "Show less" once they are all listed. */
export function SidebarFolderMoreRow(props: {
  group: SidebarProjectSnapshot;
  moreCount: number;
  onToggle: (group: SidebarProjectSnapshot) => void;
}) {
  const folderRowId = sidebarFolderRowId(props.group.projectKey);
  return (
    <li className="list-none">
      <button
        type="button"
        role="treeitem"
        tabIndex={-1}
        data-sidebar-row={`${folderRowId}:more`}
        data-sidebar-parent={folderRowId}
        onClick={() => props.onToggle(props.group)}
        className="flex h-7 w-full cursor-pointer items-center rounded-sm ps-9 pe-3 text-left text-xs text-muted-foreground outline-none transition-colors duration-150 hover:bg-sidebar-row-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        {props.moreCount > 0 ? `Show ${props.moreCount} more` : "Show less"}
      </button>
    </li>
  );
}

const SKELETON_TITLE_WIDTHS = ["w-7/10", "w-1/2", "w-4/5", "w-2/3", "w-3/5", "w-3/4"] as const;

function SkeletonBars(props: { tone: string }) {
  return SKELETON_TITLE_WIDTHS.map((width) => (
    <span key={width} className="flex h-8 items-center gap-2 px-3">
      <span className={cn("size-2 shrink-0 rounded-full", props.tone)} />
      <span className={cn("h-2.5 rounded-full", width, props.tone)} />
    </span>
  ));
}

/** Six placeholder rows while projects load, with the timeline's compositor-only shimmer over them. */
export function SidebarSkeletonRows() {
  return (
    <div
      ref={observeVisibleAnimation}
      role="status"
      aria-label="Loading threads"
      className="relative flex flex-col gap-0.5 overflow-hidden"
    >
      <SkeletonBars tone="bg-muted-foreground/15" />
      <span aria-hidden className="live-activity-focus pointer-events-none absolute inset-y-0">
        <span className="live-activity-focus-counter block h-full">
          <span className="live-activity-focus-aligned flex h-full flex-col gap-0.5">
            <SkeletonBars tone="bg-card" />
          </span>
        </span>
      </span>
    </div>
  );
}
