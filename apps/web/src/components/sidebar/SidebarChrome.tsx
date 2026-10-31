import { SidebarMachineCard } from "./SidebarMachineCard";
import { ArrowLeftIcon, ArrowRightIcon, ChartNoAxesColumnIcon, SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import { memo } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import { useAtomValue } from "@effect/atom-react";
import { useEnvironmentIdentificationMode } from "../../hooks/useSettings";
import { shortcutLabelForCommand } from "../../keybindings";
import {
  navigateHistory,
  useCanNavigateHistory,
  type HistoryDirection,
} from "../../navigationHistory";
import { primaryServerKeybindingsAtom } from "../../state/server";
import { cn } from "../../lib/utils";
import { usePullRequestsSupported } from "../../state/environments";
import { MarpMark } from "../MarpMark";
import {
  resolveEnvironmentIdentificationPillLabel,
  useEnvironmentStageLabel,
} from "../environmentStage";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "../ui/sidebar";
import { Kbd } from "../ui/kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { readPullRequestListPreferences } from "../pullRequest/pullRequestListPreferences";
import { isSidebarUtilityPage, useNavigateToMainApp } from "./mainAppLocation";
import { SidebarThreadUndoNotice } from "./SidebarThreadUndoNotice";
import { SidebarProviderUpdatePill } from "./SidebarProviderUpdatePill";
import { SidebarUpdateArchitectureWarning, SidebarUpdatePill } from "./SidebarUpdatePill";
import { PullRequestGlyph } from "~/components/pullRequest/pullRequestIcons";
import { observeResize } from "~/lib/observeResize";

export const SidebarChromeHeader = memo(function SidebarChromeHeader({
  isElectron,
}: {
  isElectron: boolean;
}) {
  const stageLabel = useEnvironmentStageLabel();
  const environmentIdentificationMode = useEnvironmentIdentificationMode();
  const pillLabel =
    environmentIdentificationMode === "pill"
      ? resolveEnvironmentIdentificationPillLabel(stageLabel)
      : null;

  return (
    <div
      className={cn(
        "relative flex h-[var(--workspace-topbar-height)] shrink-0 flex-row items-center gap-2 pr-3 md:h-[calc(var(--workspace-topbar-height)-1rem)]",
        isElectron && "drag-region",
      )}
    >
      <div className="relative top-[calc(var(--workspace-controls-top)-env(safe-area-inset-top))] z-10 ml-[calc(var(--workspace-controls-left)+1px-env(safe-area-inset-left))] flex shrink-0 items-center md:hidden">
        <SidebarTrigger
          variant="ghost"
          className="relative top-auto translate-y-0"
          aria-label="Toggle main sidebar"
        />
      </div>
      <div className="relative z-10 flex h-8 min-w-0 flex-1 flex-wrap content-start items-center gap-x-2 overflow-hidden py-0.5">
        <div className="flex shrink-0 items-center gap-1">
          <SidebarBrand />
          {isElectron ? (
            <div className="hidden items-center md:flex">
              <HistoryNavigationButton direction="back" />
              <HistoryNavigationButton direction="forward" />
            </div>
          ) : null}
        </div>
        {pillLabel ? (
          <div className="ml-1 flex h-7 items-center">
            <Badge data-environment-identification="pill" size="sm" variant="secondary">
              {pillLabel}
            </Badge>
          </div>
        ) : null}
      </div>
      <SidebarCollapseButton />
    </div>
  );
});

/** Collapse at the right end of the header; the floating button in the workspace brings it back. */
function SidebarCollapseButton() {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const usagePageOpen = useLocation({ select: (location) => location.pathname === "/usage" });
  const shortcutLabel = shortcutLabelForCommand(keybindings, "sidebar.toggle", {
    context: { usagePageOpen },
  });
  return (
    <div className="relative top-[calc(var(--workspace-controls-top)-env(safe-area-inset-top))] z-10 hidden shrink-0 items-center md:flex">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger variant="ghost" aria-label="Collapse sidebar" />} />
        <TooltipPopup side="bottom">
          Collapse sidebar{shortcutLabel ? ` (${shortcutLabel})` : ""}
        </TooltipPopup>
      </Tooltip>
    </div>
  );
}

export function SidebarBrandWidthProbe({
  isElectron,
  onWidthChange,
}: {
  isElectron: boolean;
  onWidthChange: (width: number) => void;
}) {
  const observeWidth = (probe: HTMLDivElement) => {
    return observeResize(probe, ([entry]) => {
      if (entry) onWidthChange(entry.borderBoxSize[0]?.inlineSize ?? probe.offsetWidth);
    });
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none invisible fixed top-0 left-0 flex w-max border-r border-transparent pr-3"
      ref={observeWidth}
    >
      {/* The brand and history buttons, then room for the collapse button at the header's end. */}
      <div className="ml-[calc(var(--workspace-controls-left)+0.25rem)] flex gap-1 pr-(--workspace-titlebar-content-left)">
        <SidebarBrandMark />
        {isElectron ? <div className="w-[calc(2*var(--workspace-titlebar-control-size))]" /> : null}
      </div>
    </div>
  );
}

function HistoryNavigationButton({ direction }: { direction: HistoryDirection }) {
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const enabled = useCanNavigateHistory(direction);
  const label = direction === "back" ? "Go back" : "Go forward";
  const shortcutLabel = shortcutLabelForCommand(
    keybindings,
    direction === "back" ? "navigation.back" : "navigation.forward",
  );
  const Icon = direction === "back" ? ArrowLeftIcon : ArrowRightIcon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            className="[-webkit-app-region:no-drag]"
            disabled={!enabled}
            onClick={() => navigateHistory(direction)}
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipPopup side="bottom">
        {label}
        {shortcutLabel ? ` (${shortcutLabel})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}

function SidebarBrand() {
  return (
    <Link
      aria-label="Marp home"
      className={cn(
        "relative z-10 ml-[calc(var(--workspace-controls-left)+0.25rem)] hidden h-7 w-fit min-w-0 shrink-0 items-center overflow-hidden rounded-md text-foreground outline-hidden ring-ring focus-visible:ring-2 focus-visible:ring-inset md:flex",
      )}
      to="/"
    >
      <SidebarBrandMark />
    </Link>
  );
}

function SidebarBrandMark() {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium tracking-tight">
      <MarpMark aria-hidden className="size-4 shrink-0" />
      <span
        className={cn(
          "truncate text-muted-foreground [text-box:trim-both_cap_alphabetic] supports-[text-box:trim-both_cap_alphabetic]:py-1",
        )}
      >
        Marp
      </span>
    </span>
  );
}

/** A 32px footer row: icon, label, and the shortcut that does the same thing. */
function SidebarFooterRow(props: {
  icon: ReactNode;
  label: string;
  shortcut?: string | null | undefined;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem className="min-w-0 flex-1">
      <button
        type="button"
        onClick={props.onClick}
        aria-keyshortcuts={props.shortcut ?? undefined}
        className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-sm ps-3 pe-2 text-left text-sm text-sidebar-foreground outline-none transition-colors duration-150 hover:bg-sidebar-row-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground"
      >
        {props.icon}
        <span className="min-w-0 flex-1 truncate">{props.label}</span>
        {props.shortcut ? <Kbd>{props.shortcut}</Kbd> : null}
      </button>
    </SidebarMenuItem>
  );
}

const SidebarUtilityMenu = memo(function SidebarUtilityMenu() {
  const navigate = useNavigate();
  const navigateToMainApp = useNavigateToMainApp();
  const { isMobile, setOpenMobile } = useSidebar();
  const keybindings = useAtomValue(primaryServerKeybindingsAtom);
  const isOnUtilityPage = useLocation({
    select: (location) => isSidebarUtilityPage(location.pathname),
  });
  const pullRequestsSupported = usePullRequestsSupported();
  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const handlePullRequestsClick = () => {
    closeMobileSidebar();
    void navigate({
      to: "/pull-requests",
      search: readPullRequestListPreferences(),
    });
  };
  const handleSettingsClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/settings" });
  };

  const handleUsageClick = () => {
    closeMobileSidebar();
    void navigate({ to: "/usage" });
  };

  const handleBackClick = () => {
    closeMobileSidebar();
    void navigateToMainApp();
  };

  return (
    <>
      {/* Renders only while an undo is on offer, just above the rows. */}
      <SidebarMenu className="flex-row items-center empty:hidden">
        <SidebarThreadUndoNotice />
      </SidebarMenu>
      {isOnUtilityPage ? null : (
        <SidebarMenu>
          {pullRequestsSupported ? (
            <SidebarFooterRow
              icon={<PullRequestGlyph.pullRequest />}
              label="Pull requests"
              onClick={handlePullRequestsClick}
            />
          ) : null}
          <SidebarFooterRow
            icon={<ChartNoAxesColumnIcon />}
            label="Usage"
            shortcut={shortcutLabelForCommand(keybindings, "usage.open")}
            onClick={handleUsageClick}
          />
        </SidebarMenu>
      )}
      {/* The update control keeps its place at the end of the last row. */}
      <SidebarMenu className="flex-row items-center">
        {isOnUtilityPage ? (
          <SidebarFooterRow icon={<ArrowLeftIcon />} label="Back" onClick={handleBackClick} />
        ) : (
          <SidebarFooterRow
            icon={<SettingsIcon />}
            label="Settings"
            shortcut={shortcutLabelForCommand(keybindings, "settings.open")}
            onClick={handleSettingsClick}
          />
        )}
        <SidebarUpdatePill />
      </SidebarMenu>
    </>
  );
});

export const SidebarChromeFooter = memo(function SidebarChromeFooter() {
  return (
    <SidebarFooter>
      <SidebarProviderUpdatePill />
      <SidebarUpdateArchitectureWarning />
      <SidebarUtilityMenu />
      <SidebarMachineCard />
    </SidebarFooter>
  );
});
