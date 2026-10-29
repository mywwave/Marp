import { type ChatImageAttachment } from "../../types";
import type { ComposerContextRecord, KnownComposerContextRecord } from "@marp/contracts";
import { asKnownContextRecord } from "~/lib/composerContextRecords";

export function resolvePreviewAnnotationImage(input: {
  record: Extract<KnownComposerContextRecord, { kind: "preview-annotation" }>;
  recordsById: ReadonlyMap<string, ComposerContextRecord>;
  userImages: ReadonlyArray<ChatImageAttachment>;
  previewImages: ReadonlyArray<ChatImageAttachment>;
  annotationRecordIds: ReadonlyArray<string>;
}): ChatImageAttachment | null {
  const screenshotRecord = input.record.screenshotContextId
    ? asKnownContextRecord(input.recordsById.get(input.record.screenshotContextId))
    : undefined;
  return (
    (screenshotRecord?.kind === "image"
      ? input.userImages.find((image) => image.id === screenshotRecord.attachmentId)
      : undefined) ??
    input.previewImages.find(
      (image) => image.name === `preview-annotation-${input.record.annotationId}.png`,
    ) ??
    input.previewImages[input.annotationRecordIds.indexOf(input.record.contextId)] ??
    null
  );
}

/** Why a past message cannot be edited right now, or null when it can. */
export function editUserMessageBlockedReason(
  activity: { readonly isWorking: boolean; readonly isRevertingCheckpoint: boolean },
  canOperateThread: boolean,
): string | null {
  if (!canOperateThread) return "You have view-only access to this thread";
  if (activity.isRevertingCheckpoint) return "Rewinding the thread…";
  if (activity.isWorking) return "Stop the agent to edit this message";
  return null;
}
