import { FolderPlusIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
} from "react";

import { isEditableFocused } from "~/lib/editableFocus";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import { Kbd } from "../ui/kbd";
import { SidebarInput, SidebarMenuButton } from "../ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export interface SidebarThreadHeaderProps {
  searchFieldRef?: RefObject<HTMLDivElement | null>;
  hasProjects: boolean;
  projectScope: ReactNode;
  // A chosen project filter keeps its button in view; otherwise it shows on hover.
  projectScopeActive: boolean;
  onNewProject: () => void;
  onNewThread: (event: ReactMouseEvent) => void;
  newThreadDisabled: boolean;
  newThreadShortcutLabel: string | null | undefined;
  newThreadInProjectShortcutLabel: string | null | undefined;
  showNewThreadInProjectHint: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  isSearching: boolean;
  searchResultCount: number;
  activeSearchResultIndex: number;
  onClearSearch: () => void;
}

export function SidebarThreadHeader({
  searchFieldRef,
  hasProjects,
  projectScope,
  projectScopeActive,
  onNewProject,
  onNewThread,
  newThreadDisabled,
  newThreadShortcutLabel,
  newThreadInProjectShortcutLabel,
  showNewThreadInProjectHint,
  searchInputRef,
  searchQuery,
  onSearchQueryChange,
  onSearchKeyDown,
  isSearching,
  searchResultCount,
  activeSearchResultIndex,
  onClearSearch,
}: SidebarThreadHeaderProps) {
  const resultsVisible = isSearching && searchResultCount > 0;
  // Shrinking results can remove the active option; never leave aria-activedescendant pointing at it.
  const activeResultExists = resultsVisible && activeSearchResultIndex < searchResultCount;
  // "/" jumps to search from anywhere that is not already taking text, like most list apps.
  // oxlint-disable-next-line marp/no-unreasoned-state-sync -- listens for the window-level "/" search shortcut
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
      if (event.altKey || isEditableFocused(event.target)) return;
      const input = searchInputRef.current;
      if (input === null || input.closest("[inert]") !== null) return;
      event.preventDefault();
      input.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchInputRef]);

  const newThreadButton = (
    <button
      type="button"
      disabled={newThreadDisabled}
      onClick={onNewThread}
      className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm bg-card ps-3 pe-2 text-left text-sm font-medium text-foreground shadow-raised outline-none transition-shadow duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:opacity-64 motion-reduce:transition-none"
    >
      <PlusIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">New thread</span>
      {newThreadShortcutLabel ? <Kbd>{newThreadShortcutLabel}</Kbd> : null}
    </button>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {showNewThreadInProjectHint ? (
        <Tooltip>
          <TooltipTrigger render={newThreadButton} />
          <TooltipPopup side="bottom">
            New thread in current project: Shift+click
            {newThreadInProjectShortcutLabel ? ` (${newThreadInProjectShortcutLabel})` : ""}
          </TooltipPopup>
        </Tooltip>
      ) : (
        newThreadButton
      )}
      <div
        ref={searchFieldRef}
        className="group/search relative flex h-8 min-w-0 items-center gap-2 rounded-sm ps-3 pe-1 text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-row-hover focus-within:bg-sidebar-row-hover focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring/70 motion-reduce:transition-none"
      >
        <SearchIcon aria-hidden className="size-4 shrink-0" />
        <SidebarInput
          ref={searchInputRef}
          nativeInput
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search threads"
          aria-label="Search threads"
          aria-keyshortcuts="/"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={resultsVisible}
          aria-controls={resultsVisible ? "sidebar-thread-search-results" : undefined}
          aria-activedescendant={
            activeResultExists
              ? `sidebar-thread-search-result-${activeSearchResultIndex}`
              : undefined
          }
          className="min-w-0 flex-1"
        />
        {isSearching ? (
          <Button
            type="button"
            size="icon-micro"
            variant="ghost-muted"
            className="me-1 shrink-0"
            aria-label="Clear thread search"
            onClick={() => {
              onClearSearch();
              searchInputRef.current?.focus();
            }}
          >
            <XIcon className="size-3" />
          </Button>
        ) : (
          <span className="relative flex h-7 shrink-0 items-center justify-end">
            {projectScopeActive ? null : (
              <span className="me-1 transition-opacity duration-150 group-hover/search:opacity-0 group-focus-within/search:opacity-0 motion-reduce:transition-none">
                <Kbd>/</Kbd>
              </span>
            )}
            {hasProjects ? (
              // Filter and Add project float in over the "/" hint; an active filter stays visible.
              <span
                className={cn(
                  "flex items-center transition-opacity duration-150 motion-reduce:transition-none",
                  !projectScopeActive &&
                    "pointer-events-none absolute inset-y-0 right-0 opacity-0 group-hover/search:pointer-events-auto group-hover/search:opacity-100 group-focus-within/search:pointer-events-auto group-focus-within/search:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
                )}
              >
                {projectScope}
                <SidebarHeaderIconButton label="Add project" onClick={onNewProject}>
                  <FolderPlusIcon />
                </SidebarHeaderIconButton>
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}

export function SidebarHeaderIconButton({
  label,
  tooltip = label,
  className,
  children,
  ...rest
}: {
  label: string;
  tooltip?: ReactNode;
  className?: string | undefined;
  children?: ReactNode;
} & Omit<
  ComponentProps<typeof SidebarMenuButton>,
  "children" | "className" | "tooltip" | "isActive" | "aria-label"
>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <SidebarMenuButton
            size="icon"
            type="button"
            aria-label={label}
            {...rest}
            className={cn("relative size-7 shrink-0", className)}
          />
        }
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </TooltipTrigger>
      <TooltipPopup side="top">{tooltip}</TooltipPopup>
    </Tooltip>
  );
}
