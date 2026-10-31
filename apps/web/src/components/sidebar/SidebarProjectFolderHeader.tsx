import type { EnvironmentThreadShell } from "@marp/client-runtime/state/models";
import { scopedThreadKey, scopeThreadRef } from "@marp/client-runtime/environment";
import { ChevronDownIcon, EllipsisIcon, PlusIcon } from "lucide-react";
import { memo } from "react";

import { cn } from "~/lib/utils";
import type { SidebarProjectSnapshot } from "../../sidebarProjectGrouping";
import { useUiStateStore } from "../../uiStateStore";
import { resolveSidebarFolderDot, resolveThreadLastVisitedAt } from "../Sidebar.logic";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

const FOLDER_DOT_CLASS_NAME = {
  attention: "bg-warning",
  failed: "bg-error",
  unread: "bg-success",
  working: "bg-info",
} as const;

const FOLDER_DOT_LABEL = {
  attention: ", needs you",
  failed: ", failed",
  unread: ", done",
  working: ", working",
} as const;

const PROJECT_DRAG_TYPE = "application/x-marp-project";

export type SidebarProjectDropPlacement = "before" | "after";

/** Drag a folder by its header to reorder projects; drops land before or after a header. */
export interface SidebarProjectReorder {
  onStart: (group: SidebarProjectSnapshot) => void;
  onOver: (group: SidebarProjectSnapshot, placement: SidebarProjectDropPlacement) => void;
  onDrop: () => void;
  onEnd: () => void;
}

/** The folder's sidebar tree row; its thread rows name it as their parent. */
export function sidebarFolderRowId(projectKey: string) {
  return `folder:${projectKey}`;
}

/**
 * A project header in the boring sidebar: icon, name and chevron, with New thread
 * and project actions on hover. A closed folder keeps a status dot, so it still
 * says when a hidden thread needs you; an unreachable machine shows a red dot.
 */
export const SidebarProjectFolderHeader = memo(function SidebarProjectFolderHeader(props: {
  group: SidebarProjectSnapshot;
  collapsed: boolean;
  offline?: boolean | undefined;
  hiddenThreads: readonly EnvironmentThreadShell[];
  onToggle: (group: SidebarProjectSnapshot) => void;
  onNewThread: (group: SidebarProjectSnapshot) => void;
  onContextMenu: (group: SidebarProjectSnapshot, position: { x: number; y: number }) => void;
  reorder?: SidebarProjectReorder | undefined;
  dropIndicator?: SidebarProjectDropPlacement | null | undefined;
}) {
  const { reorder } = props;
  const { group, collapsed, hiddenThreads } = props;
  const rowId = sidebarFolderRowId(group.projectKey);
  const localLastVisitedAtById = useUiStateStore((state) => state.threadLastVisitedAtById);
  const dot = collapsed
    ? resolveSidebarFolderDot(
        hiddenThreads.map((thread) => ({
          ...thread,
          lastVisitedAt: resolveThreadLastVisitedAt(
            thread.lastVisitedAt,
            localLastVisitedAtById[
              scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id))
            ],
          ),
        })),
      )
    : null;
  return (
    <li
      data-testid="sidebar-project-folder"
      className="group/project-folder relative mt-3 list-none first:mt-0"
    >
      <button
        type="button"
        role="treeitem"
        tabIndex={-1}
        data-sidebar-row={rowId}
        aria-expanded={!collapsed}
        draggable={reorder !== undefined}
        onDragStart={(event) => {
          if (!reorder) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(PROJECT_DRAG_TYPE, group.projectKey);
          reorder.onStart(group);
        }}
        onDragOver={(event) => {
          if (!reorder || !event.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          const rect = event.currentTarget.getBoundingClientRect();
          reorder.onOver(group, event.clientY < rect.top + rect.height / 2 ? "before" : "after");
        }}
        onDrop={(event) => {
          if (!reorder || !event.dataTransfer.types.includes(PROJECT_DRAG_TYPE)) return;
          event.preventDefault();
          reorder.onDrop();
        }}
        onDragEnd={() => reorder?.onEnd()}
        onClick={() => props.onToggle(group)}
        onContextMenu={(event) => {
          event.preventDefault();
          props.onContextMenu(group, { x: event.clientX, y: event.clientY });
        }}
        className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left outline-none transition-colors duration-150 hover:bg-sidebar-row-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
      >
        <ProjectFavicon project={group} className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {group.displayName}
        </span>
        {props.offline ? (
          <span className="size-1.5 shrink-0 rounded-full bg-error">
            <span className="sr-only">, offline</span>
          </span>
        ) : dot ? (
          <span className={cn("size-1.5 shrink-0 rounded-full", FOLDER_DOT_CLASS_NAME[dot])}>
            <span className="sr-only">{FOLDER_DOT_LABEL[dot]}</span>
          </span>
        ) : null}
        {/* Room for the actions, which float in without moving the chevron. */}
        <span aria-hidden className="w-13 shrink-0 pointer-coarse:w-8" />
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-placeholder transition-transform duration-200 motion-reduce:transition-none",
            collapsed && "-rotate-90",
          )}
        />
      </button>
      <span className="absolute inset-y-0 right-8 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover/project-folder:opacity-100 pointer-coarse:opacity-100 motion-reduce:transition-none">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                data-sidebar-action-for={rowId}
                size="icon-xs"
                variant="ghost-muted"
                aria-label={`New thread in ${group.displayName}`}
                onClick={() => props.onNewThread(group)}
              />
            }
          >
            <PlusIcon aria-hidden />
          </TooltipTrigger>
          <TooltipPopup>New thread in {group.displayName}</TooltipPopup>
        </Tooltip>
        <Button
          data-sidebar-action-for={rowId}
          size="icon-xs"
          variant="ghost-muted"
          aria-label="Project actions"
          className="pointer-coarse:hidden"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            props.onContextMenu(group, { x: rect.left, y: rect.bottom + 4 });
          }}
        >
          <EllipsisIcon aria-hidden />
        </Button>
      </span>
      {props.dropIndicator ? (
        // The insertion line starts where the project name does.
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-2 left-9 h-0.5 rounded-full bg-primary",
            props.dropIndicator === "before" ? "-top-1.5" : "-bottom-px",
          )}
        />
      ) : null}
    </li>
  );
});
