// The collapsed desktop rail leaves room only for macOS traffic lights; mobile keeps the floating toggle.
export const COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS =
  "md:[[data-sidebar-state=collapsed]_&]:pl-[max(var(--workspace-gutter-start),calc(var(--workspace-titlebar-content-left)-var(--sidebar-width-icon)-1rem))] max-md:pl-[var(--workspace-titlebar-content-left)]";
