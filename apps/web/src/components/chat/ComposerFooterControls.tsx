import type {
  ModelSelection,
  ProviderInstanceId,
  ProviderInteractionMode,
  RuntimeMode,
} from "@marp/contracts";
import { createModelSelection } from "@marp/shared/model";
import { type ComponentProps, memo, useId, useRef, useState } from "react";

import type { ContextWindowSnapshot } from "../../lib/contextWindow";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRadioItemIndicator,
  MenuTrigger,
} from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ComposerControl, ComposerControlIcon } from "./ComposerControl";
import { focusRequestedPermission, useComposerMenuProps } from "./composerEventScope";
import { ComposerPrimaryActions } from "./ComposerPrimaryActions";
import { ContextWindowMeter, ContextWindowMeterPlaceholder } from "./ContextWindowMeter";
import { resolveModelPickerSelectedModel } from "./ModelPickerContent";
import { ProviderModelPicker } from "./ProviderModelPicker";
import { interactionModeConfig, runtimeModeConfig } from "./runtimeModeConfig";
import { useComposerMenuState } from "./useComposerMenuState";

export type RuntimeModeOption = { mode: RuntimeMode } & (typeof runtimeModeConfig)[RuntimeMode];
const supervisedRuntimeModeOption = {
  mode: "approval-required" as const,
  ...runtimeModeConfig["approval-required"],
};
export const ComposerFooterModeControls = memo(function ComposerFooterModeControls(props: {
  showInteractionModeToggle: boolean;
  interactionMode: ProviderInteractionMode;
  interactionModes: ReadonlyArray<ProviderInteractionMode>;
  runtimeMode: RuntimeMode;
  runtimeModeOptions: ReadonlyArray<RuntimeModeOption>;
  size?: "sm" | "xs";
  hidden?: boolean;
  /** The permissions chip names its mode, or shows only the icon in the compacted row. */
  accessDisplay?: "label" | "icon";
  onInteractionModeChange: (mode: ProviderInteractionMode) => void;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
}) {
  const size = props.size ?? "sm";
  const accessDisplay = props.accessDisplay ?? "label";
  const composerFloatingLayerProps = useComposerMenuProps();
  const [open, setOpen] = useComposerMenuState(props.hidden);
  const permissionsChipRef = useRef<HTMLButtonElement>(null);
  const runtimeModeOption =
    props.runtimeModeOptions.find((option) => option.mode === props.runtimeMode) ??
    supervisedRuntimeModeOption;
  const RuntimeModeIcon = runtimeModeOption.icon;
  const interactionModeMenu = props.showInteractionModeToggle ? (
    <ComposerInteractionModeMenu
      interactionMode={props.interactionMode}
      interactionModes={props.interactionModes}
      size={size}
      {...(props.hidden === undefined ? {} : { hidden: props.hidden })}
      onInteractionModeChange={props.onInteractionModeChange}
    />
  ) : null;

  // The chip opens the same Permissions toggle used in the effort menu.
  const permissionsTooltip = `Permissions: ${runtimeModeOption.label}. ${runtimeModeOption.description}`;
  const permissionsChip = (
    <Menu
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) =>
        focusRequestedPermission(isOpen, permissionsChipRef.current)
      }
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ComposerControl
                  ref={permissionsChipRef}
                  data-composer-shortcut="composer.mode"
                  size={size}
                  aria-label={`Permissions: ${runtimeModeOption.label}`}
                />
              }
            />
          }
        >
          <ComposerControlIcon icon={RuntimeModeIcon} size={size} />
          <span
            data-composer-control-label
            className={accessDisplay === "icon" ? "sr-only" : undefined}
          >
            {runtimeModeOption.label}
          </span>
          {props.runtimeMode === "full-access" ? (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
          ) : null}
        </TooltipTrigger>
        <TooltipPopup side="top">{permissionsTooltip}</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start" {...composerFloatingLayerProps}>
        <ComposerPermissionsSection
          runtimeMode={props.runtimeMode}
          runtimeModeOptions={props.runtimeModeOptions}
          onRuntimeModeChange={props.onRuntimeModeChange}
        />
      </MenuPopup>
    </Menu>
  );

  return (
    <>
      {interactionModeMenu}
      {permissionsChip}
    </>
  );
});

function ComposerInteractionModeMenu(props: {
  interactionMode: ProviderInteractionMode;
  interactionModes: ReadonlyArray<ProviderInteractionMode>;
  size: "sm" | "xs";
  hidden?: boolean;
  onInteractionModeChange: (mode: ProviderInteractionMode) => void;
}) {
  const composerFloatingLayerProps = useComposerMenuProps();
  const [open, setOpen] = useComposerMenuState(props.hidden);
  const current = interactionModeConfig[props.interactionMode];
  return (
    <Menu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <ComposerControl
                  size={props.size}
                  className="shrink-0 whitespace-nowrap"
                  aria-label={`Mode: ${current.label}`}
                />
              }
            />
          }
        >
          <ComposerControlIcon icon={current.icon} size={props.size} />
          {/* The compacted row (xs) keeps this icon-only, like the other controls there. */}
          <span data-composer-control-label className={props.size === "xs" ? "sr-only" : undefined}>
            {current.label}
          </span>
        </TooltipTrigger>
        <TooltipPopup side="top">{`${current.label}: ${current.description} Shift+Tab switches modes.`}</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start" {...composerFloatingLayerProps}>
        <ComposerInteractionModeSection
          interactionMode={props.interactionMode}
          interactionModes={props.interactionModes}
          onInteractionModeChange={props.onInteractionModeChange}
        />
      </MenuPopup>
    </Menu>
  );
}

/** Interaction modes as a checked list with a line on what each does. Lives inside a Menu. */
export function ComposerInteractionModeSection(props: {
  interactionMode: ProviderInteractionMode;
  interactionModes: ReadonlyArray<ProviderInteractionMode>;
  onInteractionModeChange: (mode: ProviderInteractionMode) => void;
}) {
  return (
    <div data-composer-interaction-modes className="grid w-72 gap-0.5">
      <div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Mode</div>
      <MenuRadioGroup
        aria-label="Mode"
        value={props.interactionMode}
        onValueChange={(value: ProviderInteractionMode) => {
          if (value !== props.interactionMode) props.onInteractionModeChange(value);
        }}
      >
        {props.interactionModes.map((mode) => {
          const option = interactionModeConfig[mode];
          const OptionIcon = option.icon;
          return (
            <MenuRadioItem key={mode} value={mode} closeOnClick>
              <span className="flex min-w-0 items-center gap-2.5 py-0.5">
                <OptionIcon aria-hidden="true" className="text-muted-foreground" />
                <span className="grid min-w-0 flex-1">
                  <span>{option.label}</span>
                  <span className="text-muted-foreground text-xs">{option.description}</span>
                </span>
                <MenuRadioItemIndicator />
              </span>
            </MenuRadioItem>
          );
        })}
      </MenuRadioGroup>
    </div>
  );
}

/**
 * Permission modes as one horizontal toggle, with the shown mode named below.
 * Each segment is a real menu radio item, so arrow keys reach it from the rest of the menu
 * and a pick closes the menu. Lives inside a Menu: the permissions chip, the effort menu,
 * or the overflow menu.
 */
export function ComposerPermissionsSection(props: {
  runtimeMode: RuntimeMode;
  runtimeModeOptions: ReadonlyArray<
    { mode: RuntimeMode } & (typeof runtimeModeConfig)[RuntimeMode]
  >;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
}) {
  // Hover or keyboard focus previews a mode's name and description before a pick.
  const [previewMode, setPreviewMode] = useState<RuntimeMode | null>(null);
  const shownMode = previewMode ?? props.runtimeMode;
  const shown =
    props.runtimeModeOptions.find((option) => option.mode === shownMode) ??
    supervisedRuntimeModeOption;
  const descriptionId = useId();
  return (
    <div data-composer-permissions className="grid w-72 gap-1.5 px-2 py-1.5">
      <div className="font-medium text-muted-foreground text-xs">Permissions</div>
      <MenuPrimitive.RadioGroup
        aria-label="Permissions"
        value={props.runtimeMode}
        onValueChange={(value: RuntimeMode) => {
          if (value !== props.runtimeMode) props.onRuntimeModeChange(value);
        }}
        className="flex gap-0.5 rounded-lg bg-input/40 p-0.5"
        // Menus navigate with Up/Down only; the row reads horizontally, so Left/Right move too.
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
          );
          const index = items.findIndex((item) => item === document.activeElement);
          const next = items[index + (event.key === "ArrowRight" ? 1 : -1)];
          if (index < 0 || !next) return;
          event.preventDefault();
          event.stopPropagation();
          next.focus();
        }}
      >
        {props.runtimeModeOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <MenuPrimitive.RadioItem
              key={option.mode}
              value={option.mode}
              label={option.label}
              aria-label={option.label}
              aria-describedby={`${descriptionId}-${option.mode}`}
              closeOnClick
              onPointerEnter={() => setPreviewMode(option.mode)}
              onPointerLeave={() => setPreviewMode(null)}
              onFocus={() => setPreviewMode(option.mode)}
              onBlur={() => setPreviewMode(null)}
              className="flex h-6 flex-1 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none data-checked:bg-input/72 data-checked:text-foreground data-highlighted:text-foreground not-data-checked:data-highlighted:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <OptionIcon aria-hidden="true" className="size-3.5" />
            </MenuPrimitive.RadioItem>
          );
        })}
      </MenuPrimitive.RadioGroup>
      {/* Static per-mode descriptions for screen readers; the preview below is visual only. */}
      {props.runtimeModeOptions.map((option) => (
        <span key={option.mode} id={`${descriptionId}-${option.mode}`} className="sr-only">
          {option.description}
        </span>
      ))}
      <div className="grid gap-0.5" aria-hidden="true">
        <span
          className={
            shownMode === props.runtimeMode
              ? "text-foreground text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {shown.label}
        </span>
        {/* Two lines reserved so the menu does not shift while you preview modes. */}
        <span className="min-h-8 text-muted-foreground text-xs leading-4">{shown.description}</span>
      </div>
    </div>
  );
}

export const ComposerFooterPrimaryActions = memo(function ComposerFooterPrimaryActions(props: {
  compact: boolean;
  canOperateThread: boolean;
  activeContextWindow: ContextWindowSnapshot | null;
  reserveContextWindowMeter: boolean;
  activeThreadModelDisplayName: string | null;
  isPreparingWorktree: boolean;
  pendingAction: {
    questionIndex: number;
    isLastQuestion: boolean;
    canAdvance: boolean;
    isResponding: boolean;
    isComplete: boolean;
  } | null;
  isRunning: boolean;
  canInterrupt: boolean;
  followUpBehavior: "queue" | "steer";
  canSteer: boolean;
  alternateShortcutLabel: string | null;
  showPlanFollowUpPrompt: boolean;
  promptHasText: boolean;
  isSendBusy: boolean;
  sendDisabledReason: string | null;
  isEnvironmentUnavailable: boolean;
  hasSendableContent: boolean;
  canResume: boolean;
  preserveComposerFocusOnPointerDown?: boolean;
  isEditingQueuedMessage: boolean;
  onSubmitMessage: React.MouseEventHandler<HTMLButtonElement>;
  onResume: () => void;
  onPreviousPendingQuestion: () => void;
  onInterrupt: () => void;
  onImplementPlanInNewThread: () => void;
  onCompactContext?: (() => void) | undefined;
  compactDisabled: boolean;
  compactDisabledReason: string | null;
  compactBeforeSendTokens: number | null;
  keepFullHistory: boolean;
  onToggleKeepFullHistory: () => void;
}) {
  return (
    <>
      {props.activeContextWindow ? (
        <ContextWindowMeter
          usage={props.activeContextWindow}
          modelDisplayName={props.activeThreadModelDisplayName}
          onCompact={props.onCompactContext}
          compactDisabled={props.compactDisabled}
          compactDisabledReason={props.compactDisabledReason}
        />
      ) : props.reserveContextWindowMeter ? (
        <ContextWindowMeterPlaceholder />
      ) : null}
      <ComposerPrimaryActions
        compact={props.compact}
        canOperateThread={props.canOperateThread}
        pendingAction={props.pendingAction}
        isRunning={props.isRunning}
        canInterrupt={props.canInterrupt}
        followUpBehavior={props.followUpBehavior}
        canSteer={props.canSteer}
        alternateShortcutLabel={props.alternateShortcutLabel}
        showPlanFollowUpPrompt={props.showPlanFollowUpPrompt}
        promptHasText={props.promptHasText}
        isSendBusy={props.isSendBusy}
        sendDisabledReason={props.sendDisabledReason}
        isEnvironmentUnavailable={props.isEnvironmentUnavailable}
        isPreparingWorktree={props.isPreparingWorktree}
        hasSendableContent={props.hasSendableContent}
        canResume={props.canResume}
        preserveComposerFocusOnPointerDown={props.preserveComposerFocusOnPointerDown ?? false}
        isEditingQueuedMessage={props.isEditingQueuedMessage}
        onSubmitMessage={props.onSubmitMessage}
        onResume={props.onResume}
        onPreviousPendingQuestion={props.onPreviousPendingQuestion}
        onInterrupt={props.onInterrupt}
        onImplementPlanInNewThread={props.onImplementPlanInNewThread}
        compactBeforeSendTokens={props.compactBeforeSendTokens}
        keepFullHistory={props.keepFullHistory}
        onToggleKeepFullHistory={props.onToggleKeepFullHistory}
      />
    </>
  );
});

/**
 * The composer's model picker. It owns the single- and multi-model selection
 * handlers so they are cached against the selection state, not rebuilt on
 * every ChatComposer render.
 */
export function ComposerModelPicker({
  multipleModelsEnabled,
  multipleModelSelections,
  onMultipleModelSelectionsChange,
  selectedModelSelection,
  onProviderModelSelect,
  ...pickerProps
}: Omit<
  ComponentProps<typeof ProviderModelPicker>,
  "selectedModels" | "onToggleModel" | "onInstanceModelChange"
> & {
  readonly multipleModelsEnabled: boolean;
  readonly multipleModelSelections: ReadonlyArray<ModelSelection> | null;
  readonly onMultipleModelSelectionsChange: (
    selections: ReadonlyArray<ModelSelection> | null,
  ) => void;
  readonly selectedModelSelection: ModelSelection;
  readonly onProviderModelSelect: (
    instanceId: ProviderInstanceId,
    model: string,
    options?: { focusComposer?: boolean },
  ) => void;
}) {
  const { instanceEntries, modelOptionsByInstance } = pickerProps;
  const toggleModel = (instanceId: ProviderInstanceId, model: string) => {
    const current = multipleModelSelections ?? [selectedModelSelection];
    const matchesModel = (selection: ModelSelection) => {
      if (selection.instanceId !== instanceId) return false;
      const entry = instanceEntries.find((entry) => entry.instanceId === selection.instanceId);
      const resolvedModel = resolveModelPickerSelectedModel({
        driverKind: entry?.driverKind,
        model: selection.model,
        options: modelOptionsByInstance?.get(selection.instanceId) ?? [],
      });
      return (resolvedModel?.slug ?? selection.model) === model;
    };
    const exists = current.some(matchesModel);
    const next = exists
      ? current.filter((selection) => !matchesModel(selection))
      : [...current, createModelSelection(instanceId, model)];
    if (next.length > 1) {
      onMultipleModelSelectionsChange(next);
    } else {
      onMultipleModelSelectionsChange(null);
      const remaining = next[0] ?? selectedModelSelection;
      onProviderModelSelect(remaining.instanceId, remaining.model, {
        focusComposer: false,
      });
    }
  };
  return (
    <ProviderModelPicker
      {...pickerProps}
      {...(multipleModelsEnabled
        ? {
            ...(multipleModelSelections !== null
              ? { selectedModels: multipleModelSelections }
              : {}),
            onToggleModel: toggleModel,
          }
        : {})}
      onInstanceModelChange={(instanceId, model) => {
        onMultipleModelSelectionsChange(null);
        onProviderModelSelect(instanceId, model);
      }}
    />
  );
}
