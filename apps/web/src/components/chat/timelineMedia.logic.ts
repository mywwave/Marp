import type { AssetResource } from "@marp/contracts";
import { resolveMarpMcpToolId } from "@marp/shared/marpMcpToolPresentation";
import { compactDynamicToolOutput } from "@marp/shared/toolOutput";

import type { WorkLogEntry } from "../../session-logic";

export interface TimelineMediaImage {
  readonly resource: Extract<AssetResource, { readonly _tag: "tool-output-image" }>;
  readonly name: string;
}

// html_render shows the page html_preview checked, so its screenshot would repeat it.
const TOOLS_WITHOUT_INLINE_MEDIA = new Set(["html_preview"]);

/** Images that completed tools returned, in order, as asset references loaded on demand. */
export function toolOutputMediaImages(
  entries: ReadonlyArray<WorkLogEntry>,
): ReadonlyArray<TimelineMediaImage> {
  return entries.flatMap((entry) => {
    const item = entry.projectedItem?.item ?? entry.structuredPayload;
    if (
      item?.type !== "dynamic_tool" ||
      item.status !== "completed" ||
      TOOLS_WITHOUT_INLINE_MEDIA.has(resolveMarpMcpToolId(item.toolName) ?? "")
    ) {
      return [];
    }
    const count = compactDynamicToolOutput(item.output)?.outputImages ?? 0;
    const name = entry.toolTitle ?? entry.label;
    return Array.from({ length: count }, (_, index) => ({
      resource: {
        _tag: "tool-output-image" as const,
        threadId: item.threadId,
        itemId: item.id,
        index,
      },
      name,
    }));
  });
}

export function timelineMediaImagesEqual(
  left: ReadonlyArray<TimelineMediaImage>,
  right: ReadonlyArray<TimelineMediaImage>,
) {
  return (
    left.length === right.length &&
    left.every(
      (image, index) =>
        image.name === right[index]?.name &&
        image.resource.itemId === right[index].resource.itemId &&
        image.resource.index === right[index].resource.index,
    )
  );
}

/** One caption for the grid: what it holds, and the tool when every image came from it. */
export function timelineMediaCaption(images: ReadonlyArray<TimelineMediaImage>) {
  const count = images.length === 1 ? "Image" : `${images.length} images`;
  const source = images[0]?.name;
  return source !== undefined && images.every((image) => image.name === source)
    ? `${count} · ${source}`
    : count;
}
