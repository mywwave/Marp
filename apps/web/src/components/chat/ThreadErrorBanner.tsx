import type { OrchestrationV2ProviderFailureClass } from "@marp/contracts";
import {
  CHATGPT_USAGE_LIMIT_CODE,
  CHATGPT_WORKSPACE_ADMIN_REQUEST,
  CHATGPT_WORKSPACE_USAGE_LIMIT_CODE,
} from "@marp/shared/usageLimits";
import { memo } from "react";
import { writeTextToClipboard } from "../../hooks/useCopyToClipboard";
import { Alert, AlertAction, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { toastManager } from "../ui/toast";
import { CircleAlertIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { OpenAI } from "../Icons";
import { ChatGptUsageButton } from "../settings/ChatGptUsageButton";
import { ExpandableText } from "../settings/ExpandableText";

function copyAdminRequest() {
  void writeTextToClipboard(CHATGPT_WORKSPACE_ADMIN_REQUEST, "admin request").then(
    () =>
      toastManager.add({
        type: "success",
        title: "Request copied",
        description: "Send it to your workspace admin.",
      }),
    () => toastManager.add({ type: "error", title: "Could not copy the request" }),
  );
}

export function getThreadErrorBannerMessage(error: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(error);
  } catch {
    return error;
  }
  if (typeof payload !== "object" || payload === null || !("error" in payload)) {
    return error;
  }
  const nestedError = payload.error;
  if (typeof nestedError !== "object" || nestedError === null || !("message" in nestedError)) {
    return error;
  }
  return typeof nestedError.message === "string" && nestedError.message.trim().length > 0
    ? nestedError.message
    : error;
}

/** A plain-language headline for a provider failure; the raw text stays under it. */
export function failedTurnTitle(errorClass: OrchestrationV2ProviderFailureClass): string {
  switch (errorClass) {
    case "usage_limit":
      return "Usage limit reached";
    case "transport_error":
      return "Lost the connection to the agent";
    case "permission_error":
      return "The agent was not allowed to continue";
    case "validation_error":
      return "The provider rejected the request";
    case "provider_error":
      return "The agent stopped with an error";
    case "unknown":
      return "This turn failed";
  }
}

export function getThreadErrorBannerKey(threadKey: string, error: string | null): string | null {
  return error === null ? null : `${threadKey}\u0000${error}`;
}

export function shouldShowThreadErrorBanner(
  threadKey: string,
  error: string | null,
  isDismissed: boolean,
): boolean {
  return getThreadErrorBannerKey(threadKey, error) !== null && !isDismissed;
}

const sessionDismissedThreadErrorBannerKeys = new Set<string>();

export function dismissThreadErrorBannerForSession(bannerKey: string | null): void {
  if (bannerKey !== null) {
    sessionDismissedThreadErrorBannerKeys.add(bannerKey);
  }
}

export function isThreadErrorBannerDismissedForSession(bannerKey: string | null): boolean {
  return bannerKey !== null && sessionDismissedThreadErrorBannerKeys.has(bannerKey);
}

export const ThreadErrorBanner = memo(function ThreadErrorBanner({
  error,
  onDismiss,
  errorClass,
  errorCode,
  onRetry,
}: {
  error: string | null;
  errorClass?: OrchestrationV2ProviderFailureClass | null;
  errorCode?: string | null;
  onDismiss?: () => void;
  /** Continues the failed turn where it stopped. */
  onRetry?: (() => void) | undefined;
}) {
  if (!error) return null;
  const workspaceLimit = errorCode === CHATGPT_WORKSPACE_USAGE_LIMIT_CODE;
  const chatGptLimit = workspaceLimit || errorCode === CHATGPT_USAGE_LIMIT_CODE;
  const variant = errorClass === "usage_limit" || chatGptLimit ? "warning" : "error";
  return (
    <div className="pointer-events-auto mx-auto w-fit max-w-[min(48rem,calc(100%-2rem))] pt-3">
      <Alert variant={variant} surface="glass" controlAlignment="first-line" data-variant={variant}>
        {chatGptLimit ? (
          <OpenAI className="size-4 text-foreground!" aria-hidden="true" />
        ) : (
          <CircleAlertIcon />
        )}
        <AlertDescription>
          {chatGptLimit ? (
            <div className="space-y-1">
              <p className="font-medium">ChatGPT usage limit reached</p>
              <p>
                {workspaceLimit
                  ? "You've reached your workspace's limit for using your ChatGPT plan in other apps. Copy a request to ask your workspace admin for increased usage limits."
                  : "Review your usage settings in ChatGPT."}
              </p>
            </div>
          ) : errorClass ? (
            <div className="space-y-1">
              <p className="font-medium">{failedTurnTitle(errorClass)}</p>
              <ExpandableText text={error} collapsedText={getThreadErrorBannerMessage(error)} />
            </div>
          ) : (
            <ExpandableText text={error} collapsedText={getThreadErrorBannerMessage(error)} />
          )}
        </AlertDescription>
        {(chatGptLimit || onDismiss || onRetry) && (
          <AlertAction>
            {onRetry && !chatGptLimit ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RotateCcwIcon aria-hidden />
                Retry turn
              </Button>
            ) : null}
            {workspaceLimit ? (
              <Button variant="default" size="sm" onClick={copyAdminRequest}>
                Copy request for admin
              </Button>
            ) : chatGptLimit ? (
              <ChatGptUsageButton variant="default" size="sm" />
            ) : null}
            {onDismiss ? (
              <Button variant="ghost" size="icon-xs" aria-label="Dismiss error" onClick={onDismiss}>
                <XIcon />
              </Button>
            ) : null}
          </AlertAction>
        )}
      </Alert>
    </div>
  );
});
