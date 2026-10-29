import { EnvironmentId } from "@marp/contracts";
import { LayersIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { openCommandPalette } from "../../commandPaletteBus";
import { cn } from "../../lib/utils";
import { ProjectFavicon } from "../ProjectFavicon";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MiddleTruncate } from "../ui/middle-truncate";
import { ProjectSettingsPanel } from "./ProjectSettingsPanel";
import { useSettingsScope } from "./SettingsScopeContext";
import { SettingsPageContainer } from "./settingsLayout";
import { ALL_ENVIRONMENTS_VALUE, selectEnvironmentAxis } from "./settingsScopeAxis";

function ProjectList() {
  const { search, groups, selectScope } = useSettingsScope();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visibleGroups = needle
    ? groups.filter(
        (group) =>
          group.displayName.toLowerCase().includes(needle) ||
          group.memberProjects.some((member) =>
            member.workspaceRoot.toLowerCase().includes(needle),
          ),
      )
    : groups;

  return (
    <nav aria-label="Projects" className="flex min-w-0 flex-col gap-0.5">
      <Input
        type="search"
        size="sm"
        className="mb-2"
        placeholder="Search projects"
        aria-label="Search projects"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {visibleGroups.map((group) => {
        const selected = group.projectKey === search.project;
        return (
          <button
            key={group.projectKey}
            type="button"
            aria-pressed={selected}
            className={cn(
              "flex min-h-13 w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              selected ? "bg-muted ring-1 ring-border ring-inset" : "hover:bg-muted",
            )}
            onClick={() => selectScope({ project: group.projectKey })}
          >
            <ProjectFavicon project={group} className="size-7 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground text-sm">
                {group.displayName}
              </span>
              <span className="flex min-w-0 font-mono text-muted-foreground text-xs">
                <MiddleTruncate value={group.workspaceRoot} className="min-w-0" />
              </span>
            </span>
          </button>
        );
      })}
      {needle && visibleGroups.length === 0 ? (
        <p className="px-3 py-4 text-muted-foreground text-xs">
          No projects match “{query.trim()}”.
        </p>
      ) : null}
      <button
        type="button"
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-left font-medium text-muted-foreground text-sm outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={() => openCommandPalette({ open: "add-project" })}
      >
        <PlusIcon className="size-4 shrink-0" />
        Add project
      </button>
    </nav>
  );
}

export function ProjectsSettings() {
  const { search: value, scope, selectScope } = useSettingsScope();
  const unavailable =
    scope.kind === "unavailable" ? (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{scope.message}</p>
        {value.machine || value.checkout ? (
          <Button
            variant="outline"
            size="xs"
            onClick={() => selectScope(selectEnvironmentAxis(value, ALL_ENVIRONMENTS_VALUE))}
          >
            <LayersIcon />
            Show all environments
          </Button>
        ) : null}
      </div>
    ) : null;
  // Keep the panel mounted so it can follow members when regrouping changes the project key.
  const projectScope =
    scope.kind === "project" ||
    scope.kind === "checkout" ||
    (scope.kind === "unavailable" &&
      (scope.reason === "project-missing" || scope.reason === "checkout-missing"));
  return (
    <SettingsPageContainer width="wide" className="@container/projects gap-6">
      <div className="grid min-w-0 gap-6 @3xl/projects:grid-cols-[17.5rem_minmax(0,1fr)] @3xl/projects:items-start">
        <ProjectList />
        <div className="min-w-0">
          {value.project && projectScope ? (
            <ProjectSettingsPanel
              projectKey={value.project}
              environmentId={value.machine ? EnvironmentId.make(value.machine) : null}
              checkoutKey={value.checkout ?? null}
              unavailable={unavailable}
            />
          ) : unavailable ? (
            unavailable
          ) : (
            <p role="status" className="p-6 text-sm text-muted-foreground">
              Choose a project to manage its name, icon, checkouts and actions.
            </p>
          )}
        </div>
      </div>
    </SettingsPageContainer>
  );
}
