import { Skeleton } from "../ui/skeleton";

const DIFF_FILE_BARS = ["h-3 w-3/5", "h-3 w-2/5", "h-3 w-1/2", "h-3 w-2/3"];
const DIFF_LINE_BARS = [
  "h-3 w-4/5",
  "h-3 w-3/5",
  "h-3 w-11/12",
  "h-3 w-2/3",
  "h-3 w-1/2",
  "h-3 w-5/6",
  "h-3 w-3/4",
];
const FILE_ROW_BARS = [
  "h-3 w-1/3",
  "h-3 w-1/2",
  "h-3 w-2/5",
  "h-3 w-3/5",
  "h-3 w-1/4",
  "h-3 w-1/5",
];

// Bar sizes sit on a wrapper: the Skeleton primitive takes only static classes.
/** First-load placeholder for a lazy right panel surface, shaped like the surface it becomes. */
export function RightPanelSkeleton(props: { kind: "diff" | "preview" | "files" | "device" }) {
  return (
    <div
      role="status"
      aria-label="Loading panel"
      className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4"
    >
      {props.kind === "diff" ? (
        <>
          <div className="flex flex-col gap-2">
            {DIFF_FILE_BARS.map((bar) => (
              <div key={bar} className="flex items-center gap-2">
                <Skeleton className="size-4 shrink-0" />
                <div className={bar}>
                  <Skeleton className="size-full" />
                </div>
                <Skeleton className="ms-auto h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
          <Skeleton shape="card" className="h-8 w-full" />
          <div className="flex flex-col gap-2">
            {DIFF_LINE_BARS.map((bar) => (
              <div key={bar} className={bar}>
                <Skeleton className="size-full" />
              </div>
            ))}
          </div>
        </>
      ) : null}
      {props.kind === "preview" ? (
        <>
          <Skeleton shape="pill" className="h-8 w-full shrink-0" />
          <Skeleton shape="card" className="min-h-0 w-full flex-1" />
        </>
      ) : null}
      {props.kind === "files" ? (
        <div className="flex flex-col gap-2.5">
          {FILE_ROW_BARS.map((bar) => (
            <div key={bar} className="flex items-center gap-2">
              <Skeleton className="size-4 shrink-0" />
              <div className={bar}>
                <Skeleton className="size-full" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {props.kind === "device" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Skeleton shape="card" className="aspect-[9/19] h-4/5 max-h-full" />
        </div>
      ) : null}
    </div>
  );
}
