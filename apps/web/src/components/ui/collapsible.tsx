import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

import { cn } from "~/lib/utils";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ className, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      className={cn("cursor-pointer", className)}
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsiblePanel({
  className,
  animate = true,
  ...props
}: CollapsiblePrimitive.Panel.Props & {
  /** `fade` skips the height animation (rows in a list) and fades the content in on open. */
  animate?: boolean | "fade";
}) {
  return (
    <CollapsiblePrimitive.Panel
      className={cn(
        "overflow-hidden",
        animate === "fade" &&
          "transition-opacity duration-fast ease-out data-starting-style:opacity-0 motion-reduce:transition-none",
        animate === true &&
          "h-(--collapsible-panel-height) transition-[height] duration-enter ease-out data-ending-style:duration-exit data-ending-style:ease-in-exit motion-reduce:transition-none data-ending-style:h-0 data-starting-style:h-0 data-open:data-ending-style:[height:var(--collapsible-panel-height)]",
        className,
      )}
      data-slot="collapsible-panel"
      {...props}
    />
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
  CollapsiblePanel as CollapsibleContent,
};
