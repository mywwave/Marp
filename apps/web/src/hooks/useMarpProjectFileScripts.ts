import {
  MARP_PROJECT_FILE_NAME,
  type EnvironmentId,
  type MarpProjectFile,
  type MarpProjectFileScript,
} from "@marp/contracts";
import { parseMarpProjectFile } from "@marp/shared/marpProjectFile";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<MarpProjectFileScript> = [];

export interface MarpProjectFileState {
  status: "loading" | "missing" | "invalid" | "valid";
  file: MarpProjectFile | null;
  scripts: ReadonlyArray<MarpProjectFileScript>;
}

export function useMarpProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): MarpProjectFileState {
  const query = useProjectFileQuery(environmentId, cwd ?? "", MARP_PROJECT_FILE_NAME, cwd !== null);
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  if (contents === null) {
    return {
      status: isPending ? "loading" : "missing",
      file: null,
      scripts: NO_SCRIPTS,
    } as const;
  }
  const file = parseMarpProjectFile(contents);
  if (file === null) {
    return { status: "invalid", file: null, scripts: NO_SCRIPTS } as const;
  }
  return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS } as const;
}

export function useMarpProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<MarpProjectFileScript> {
  return useMarpProjectFileState(environmentId, cwd).scripts;
}
