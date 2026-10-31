import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { useCloseAppModal } from "./sidebar/mainAppLocation";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { SidebarMenuButton } from "./ui/sidebar";
import { DialogBackdrop } from "./ui/dialog";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

/**
 * Large modal for the Settings and Usage routes. Esc, the close button, or a press on the
 * backdrop returns to the page that opened it. Keyboard guards that skip dialogs exempt
 * `[data-app-modal]`, because these pages own their shortcuts.
 */
export function AppRouteModal({
  label,
  variant = "modal",
  children,
}: {
  label: string;
  /** workspace fills the window like the app shell instead of floating over it. */
  variant?: "modal" | "workspace";
  children: ReactNode;
}) {
  const closeAppModal = useCloseAppModal();
  const [open, setOpen] = useState(true);
  // Text selection that ends on the backdrop is not a dismissal.
  const backdropPressRef = useRef(false);
  // Focus the surface, not its first control: no stray focus ring, no phone keyboard.
  // On close, leave focus alone; returning it to the opener paints a focus ring.
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <DialogPrimitive.Root
      open={open}
      // Portaled layers outside this tree (toasts, Clerk, confirm dialogs) are not backdrop presses.
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        // Closing unmounts a focused field without a blur, so commit-on-blur rows would
        // drop what was typed. Blur first so they commit.
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && popupRef.current?.contains(focused)) focused.blur();
        setOpen(false);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) void closeAppModal();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogBackdrop />
        <DialogPrimitive.Viewport
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            variant === "modal" && "sm:p-6 lg:p-10",
          )}
          onPointerDown={(event) => {
            backdropPressRef.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (backdropPressRef.current && event.target === event.currentTarget) setOpen(false);
            backdropPressRef.current = false;
          }}
        >
          <DialogPrimitive.Popup
            ref={popupRef}
            initialFocus={popupRef}
            finalFocus={false}
            aria-label={label}
            data-slot="dialog-popup"
            data-app-modal=""
            className={cn(
              "relative flex size-full min-h-0 min-w-0 flex-col overflow-hidden max-sm:pt-safe max-sm:pb-safe text-foreground outline-none transition-[opacity,scale] duration-150 ease-out [-webkit-app-region:no-drag] data-ending-style:opacity-0 data-starting-style:opacity-0",
              variant === "modal"
                ? "bg-background data-ending-style:scale-[0.985] data-starting-style:scale-[0.985] sm:max-h-[60rem] sm:max-w-[80rem] sm:rounded-2xl sm:border sm:shadow-2xl/40"
                : "bg-chrome",
            )}
          >
            {children}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** A sidebar row that closes the modal, for workspace layouts with their own navigation. */
export function AppRouteModalBackButton({ label }: { label: string }) {
  return (
    <SidebarMenuButton render={<DialogPrimitive.Close />}>
      <ArrowLeftIcon />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Kbd>Esc</Kbd>
    </SidebarMenuButton>
  );
}

export function AppRouteModalClose() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <DialogPrimitive.Close
            aria-label="Close"
            render={<Button size="icon-sm" variant="ghost" />}
          />
        }
      >
        <XIcon />
      </TooltipTrigger>
      <TooltipPopup side="bottom">Close (Esc)</TooltipPopup>
    </Tooltip>
  );
}
