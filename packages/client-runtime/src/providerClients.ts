import {
  AntigravitySettings,
  ClaudeSettings,
  CodexSettings,
  isProviderDriverKind,
  ProviderDriverKind,
} from "@marp/contracts";
import { acpRegistryClient } from "@marp/provider-acp-registry/client";
import { makeProviderClientRegistry } from "@marp/provider-core/client";
import { modelShortName } from "@marp/provider-core/modelShortName";
import { cursorClient } from "@marp/provider-cursor/client";
import { fxClient } from "@marp/provider-fx/client";
import { grokClient } from "@marp/provider-grok/client";
import { museClient } from "@marp/provider-muse/client";
import { openCodeClient } from "@marp/provider-opencode/client";
import { piClient } from "@marp/provider-pi/client";

export const providerClients = makeProviderClientRegistry([
  {
    driverKind: ProviderDriverKind.make("codex"),
    label: "Codex",
    modelFamilies: ["GPT-", "GPT "],
    acpRegistryAgentIds: ["codex-acp"],
    settingsSchema: CodexSettings,
  },
  {
    driverKind: ProviderDriverKind.make("claudeAgent"),
    label: "Claude",
    modelFamilies: ["Claude "],
    acpRegistryAgentIds: ["claude-acp"],
    settingsSchema: ClaudeSettings,
  },
  cursorClient,
  grokClient,
  fxClient,
  openCodeClient,
  {
    driverKind: ProviderDriverKind.make("antigravity"),
    label: "Antigravity",
    modelFamilies: ["Gemini "],
    acpRegistryAgentIds: ["antigravity-acp"],
    settingsSchema: AntigravitySettings,
  },
  museClient,
  piClient,
  acpRegistryClient,
]);

export function getProviderClient(driver: string | null | undefined) {
  return isProviderDriverKind(driver) ? providerClients.get(driver) : undefined;
}

export function resolveModelShortName(
  model: { readonly name: string; readonly shortName?: string | undefined },
  driverKind: ProviderDriverKind | null | undefined,
): string | undefined {
  if (model.shortName) return model.shortName;
  const families = driverKind ? providerClients.get(driverKind)?.modelFamilies : undefined;
  return modelShortName(model.name, families ?? []);
}
