type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  position?: { start?: { offset?: number }; end?: { offset?: number } };
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/** Cursor fades the last few arrivals; older text is plain again. */
const STREAM_CHUNK_WINDOW = 10;

const OPAQUE_TAGS = new Set(["pre", "code", "math", "svg"]);

/** The source lengths each earlier render ended at, newest last. */
export function nextStreamBoundaries(
  boundaries: ReadonlyArray<number>,
  previousLength: number,
  length: number,
): ReadonlyArray<number> {
  if (length < previousLength) return [];
  if (length === previousLength) return boundaries;
  return [...boundaries, previousLength].slice(-STREAM_CHUNK_WINDOW);
}

function chunkStart(boundaries: ReadonlyArray<number>, offset: number): number | undefined {
  let start: number | undefined;
  for (const boundary of boundaries) if (boundary <= offset) start = boundary;
  return start;
}

function splitText(node: HastNode, boundaries: ReadonlyArray<number>): HastNode[] {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  const value = node.value ?? "";
  // Escapes and entities break the offset-to-character mapping, so such text stays whole.
  if (start === undefined || end === undefined || end - start !== value.length) return [node];
  const cuts = [start, ...boundaries.filter((boundary) => boundary > start && boundary < end), end];
  const pieces: HastNode[] = [];
  for (let index = 0; index < cuts.length - 1; index += 1) {
    const from = cuts[index]!;
    const text: HastNode = {
      type: "text",
      value: value.slice(from - start, cuts[index + 1]! - start),
    };
    pieces.push(
      chunkStart(boundaries, from) === undefined
        ? text
        : {
            type: "element",
            tagName: "span",
            properties: { className: ["stream-chunk"] },
            children: [text],
          },
    );
  }
  return pieces;
}

function wrapChunks(node: HastNode, boundaries: ReadonlyArray<number>): void {
  if (!node.children || (node.tagName !== undefined && OPAQUE_TAGS.has(node.tagName))) return;
  node.children = node.children.flatMap((child) => {
    if (child.type === "text") return splitText(child, boundaries);
    wrapChunks(child, boundaries);
    return [child];
  });
}

/**
 * Wraps the text each recent render added in a span that fades in, as Cursor's stream does, so
 * words arriving inside a paragraph do not pop. Runs only while the reply streams.
 */
export function rehypeStreamChunks(boundaries: ReadonlyArray<number>) {
  return () => (tree: HastNode) => {
    if (boundaries.length > 0) wrapChunks(tree, boundaries);
  };
}
