import { describe, expect, it } from "vite-plus/test";
import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";

import { buildSettingsOverview, type OverviewEnvironmentInput } from "./settingsOverview.logic";

const local = EnvironmentId.make("local");
const remote = EnvironmentId.make("remote");

function provider(
  name: string,
  overrides: Partial<Pick<ServerProvider, "enabled" | "installed" | "status" | "auth">> & {
    readonly behind?: boolean;
  } = {},
): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make(name.toLowerCase()),
    driver: ProviderDriverKind.make(name.toLowerCase()),
    displayName: name,
    enabled: overrides.enabled ?? true,
    installed: overrides.installed ?? true,
    version: "1.0.0",
    status: overrides.status ?? "ready",
    auth: overrides.auth ?? { status: "authenticated", label: "Plan" },
    checkedAt: "2026-10-29T10:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
    ...(overrides.behind
      ? {
          versionAdvisory: {
            status: "behind_latest",
            currentVersion: "1.0.0",
            latestVersion: "1.1.0",
            updateCommand: null,
            canUpdate: true,
            checkedAt: "2026-10-29T10:00:00.000Z",
            message: null,
          },
        }
      : {}),
  };
}

const environments: OverviewEnvironmentInput[] = [
  { environmentId: local, label: "Desktop", phase: "connected" },
  { environmentId: remote, label: "vps-hel1", phase: "offline" },
];

describe("buildSettingsOverview", () => {
  it("lists offline machines, signed-out providers and updates, worst first", () => {
    const overview = buildSettingsOverview({
      environments,
      primaryEnvironmentId: local,
      providersByEnvironment: new Map([
        [
          local,
          [
            provider("Claude", { behind: true }),
            provider("Cursor", { auth: { status: "unauthenticated" } }),
            provider("Grok", { enabled: false, auth: { status: "unauthenticated" } }),
          ],
        ],
        [remote, [provider("Codex", { auth: { status: "unauthenticated" } })]],
      ]),
    });

    expect(overview.attention.map((item) => [item.kind, item.title])).toEqual([
      ["machine-offline", "vps-hel1 is offline"],
      ["provider-signed-out", "Cursor isn't signed in on Desktop"],
      ["provider-update", "Claude 1.1.0 is available"],
    ]);
    expect(overview.providers.map((line) => [line.name, line.tone, line.detail])).toEqual([
      ["Claude", "warning", "Update available"],
      ["Cursor", "off", "Not signed in"],
      ["Grok", "off", "Disabled"],
    ]);
    expect(overview.machines.find((machine) => machine.isPrimary)?.label).toBe("Desktop");
  });

  it("has nothing to flag when every machine and provider is healthy", () => {
    const overview = buildSettingsOverview({
      environments: [{ environmentId: local, label: "Desktop", phase: "connected" }],
      primaryEnvironmentId: local,
      providersByEnvironment: new Map([[local, [provider("Codex")]]]),
    });
    expect(overview.attention).toEqual([]);
    expect(overview.providers[0]).toMatchObject({ tone: "ready", detail: "Plan" });
  });
});
