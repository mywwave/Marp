import {
  claudeSubagentModelAlias,
  type ServerProvider,
  supportsExplorationModel,
} from "@marp/contracts";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { SettingResetButton, SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

const SAME_AS_THREAD = "";

// Claude Code takes a family alias per spawn, so only the newest model of each family is a real choice.
function explorationModelChoices(provider: ServerProvider) {
  const seen = new Set<string>();
  return provider.models.filter((model) => {
    const alias = claudeSubagentModelAlias(model.slug);
    if (alias === null || seen.has(alias)) return false;
    seen.add(alias);
    return true;
  });
}

export function ExplorationModelRows(props: { providers: ReadonlyArray<ServerProvider> }) {
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const providers = props.providers.filter(
    (provider) => provider.enabled && supportsExplorationModel(provider.driver),
  );
  const search = searchableSetting("exploration-model");

  return providers.map((provider, index) => {
    const choices = explorationModelChoices(provider);
    const selected = settings.explorationModels[provider.instanceId] ?? SAME_AS_THREAD;
    const selectedName = choices.find((model) => model.slug === selected)?.name ?? selected;
    const update = (model: string | null) =>
      updateSettings({ explorationModels: { [provider.instanceId]: model } });
    return (
      <SettingsRow
        key={provider.instanceId}
        serverScoped
        settingKeys={["explorationModels"]}
        {...(index === 0 ? { id: search.id } : {})}
        title={
          providers.length > 1
            ? `${search.title} · ${provider.displayName ?? provider.instanceId}`
            : search.title
        }
        description="Runs Explore subagents, which search and read code, on this model. Try a fast one like Haiku."
        resetAction={
          selected === SAME_AS_THREAD ? null : (
            <SettingResetButton label="exploration model" onClick={() => update(null)} />
          )
        }
        control={
          <Select
            value={selected}
            onValueChange={(value) => update(value === SAME_AS_THREAD ? null : value)}
          >
            <SelectTrigger size="sm" className="w-full sm:w-48" aria-label={search.title}>
              <SelectValue>
                {selected === SAME_AS_THREAD ? "Same as thread" : selectedName}
              </SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              <SelectItem hideIndicator value={SAME_AS_THREAD}>
                Same as thread
              </SelectItem>
              {choices.map((model) => (
                <SelectItem hideIndicator key={model.slug} value={model.slug}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        }
      />
    );
  });
}
