import { pipe } from "effect/Function";
import {
  fileBasename,
  stripSlashPrefixedWindowsDrive,
  isWindowsAbsolutePath,
} from "@marp/shared/path";
import { formatFilePathPosition, splitFilePathPosition } from "@marp/shared/fileLinks";

function normalizePathSeparators(path: string): string {
  return path.replaceAll("\\", "/");
}

function trimTrailingPathSeparators(path: string): string {
  return path.replace(/[\\/]+$/, "");
}

function stripRelativePrefixes(path: string): string {
  return path.replace(/^\.\/+/, "").replace(/^\/+/, "");
}

export function formatWorkspaceRelativePath(
  pathWithPosition: string,
  workspaceRoot: string | undefined,
): string {
  const position = splitFilePathPosition(pathWithPosition);
  const normalizedPath = stripSlashPrefixedWindowsDrive(normalizePathSeparators(position.path));

  let displayPath = normalizedPath;
  if (workspaceRoot) {
    const normalizedWorkspaceRoot = pipe(
      trimTrailingPathSeparators(workspaceRoot),
      normalizePathSeparators,
      stripSlashPrefixedWindowsDrive,
    );
    const workspaceLabel = fileBasename(normalizedWorkspaceRoot);
    const caseInsensitive = isWindowsAbsolutePath(stripSlashPrefixedWindowsDrive(workspaceRoot));
    const pathForCompare = caseInsensitive ? normalizedPath.toLowerCase() : normalizedPath;
    const workspaceForCompare = caseInsensitive
      ? normalizedWorkspaceRoot.toLowerCase()
      : normalizedWorkspaceRoot;
    const workspaceWithSeparator = `${workspaceForCompare}/`;
    const workspaceLabelWithSeparator = `${caseInsensitive ? workspaceLabel.toLowerCase() : workspaceLabel}/`;

    if (pathForCompare === workspaceForCompare) {
      displayPath = workspaceLabel;
    } else if (pathForCompare.startsWith(workspaceWithSeparator)) {
      const relativeSuffix = normalizedPath.slice(normalizedWorkspaceRoot.length + 1);
      displayPath = `${workspaceLabel}/${relativeSuffix}`;
    } else if (!normalizedPath.startsWith("/")) {
      const relativePath = stripRelativePrefixes(normalizedPath);
      displayPath = pathForCompare.startsWith(workspaceLabelWithSeparator)
        ? normalizedPath
        : `${workspaceLabel}/${relativePath}`;
    }
  }

  return formatFilePathPosition({ ...position, path: displayPath });
}

const TIMELINE_PATH_FOLDERS = 2;

/** A timeline step's path: its name, then at most its last two folders below the workspace. */
export function timelinePathParts(
  path: string,
  workspaceRoot: string | undefined,
): { readonly name: string; readonly dir: string } {
  // Git Bash spells `D:\w` as `/d/w`, which `cd /d/w && grep …` passes through.
  const drivePath =
    workspaceRoot && isWindowsAbsolutePath(stripSlashPrefixedWindowsDrive(workspaceRoot))
      ? path.replace(/^\/([A-Za-z])(?=\/)/u, (_, drive: string) => `${drive.toUpperCase()}:`)
      : path;
  const display = formatWorkspaceRelativePath(drivePath, workspaceRoot);
  const label = workspaceRoot
    ? fileBasename(trimTrailingPathSeparators(normalizePathSeparators(workspaceRoot)))
    : "";
  const insideWorkspace =
    label.length > 0 && display.toLowerCase().startsWith(`${label.toLowerCase()}/`);
  const relative = insideWorkspace ? display.slice(label.length + 1) : display;
  const folders = relative.split("/");
  const name = folders.pop() || relative;
  const named = folders.filter((folder) => folder.length > 0);
  if (named.length > TIMELINE_PATH_FOLDERS) {
    return { name, dir: `…/${named.slice(-TIMELINE_PATH_FOLDERS).join("/")}` };
  }
  return { name, dir: folders.join("/") };
}
