import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";

import { MarpProjectFile, MARP_PROJECT_FILE_SCHEMA_URL } from "@marp/contracts";

import { fromLenientJson } from "./schemaJson.ts";

export const MarpProjectFileFromJson = fromLenientJson(MarpProjectFile);

const decodeMarpProjectFile = Schema.decodeExit(MarpProjectFileFromJson);

export function parseMarpProjectFile(contents: string): MarpProjectFile | null {
  const decoded = decodeMarpProjectFile(contents);
  return Exit.isSuccess(decoded) ? decoded.value : null;
}

export function buildMarpProjectFileJsonSchema(): Record<string, unknown> {
  const document = Schema.toJsonSchemaDocument(MarpProjectFile, { onExcessProperty: "error" });
  const jsonSchema: Record<string, unknown> = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: MARP_PROJECT_FILE_SCHEMA_URL,
    ...document.schema,
  };
  if (document.definitions && Object.keys(document.definitions).length > 0) {
    jsonSchema.$defs = document.definitions;
  }
  return jsonSchema;
}
