import type { EnvironmentId } from "@marp/contracts";
import type { TimestampFormat } from "@marp/contracts/settings";
import { ArchiveIcon, CheckIcon, XIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { SnoozePreset } from "../Sidebar.snooze";
import { Button } from "../ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SnoozeMenuButton } from "./SidebarThreadRow";

function SelectionAction(props: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost-muted"
            aria-label={props.label}
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

/** The card over the footer while two or more threads are selected. */
export function SidebarSelectionBar(props: {
  count: number;
  environmentId: EnvironmentId;
  timestampFormat: TimestampFormat;
  onSettle: () => void;
  onSnooze: (preset: Pick<SnoozePreset, "snoozedUntil">) => void;
  onArchive: () => void;
  onClear: () => void;
}) {
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  return (
    <div
      role="toolbar"
      aria-label={`${props.count} threads selected`}
      className="mx-2 mb-2 flex h-11 shrink-0 items-center gap-0.5 rounded-md bg-popover ps-3 pe-1 shadow-pop"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {props.count} selected
      </span>
      <SelectionAction label="Settle" onClick={props.onSettle}>
        <CheckIcon />
      </SelectionAction>
      <SnoozeMenuButton
        open={snoozeMenuOpen}
        onOpenChange={setSnoozeMenuOpen}
        onSnooze={props.onSnooze}
        timestampFormat={props.timestampFormat}
        environmentId={props.environmentId}
        label="Snooze"
        size="icon-sm"
      />
      <SelectionAction label="Archive" onClick={props.onArchive}>
        <ArchiveIcon />
      </SelectionAction>
      <SelectionAction label="Clear selection" onClick={props.onClear}>
        <XIcon />
      </SelectionAction>
    </div>
  );
}
