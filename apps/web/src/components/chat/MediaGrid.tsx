import { createContext, type CSSProperties, type ReactNode } from "react";

import { cn } from "~/lib/utils";

const MEDIA_GRID_VISIBLE_COUNT = 4;

/** Images in a grid cell fill it; the cell owns the frame and the loading surface. Not for one image. */
export const MEDIA_GRID_IMAGE_CLASS_NAME =
  "block size-full max-h-none max-w-none rounded-none border-0 object-cover";
export const MEDIA_GRID_IMAGE_STYLE: CSSProperties = {};
/** Markdown images inside a grid cell take the cell's look instead of their own size. */
export const MediaGridCellContext = createContext(false);

/**
 * One image as it is, or up to four side by side, the fourth showing how many more there are.
 * The rest stay mounted but hidden, so the viewer can page through all of them
 * while lazy images that never display never load.
 */
export function MediaGrid(props: {
  readonly items: ReadonlyArray<ReactNode>;
  readonly caption?: string | undefined;
}) {
  const visible = props.items.slice(0, MEDIA_GRID_VISIBLE_COUNT);
  const hidden = props.items.slice(MEDIA_GRID_VISIBLE_COUNT);
  return (
    <figure data-image-gallery className="my-2 w-full max-w-[min(100%,30rem)]">
      {visible.length === 1 ? (
        visible[0]
      ) : (
        <div className={cn("grid gap-1.5", visible.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {visible.map((item, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- cells are positional; the items carry their own keys
            <div key={index} className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              {item}
              {index === MEDIA_GRID_VISIBLE_COUNT - 1 && hidden.length > 0 ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 font-medium text-sm text-white"
                >
                  +{hidden.length}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {hidden.length > 0 ? <div hidden>{hidden}</div> : null}
      {props.caption ? (
        <figcaption className="mt-1 truncate text-muted-foreground text-xs">
          {props.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
