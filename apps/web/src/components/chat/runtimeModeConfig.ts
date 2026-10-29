import type { ProviderInteractionMode, RuntimeMode } from "@marp/contracts";
import {
  BugIcon,
  ListChecksIcon,
  type LucideIcon,
  MessageCircleQuestionMarkIcon,
  MessageSquareIcon,
  PenLineIcon,
  ShieldIcon,
  SparklesIcon,
  SplitIcon,
  ZapIcon,
} from "lucide-react";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: LucideIcon }
> = {
  "approval-required": {
    label: "Supervised",
    description: "Ask before commands and file changes.",
    icon: ShieldIcon,
  },
  "auto-accept-edits": {
    label: "Auto-accept edits",
    description: "Auto-approve edits, ask before other actions.",
    icon: PenLineIcon,
  },
  auto: {
    label: "Auto",
    description: "Supported providers approve routine actions; others still ask.",
    icon: SparklesIcon,
  },
  "full-access": {
    label: "Full access",
    description: "Allow commands and edits without prompts.",
    icon: ZapIcon,
  },
};

export const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];

/** The modes a provider supports (all when it reports none) and the mode a thread really runs in. */
export function resolveCompatibleRuntimeMode(
  runtimeMode: RuntimeMode,
  supportedRuntimeModes: ReadonlyArray<RuntimeMode> | undefined,
) {
  const modes =
    supportedRuntimeModes && supportedRuntimeModes.length > 0
      ? runtimeModeOptions.filter((mode) => supportedRuntimeModes.includes(mode))
      : runtimeModeOptions;
  return { modes, mode: modes.includes(runtimeMode) ? runtimeMode : (modes[0] ?? runtimeMode) };
}

export const interactionModeConfig: Record<
  ProviderInteractionMode,
  { label: string; description: string; icon: LucideIcon }
> = {
  default: {
    label: "Chat",
    description: "Work with the agent; it can make changes.",
    icon: MessageSquareIcon,
  },
  plan: {
    label: "Plan",
    description: "Plan the work before changing anything.",
    icon: ListChecksIcon,
  },
  ask: {
    label: "Ask",
    description: "Answer questions without making edits.",
    icon: MessageCircleQuestionMarkIcon,
  },
  debug: {
    label: "Debug",
    description: "Pinpoint the root cause of an issue.",
    icon: BugIcon,
  },
  multitask: {
    label: "Multitask",
    description: "Run tasks in parallel with subagents.",
    icon: SplitIcon,
  },
};
