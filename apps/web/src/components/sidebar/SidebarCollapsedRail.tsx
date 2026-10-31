import { useAtomValue } from "@effect/atom-react";
import { scopedThreadKey, scopeProjectRef, scopeThreadRef } from "@marp/client-runtime/environment";
import { HandIcon, PanelLeftIcon, PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "@tanstack/react-router";

import { openCommandPalette } from "../../commandPaletteBus";
import { useHandleNewThread } from "../../hooks/useHandleNewThread";
import { useNowMinute } from "../../hooks/useNowMinute";
import { useBoringSidebarEnabled } from "../../hooks/useSettings";
import { useSidebarProjectGroups } from "../../hooks/useSidebarProjectGroups";
import { shortcutLabelForCommand } from "../../keybindings";
import { startNewThreadFromContext } from "../../lib/chatThreadActions";
import { cn } from "../../lib/utils";
import { useDelegatedUnderParent, useQuietThreadShells } from "../../state/entities";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { buildThreadRouteParams } from "../../threadRoutes";
import { useUiStateStore } from "../../uiStateStore";
import {
  filterSidebarV2VisibleThreads,
  hasUnseenCompletion,
  resolveCollapsedSidebarRail,
  resolveSidebarStatusFamily,
  resolveSidebarThreadStatus,
  resolveThreadLastVisitedAt,
  shouldCreateNewThreadInCurrentProject,
} from "../Sidebar.logic";
import { pickableProjectGroups } from "@marp/client-runtime/state/project-grouping";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { useSidebar } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SidebarStatusIndicator } from "./SidebarThreadRow";

const RAIL_DOT_CLASS_NAME = {
  attention: "bg-warning",
  failed: "bg-error",
  unread: "bg-success",
  working: "bg-info",
} as const;

const RAIL_DOT_LABEL = {
  attention: "needs you",
  failed: "failed",
  unread: "done",
  working: "working",
} as const;

const RAIL_MENU_THREAD_LIMIT = 10;

function RailTooltip(props: {
  label: string;
  shortcut?: string | null | undefined;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={props.children} />
      <TooltipPopup side="right">
        {props.label}
        {props.shortcut ? ` (${props.shortcut})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

/**
 * The 56px sidebar: expand, new thread, search, Needs you, and one tile per
 * project with the dot its closed folder would carry. A tile opens that
 * project's threads.
 */
export function SidebarCollapsedRail(props: { underWindowControls: boolean }) {
  const { setOpen } = useSidebar();
  const navigate = useNavigate();
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const projectGroups = useSidebarProjectGroups();
  const threads = useQuietThreadShells();
  const delegatedUnderParent = useDelegatedUnderParent();
  const localLastVisitedAtById = useUiStateStore((store) => store.threadLastVisitedAtById);
  const now = useNowMinute();
  const boringSidebarEnabled = useBoringSidebarEnabled();
  const newThreadContext = useHandleNewThread();

  const rail = resolveCollapsedSidebarRail({
    groups: projectGroups,
    now,
    threads: filterSidebarV2VisibleThreads(threads, null, delegatedUnderParent).map((thread) => ({
      ...thread,
      lastVisitedAt: resolveThreadLastVisitedAt(
        thread.lastVisitedAt,
        localLastVisitedAtById[scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id))],
      ),
    })),
  });

  const expand = () => setOpen(true);
  const expandToSearch = () => {
    flushSync(() => setOpen(true));
    document
      .querySelector<HTMLInputElement>('[data-slot="sidebar"] input[aria-label="Search threads"]')
      ?.focus();
  };
  const startNewThread = () => {
    if (
      boringSidebarEnabled ||
      shouldCreateNewThreadInCurrentProject(
        false,
        pickableProjectGroups(projectGroups).length,
        projectGroups.length,
      )
    ) {
      void startNewThreadFromContext({
        activeDraftThread: newThreadContext.activeDraftThread,
        activeThread: newThreadContext.activeThread ?? undefined,
        defaultProjectRef: newThreadContext.defaultProjectRef,
        handleNewThread: newThreadContext.handleNewThread,
      });
      return;
    }
    openCommandPalette({ open: "new-thread-in" });
  };

  return (
    <nav
      aria-label="Threads"
      className={cn(
        "flex h-full min-h-0 flex-col items-center gap-2 pt-1 pb-2",
        // macOS traffic lights sit over the top of the rail.
        props.underWindowControls && "pt-(--workspace-topbar-height)",
      )}
    >
      <RailTooltip
        label="Expand sidebar"
        shortcut={shortcutLabelForCommand(keybindings, "sidebar.toggle")}
      >
        <Button
          data-sidebar="trigger"
          size="icon-lg"
          variant="ghost-muted"
          aria-label="Expand sidebar"
          aria-pressed={false}
          onClick={expand}
        >
          <PanelLeftIcon aria-hidden />
        </Button>
      </RailTooltip>
      <RailTooltip label="New thread" shortcut={shortcutLabelForCommand(keybindings, "chat.new")}>
        <Button
          size="icon-lg"
          variant="ghost-muted"
          aria-label="New thread"
          disabled={projectGroups.length === 0}
          onClick={startNewThread}
        >
          <PlusIcon aria-hidden />
        </Button>
      </RailTooltip>
      <RailTooltip label="Search threads" shortcut="/">
        <Button
          size="icon-lg"
          variant="ghost-muted"
          aria-label="Search threads"
          onClick={expandToSearch}
        >
          <SearchIcon aria-hidden />
        </Button>
      </RailTooltip>
      {rail.needsYouCount > 0 ? (
        <RailTooltip label={`Needs you: ${rail.needsYouCount}`}>
          <Button
            size="icon-lg"
            variant="ghost-muted"
            aria-label={`Needs you: ${rail.needsYouCount}`}
            onClick={expand}
          >
            <HandIcon aria-hidden className="text-warning-foreground" />
            <span
              aria-hidden
              className="absolute top-1 right-1 size-2 rounded-full bg-warning ring-2 ring-sidebar"
            />
          </Button>
        </RailTooltip>
      ) : null}
      <span aria-hidden className="h-px w-6 shrink-0 bg-border" />
      <ScrollArea hideScrollbars className="h-auto min-h-0 w-full">
        <ul className="flex flex-col items-center gap-2 py-0.5">
          {rail.projects.map(({ group, threads: projectThreads, dot }) => {
            const recent = projectThreads
              .toSorted((left, right) =>
                (right.latestUserMessageAt ?? right.updatedAt).localeCompare(
                  left.latestUserMessageAt ?? left.updatedAt,
                ),
              )
              .slice(0, RAIL_MENU_THREAD_LIMIT);
            const label = dot ? `${group.displayName}, ${RAIL_DOT_LABEL[dot]}` : group.displayName;
            return (
              <li key={group.projectKey} className="list-none">
                <Menu>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <MenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label={label}
                              className="relative flex size-8 cursor-pointer items-center justify-center rounded-md bg-sidebar-row-hover outline-none transition-[background-color,box-shadow] duration-150 hover:bg-card hover:shadow-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-popup-open:bg-card data-popup-open:shadow-raised motion-reduce:transition-none"
                            />
                          }
                        />
                      }
                    >
                      <ProjectFavicon project={group} className="size-4 shrink-0" />
                      {dot ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-sidebar",
                            RAIL_DOT_CLASS_NAME[dot],
                          )}
                        />
                      ) : null}
                    </TooltipTrigger>
                    <TooltipPopup side="right">{group.displayName}</TooltipPopup>
                  </Tooltip>
                  <MenuPopup side="right" align="start" className="w-72">
                    <MenuGroup>
                      <MenuGroupLabel>{group.displayName}</MenuGroupLabel>
                      {recent.map((thread) => (
                        <MenuItem
                          key={thread.id}
                          onClick={() =>
                            void navigate({
                              to: "/$environmentId/$threadId",
                              params: buildThreadRouteParams(
                                scopeThreadRef(thread.environmentId, thread.id),
                              ),
                            })
                          }
                        >
                          <SidebarStatusIndicator
                            selected={false}
                            family={resolveSidebarStatusFamily({
                              status: resolveSidebarThreadStatus(thread),
                              isUnread: hasUnseenCompletion(thread),
                              isWoke: false,
                            })}
                          />
                          <span className="min-w-0 flex-1 truncate">{thread.title}</span>
                        </MenuItem>
                      ))}
                      {projectThreads.length > recent.length ? (
                        <MenuItem onClick={expand}>
                          <span className="size-4 shrink-0" />
                          Show all {projectThreads.length}
                        </MenuItem>
                      ) : null}
                    </MenuGroup>
                    {recent.length > 0 ? <MenuSeparator /> : null}
                    <MenuItem
                      onClick={() =>
                        void newThreadContext.handleNewThread(
                          scopeProjectRef(group.environmentId, group.id),
                        )
                      }
                    >
                      <PlusIcon aria-hidden />
                      New thread
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <span className="flex-1" />
      <RailTooltip
        label="Settings"
        shortcut={shortcutLabelForCommand(keybindings, "settings.open")}
      >
        <Button
          size="icon-lg"
          variant="ghost-muted"
          aria-label="Settings"
          onClick={() => void navigate({ to: "/settings" })}
        >
          <SettingsIcon aria-hidden />
        </Button>
      </RailTooltip>
    </nav>
  );
}
