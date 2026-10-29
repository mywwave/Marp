import { MARP_PROJECT_FILE_NAME, type EnvironmentId, type MarpProjectFile } from "@marp/contracts";
import { parseMarpProjectFile } from "@marp/shared/marpProjectFile";
import { executeAtomQuery } from "@marp/client-runtime/state/runtime";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

export async function readMarpProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<MarpProjectFile | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    getProjectFileQueryAtom(environmentId, workspaceRoot, MARP_PROJECT_FILE_NAME),
    { reportDefect: false, reportFailure: false },
  );
  const data = resolveProjectFileQueryData(
    environmentId,
    workspaceRoot,
    MARP_PROJECT_FILE_NAME,
    result._tag === "Success" ? result.value : null,
  );
  if (data === null || data.exists === false || data.truncated) return null;
  return parseMarpProjectFile(data.contents);
}
