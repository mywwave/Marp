import type { EnvironmentId, ServerProvider } from "@marp/contracts";
import type { EnvironmentConnectionPhase } from "@marp/client-runtime/connection";

export interface OverviewEnvironmentInput {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly phase: EnvironmentConnectionPhase;
}

export type OverviewAttentionKind =
  | "machine-offline"
  | "provider-signed-out"
  | "provider-error"
  | "provider-update";

export interface OverviewAttentionItem {
  readonly kind: OverviewAttentionKind;
  readonly key: string;
  readonly title: string;
  readonly detail: string;
  readonly environmentId: EnvironmentId;
  readonly tone: "danger" | "warning" | "notice";
}

export interface OverviewProviderLine {
  readonly key: string;
  readonly driver: ServerProvider["driver"];
  readonly name: string;
  readonly enabled: boolean;
  readonly tone: "ready" | "warning" | "error" | "off";
  readonly detail: string;
}

export interface SettingsOverview {
  readonly attention: ReadonlyArray<OverviewAttentionItem>;
  readonly providers: ReadonlyArray<OverviewProviderLine>;
  readonly machines: ReadonlyArray<OverviewEnvironmentInput & { readonly isPrimary: boolean }>;
}

const OFFLINE_PHASES: ReadonlySet<EnvironmentConnectionPhase> = new Set([
  "offline",
  "error",
  "unsupported",
  "reconnecting",
]);

function providerName(provider: ServerProvider): string {
  return provider.displayName ?? provider.driver;
}

function providerLine(provider: ServerProvider): OverviewProviderLine {
  const name = providerName(provider);
  const enabled = provider.enabled && provider.status !== "disabled";
  const base = { key: provider.instanceId, driver: provider.driver, name, enabled };
  if (!enabled) return { ...base, tone: "off", detail: "Disabled" };
  if (!provider.installed) return { ...base, tone: "error", detail: "Not installed" };
  if (provider.auth.status === "unauthenticated") {
    return { ...base, tone: "off", detail: "Not signed in" };
  }
  if (provider.status === "error") return { ...base, tone: "error", detail: "Needs attention" };
  if (provider.versionAdvisory?.status === "behind_latest") {
    return { ...base, tone: "warning", detail: "Update available" };
  }
  if (provider.status === "warning") return { ...base, tone: "warning", detail: "Limited" };
  return { ...base, tone: "ready", detail: provider.auth.label ?? "Ready" };
}

/** What the settings Overview shows: problems first, then a summary per area. */
export function buildSettingsOverview(input: {
  readonly environments: ReadonlyArray<OverviewEnvironmentInput>;
  readonly providersByEnvironment: ReadonlyMap<EnvironmentId, ReadonlyArray<ServerProvider>>;
  readonly primaryEnvironmentId: EnvironmentId | null;
}): SettingsOverview {
  const attention: OverviewAttentionItem[] = [];
  for (const environment of input.environments) {
    if (!OFFLINE_PHASES.has(environment.phase)) continue;
    attention.push({
      kind: "machine-offline",
      key: `machine:${environment.environmentId}`,
      title: `${environment.label} is ${environment.phase === "reconnecting" ? "reconnecting" : "offline"}`,
      detail: "Threads on it can't run until it's back.",
      environmentId: environment.environmentId,
      tone: environment.phase === "reconnecting" ? "warning" : "danger",
    });
  }

  for (const environment of input.environments) {
    if (environment.phase !== "connected") continue;
    const providers = input.providersByEnvironment.get(environment.environmentId) ?? [];
    const onMachine = input.environments.length > 1 ? ` on ${environment.label}` : "";
    for (const provider of providers) {
      if (!provider.enabled || provider.status === "disabled") continue;
      const name = providerName(provider);
      const key = `${environment.environmentId}:${provider.instanceId}`;
      if (provider.installed && provider.auth.status === "unauthenticated") {
        attention.push({
          kind: "provider-signed-out",
          key: `signed-out:${key}`,
          title: `${name} isn't signed in${onMachine}`,
          detail: `Sign in to use ${name} in new threads.`,
          environmentId: environment.environmentId,
          tone: "warning",
        });
      } else if (provider.status === "error") {
        attention.push({
          kind: "provider-error",
          key: `error:${key}`,
          title: `${name} needs attention${onMachine}`,
          detail: provider.message ?? "Open Providers to see what's wrong.",
          environmentId: environment.environmentId,
          tone: "danger",
        });
      } else if (provider.versionAdvisory?.status === "behind_latest") {
        const latest = provider.versionAdvisory.latestVersion;
        attention.push({
          kind: "provider-update",
          key: `update:${key}`,
          title: latest ? `${name} ${latest} is available` : `${name} has an update`,
          detail: provider.versionAdvisory.currentVersion
            ? `You're on ${provider.versionAdvisory.currentVersion}${onMachine}.`
            : `A newer version is available${onMachine}.`,
          environmentId: environment.environmentId,
          tone: "notice",
        });
      }
    }
  }

  const toneOrder = { danger: 0, warning: 1, notice: 2 } as const;
  attention.sort((a, b) => toneOrder[a.tone] - toneOrder[b.tone]);

  const primaryProviders =
    (input.primaryEnvironmentId !== null
      ? input.providersByEnvironment.get(input.primaryEnvironmentId)
      : undefined) ?? [];

  return {
    attention,
    providers: primaryProviders.map(providerLine),
    machines: input.environments.map((environment) => ({
      ...environment,
      isPrimary: environment.environmentId === input.primaryEnvironmentId,
    })),
  };
}
