import { proposedPlanTitle, stripDisplayedPlanMarkdown } from "@marp/shared/proposedPlanText";
import { memo, useState, useId } from "react";
import { findRevealRef } from "./markdownFindContext";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@marp/client-runtime/state/runtime";
import {
  AuthFilesystemWriteScope,
  type EnvironmentId,
  type ScopedThreadRef,
} from "@marp/contracts";
import {
  buildCollapsedProposedPlanPreviewMarkdown,
  buildProposedPlanMarkdownFilename,
  downloadPlanAsTextFile,
  normalizePlanMarkdownForExport,
} from "../../proposedPlan";
import ChatMarkdown from "../ChatMarkdown";
import { EllipsisIcon, ListChecksIcon, PencilIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "../ui/menu";
import { cn } from "~/lib/utils";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { projectEnvironment } from "~/state/projects";
import { useCopyToClipboard } from "~/hooks/useCopyToClipboard";
import { useAtomCommand } from "~/state/use-atom-command";
import { readEnvironmentScope, useEnvironmentScope } from "~/state/session";

export const ProposedPlanCard = memo(function ProposedPlanCard({
  planMarkdown,
  environmentId,
  threadRef,
  cwd,
  workspaceRoot,
  findActive = false,
  actions = null,
}: {
  /** Present only on the plan the thread can act on now. */
  actions?: { onImplement: () => void; onRefine: () => void } | null;
  planMarkdown: string;
  environmentId: EnvironmentId;
  threadRef?: ScopedThreadRef | undefined;
  cwd: string | undefined;
  workspaceRoot: string | undefined;
  findActive?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canWriteFiles = useEnvironmentScope(environmentId, AuthFilesystemWriteScope);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [lastSavePath, setLastSavePath] = useState("");
  const [isSavingToWorkspace, setIsSavingToWorkspace] = useState(false);
  const writeProjectFile = useAtomCommand(projectEnvironment.writeFile, {
    reportFailure: false,
  });
  const { copyToClipboard, isCopied } = useCopyToClipboard({
    target: "plan",
    onError: (error) => {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not copy plan",
          description: error instanceof Error ? error.message : "An error occurred while copying.",
        }),
      );
    },
  });
  const title = proposedPlanTitle(planMarkdown) ?? "Proposed plan";
  const lineCount = planMarkdown.split("\n").length;
  const canCollapse = planMarkdown.length > 900 || lineCount > 20;
  const displayedPlanMarkdown = stripDisplayedPlanMarkdown(planMarkdown);
  const collapsedPreview = canCollapse
    ? buildCollapsedProposedPlanPreviewMarkdown(planMarkdown, { maxLines: 10 })
    : null;
  const isCollapsed = canCollapse && !expanded;
  // Mount clipped plans during find to count hidden matches without revealing them.
  const showPreview = isCollapsed && !findActive;
  const revealRef = findRevealRef(() => setExpanded(true));
  const downloadFilename = buildProposedPlanMarkdownFilename(planMarkdown);
  const saveContents = normalizePlanMarkdownForExport(planMarkdown);

  const handleDownload = () => {
    downloadPlanAsTextFile(downloadFilename, saveContents);
  };

  const handleCopyPlan = () => {
    copyToClipboard(saveContents);
  };

  const openSaveDialog = () => {
    if (!canWriteFiles) return;
    if (!workspaceRoot) {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Workspace path is unavailable",
          description: "This thread does not have a workspace path to save into.",
        }),
      );
      return;
    }
    setIsSaveDialogOpen(true);
  };

  const handleSaveToWorkspace = (savePath: string) => {
    const relativePath = savePath.trim();
    if (!workspaceRoot || !readEnvironmentScope(environmentId, AuthFilesystemWriteScope)) {
      return;
    }
    if (!relativePath) {
      toastManager.add({
        type: "warning",
        title: "Enter a workspace path",
      });
      return;
    }

    setLastSavePath(savePath);
    setIsSavingToWorkspace(true);
    void (async () => {
      const result = await writeProjectFile({
        environmentId,
        input: {
          cwd: workspaceRoot,
          relativePath,
          contents: saveContents,
        },
      });
      setIsSavingToWorkspace(false);
      if (result._tag === "Success") {
        setIsSaveDialogOpen(false);
        toastManager.add({
          type: "success",
          title: "Plan saved to workspace",
          description: result.value.relativePath,
        });
        return;
      }
      if (!isAtomCommandInterrupted(result)) {
        const error = squashAtomCommandFailure(result);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not save plan",
            description: error instanceof Error ? error.message : "An error occurred while saving.",
          }),
        );
      }
    })();
  };

  return (
    <div className="rounded-card bg-card p-4 shadow-raised sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {actions ? (
            <Badge variant="warning">
              <ListChecksIcon aria-hidden />
              Plan ready
            </Badge>
          ) : (
            <Badge variant="secondary">Plan</Badge>
          )}
          {}
          <h3 data-thread-find-text="true" className="truncate text-sm font-medium text-foreground">
            {title}
          </h3>
        </div>
        <Menu>
          <MenuTrigger
            render={<Button aria-label="Plan actions" size="icon-xs" variant="outline" />}
          >
            <EllipsisIcon aria-hidden="true" className="size-4" />
          </MenuTrigger>
          <MenuPopup align="end">
            <MenuItem onClick={handleCopyPlan}>
              {isCopied ? "Copied!" : "Copy to clipboard"}
            </MenuItem>
            <MenuItem onClick={handleDownload}>Download as markdown</MenuItem>
            <MenuItem
              onClick={openSaveDialog}
              disabled={!canWriteFiles || !workspaceRoot || isSavingToWorkspace}
            >
              Save to workspace
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
      <div className="mt-4">
        <div
          ref={revealRef}
          className={cn("relative", isCollapsed && "max-h-104 overflow-hidden")}
          data-thread-find-text="true"
          data-thread-find-fold={isCollapsed ? "" : undefined}
        >
          {showPreview ? (
            <ChatMarkdown
              text={collapsedPreview ?? ""}
              cwd={cwd}
              environmentId={environmentId}
              threadRef={threadRef}
              isStreaming={false}
              headingLevelOffset={3}
            />
          ) : (
            <ChatMarkdown
              text={displayedPlanMarkdown}
              cwd={cwd}
              environmentId={environmentId}
              threadRef={threadRef}
              isStreaming={false}
              headingLevelOffset={3}
            />
          )}
          {isCollapsed ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-card/95 via-card/80 to-transparent" />
          ) : null}
        </div>
        {canCollapse ? (
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              variant="outline"
              data-scroll-anchor-ignore
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Collapse plan" : "Expand plan"}
            </Button>
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={actions.onRefine}>
            <PencilIcon aria-hidden />
            Refine
          </Button>
          <Button size="sm" onClick={actions.onImplement}>
            Implement plan
          </Button>
        </div>
      ) : null}

      <Dialog
        open={isSaveDialogOpen}
        onOpenChange={(open) => {
          if (!isSavingToWorkspace) {
            setIsSaveDialogOpen(open);
          }
        }}
      >
        <DialogPopup className="max-w-xl">
          <SavePlanToWorkspaceForm
            initialPath={lastSavePath || downloadFilename}
            placeholder={downloadFilename}
            workspaceRoot={workspaceRoot}
            canWriteFiles={canWriteFiles}
            saving={isSavingToWorkspace}
            onCancel={() => setIsSaveDialogOpen(false)}
            onSave={handleSaveToWorkspace}
          />
        </DialogPopup>
      </Dialog>
    </div>
  );
});

function SavePlanToWorkspaceForm({
  initialPath,
  placeholder,
  workspaceRoot,
  canWriteFiles,
  saving,
  onCancel,
  onSave,
}: {
  initialPath: string;
  placeholder: string;
  workspaceRoot: string | undefined;
  canWriteFiles: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (path: string) => void;
}) {
  const [savePath, setSavePath] = useState(initialPath);
  const savePathInputId = useId();
  return (
    <>
      <DialogHeader>
        <DialogTitle>Save plan to workspace</DialogTitle>
        <DialogDescription>
          Enter a path relative to <code>{workspaceRoot ?? "the workspace"}</code>.
        </DialogDescription>
      </DialogHeader>
      <DialogPanel>
        <label htmlFor={savePathInputId} className="grid gap-1.5">
          <span className="text-xs font-medium text-foreground">Workspace path</span>
          <Input
            id={savePathInputId}
            value={savePath}
            onChange={(event) => setSavePath(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            disabled={saving}
          />
        </label>
      </DialogPanel>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(savePath)} disabled={!canWriteFiles || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
