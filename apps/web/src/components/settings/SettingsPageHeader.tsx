import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { AppRouteModalClose } from "../AppRouteModal";
import { SettingsStorageBadge } from "./SettingsScopeSentence";
import {
  SETTINGS_SECTION_DESCRIPTIONS,
  SETTINGS_SECTION_LABELS,
  type SettingsPath,
} from "./settingsSearch";

// Detail pages have no nav entry; their header links back to the page that opens them.
const SETTINGS_DETAIL_PAGES: Readonly<
  Record<string, { title: string; description: string; parent: SettingsPath }>
> = {
  "/settings/open-source-licenses": {
    title: "Open source licenses",
    description: "Notices for dependencies, assets and optional tools.",
    parent: "/settings/about",
  },
};

function isSettingsPath(pathname: string): pathname is SettingsPath {
  return pathname in SETTINGS_SECTION_LABELS;
}

export function SettingsPageHeader({ pathname }: { pathname: string }) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const detail = SETTINGS_DETAIL_PAGES[normalized];
  const parent: SettingsPath | null =
    detail?.parent ?? (normalized === "/settings/diagnostics" ? "/settings/maintenance" : null);
  const title =
    detail?.title ??
    (isSettingsPath(normalized) ? SETTINGS_SECTION_LABELS[normalized] : "Settings");
  const description =
    detail?.description ??
    (isSettingsPath(normalized) ? SETTINGS_SECTION_DESCRIPTIONS[normalized] : null);

  return (
    <header className="shrink-0 pt-6 pb-4 max-md:pt-4">
      <div className="mx-auto flex w-full max-w-[calc(48rem+4rem)] items-start gap-4 px-8 max-md:px-4 group-has-[[data-settings-width=expanded]]/settings-sheet:max-w-6xl group-has-[[data-settings-width=wide]]/settings-sheet:max-w-5xl">
        <div className="min-w-0 flex-1">
          {parent ? (
            <Link
              to={parent}
              className="mb-1 inline-flex items-center gap-1 font-medium text-muted-foreground text-xs hover:text-foreground"
            >
              <ArrowLeftIcon aria-hidden className="size-3.5" />
              {SETTINGS_SECTION_LABELS[parent]}
            </Link>
          ) : null}
          <h1 className="truncate font-semibold text-foreground text-xl tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-xl text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2 pt-0.5">
          <SettingsStorageBadge />
          <AppRouteModalClose />
        </div>
      </div>
    </header>
  );
}
