import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/** Underline tabs for switching sections of one detail pane (reference `.tabs-u`). */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex min-w-0 flex-col gap-5", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex min-w-0 gap-1 overflow-x-auto border-b border-border", className)}
      {...props}
    />
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 font-medium text-muted-foreground text-sm outline-none transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-active:text-foreground data-active:after:bg-foreground data-disabled:pointer-events-none data-disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

/** A count after a tab label, such as the number of models. */
function TabsCount({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn("font-normal text-muted-foreground text-xs tabular-nums", className)}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("min-w-0 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsCount, TabsList, TabsPanel, TabsTab };
