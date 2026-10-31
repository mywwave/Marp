import { makeSecretProviderDefinitionRegistry } from "@marp/secret-provider-core/shared/definition";
import * as OnePassword from "@marp/secret-provider-onepassword/shared/definition";

export const builtInSecretProviderDefinitions = makeSecretProviderDefinitionRegistry([
  OnePassword.definition,
]);
