import type { EditorId, EnvironmentId, ResolvedKeybindingsConfig, ThreadId } from "@marp/contracts";
import { SquareArrowOutUpRightIcon } from "lucide-react";
import { memo } from "react";

import type { DraftId } from "../../composerDraftStore";
import type { EnvMode } from "../BranchToolbar.logic";
import { BranchToolbarBranchSelector } from "../BranchToolbarBranchSelector";
import BaseGitActionsControl from "../GitActionsControl";
import { Button } from "../ui/button";
import { Menu, MenuPopup, MenuTrigger } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { OpenInPicker } from "./OpenInPicker";

const GitActionsControl = memo(BaseGitActionsControl);

/** Daily git work stays in the header so it never depends on the details card's height. */
export const ThreadHeaderActions = memo(function ThreadHeaderActions(props: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
  draftId?: DraftId | undefined;
  gitCwd: string | null;
  isGitRepo: boolean;
  keybindings: ResolvedKeybindingsConfig;
  availableEditors: ReadonlyArray<EditorId>;
  showOpenInPicker: boolean;
  openInShortcutEnabled: boolean;
  envLocked: boolean;
  envMode: EnvMode;
  activeThreadBranchOverride?: string | null | undefined;
  onActiveThreadBranchOverrideChange?: ((branch: string | null) => void) | undefined;
  startFromOrigin: boolean;
  onStartFromOriginChange: (startFromOrigin: boolean) => void;
  onCheckoutPullRequestRequest?: ((reference: string) => void) | undefined;
  onComposerFocusRequest: () => void;
  onOpenChanges?: (() => void) | undefined;
}) {
  if (props.gitCwd === null) return null;
  const threadRef = { environmentId: props.environmentId, threadId: props.threadId };
  return (
    <div className="flex min-w-0 shrink items-center gap-1 pe-2 [-webkit-app-region:no-drag]">
      {props.isGitRepo ? (
        <BranchToolbarBranchSelector
          displayMode="header"
          className="min-w-0"
          environmentId={props.environmentId}
          threadId={props.threadId}
          {...(props.draftId ? { draftId: props.draftId } : {})}
          envLocked={props.envLocked}
          effectiveEnvModeOverride={props.envMode}
          {...(props.activeThreadBranchOverride !== undefined
            ? { activeThreadBranchOverride: props.activeThreadBranchOverride }
            : {})}
          {...(props.onActiveThreadBranchOverrideChange
            ? { onActiveThreadBranchOverrideChange: props.onActiveThreadBranchOverrideChange }
            : {})}
          startFromOrigin={props.startFromOrigin}
          onStartFromOriginChange={props.onStartFromOriginChange}
          {...(props.onCheckoutPullRequestRequest
            ? { onCheckoutPullRequestRequest: props.onCheckoutPullRequestRequest }
            : {})}
          onComposerFocusRequest={props.onComposerFocusRequest}
        />
      ) : null}
      <GitActionsControl
        layout="header"
        gitCwd={props.gitCwd}
        activeThreadRef={threadRef}
        {...(props.draftId ? { draftId: props.draftId } : {})}
        {...(props.onOpenChanges ? { onOpenChanges: props.onOpenChanges } : {})}
      />
      {props.showOpenInPicker && props.availableEditors.length > 0 ? (
        <Menu>
          <Tooltip>
            <TooltipTrigger
              render={
                <MenuTrigger
                  render={<Button variant="toolbar" size="icon-xs" aria-label="Open in editor" />}
                />
              }
            >
              <SquareArrowOutUpRightIcon aria-hidden />
            </TooltipTrigger>
            <TooltipPopup side="bottom">Open in editor</TooltipPopup>
          </Tooltip>
          <MenuPopup align="end">
            <OpenInPicker
              presentation="menu"
              keybindings={props.keybindings}
              environmentId={props.environmentId}
              availableEditors={props.availableEditors}
              openInCwd={props.gitCwd}
              enableShortcut={props.openInShortcutEnabled}
            />
          </MenuPopup>
        </Menu>
      ) : null}
    </div>
  );
});
