const CODE_CITATION = /^(\d+):(\d+):(.+)$/;

export interface CodeCitation {
  readonly startLine: number;
  readonly endLine: number;
  readonly path: string;
}

/** A code fence whose info string is `startLine:endLine:path`, as Cursor's agent cites code. */
export function parseCodeCitation(info: string | null | undefined): CodeCitation | null {
  const match = info ? CODE_CITATION.exec(info) : null;
  if (!match) return null;
  const startLine = Number(match[1]);
  const endLine = Number(match[2]);
  return startLine > 0 && endLine >= startLine ? { startLine, endLine, path: match[3]! } : null;
}

export function codeCitationRange({ startLine, endLine }: CodeCitation): string {
  return startLine === endLine ? `line ${startLine}` : `lines ${startLine}–${endLine}`;
}
