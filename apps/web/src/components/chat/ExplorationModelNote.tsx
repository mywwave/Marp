import type { EnvironmentId, ProviderInstanceId } from "@marp/contracts";
import { useEnvironmentSettings } from "../../hooks/useSettings";
import { getDisplayModelName, type ModelEsque } from "./providerIconUtils";

export function ExplorationModelNote(props: {
  environmentId: EnvironmentId;
  instanceId: ProviderInstanceId;
  options: ReadonlyArray<ModelEsque>;
}) {
  const model = useEnvironmentSettings(
    props.environmentId,
    (settings) => settings.explorationModels[props.instanceId] ?? null,
  );
  if (model === null) return null;
  const option = props.options.find((candidate) => candidate.slug === model);
  return (
    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
      Exploration: {option ? getDisplayModelName(option) : model}
    </div>
  );
}
