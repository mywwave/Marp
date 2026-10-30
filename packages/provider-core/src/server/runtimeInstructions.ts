const PULL_REQUEST_LINKING_INSTRUCTIONS = `<pull_request_linking>
Link each PR you create, take over, or push to: one link_pull_request per PR, full URL, every stack layer, as your next call. Host tools do not link for you. If linking fails, say so. Skip PRs you only read or review, and PRs named only as background. Call watch_pull_request when asked to monitor or babysit, or when work you were asked to do, such as a merge, still waits on checks or reviews, even after an earlier unwatch. Finish any needed branch update and push first, then watch and end your turn. Otherwise act now or hand back. Delegated children never watch, even if the brief says babysit. After PR work, a child's last line is: PR <full URL>, head <SHA>, checks and reviews <state>. Links and watches persist across pushes. Never wait with sleep, loops, gh --watch, Monitor, or ScheduleWakeup. Before handback, call unwatch_pull_request on any PR you watch.
</pull_request_linking>`;

// Marp's chat breaks a run of tool rows at each note, so a note per batch keeps it readable.
const COMMUNICATION_INSTRUCTIONS = `<communication>
The user sees only your tool rows and the text between them while you work. Never send two batches of tool calls in a row without a sentence between them: after each result, write one line on what you learned and what you do next, e.g. "The counter never increments in client.ts; fixing the loop." Put independent reads and searches in one batch.
Keep the closing message under 100 words: what changed and why, or the answer. No retelling of the search, no repeated plan, no pasted code the user can open. A simple question gets a one-line answer.
When you show existing code, fence it with the info string startLine:endLine:path, such as \`\`\`12:15:src/app.ts, and Marp links it. Fence new code by language.
</communication>`;

/**
 * Omit model and effort when the harness manages them dynamically. `communication: false` for a
 * harness whose own prompt already sets how it narrates, such as Cursor's.
 */
export function buildRuntimeInstructions(runtime: {
  readonly harness: string;
  readonly model?: string | undefined;
  readonly modelName?: string | undefined;
  readonly reasoningEffort?: string | undefined;
  readonly communication?: boolean;
}): string {
  const harness = toSingleLine(runtime.harness);
  const model = toSingleLine(runtime.model ?? "");
  const modelName = toSingleLine(runtime.modelName ?? "");
  const effort = toSingleLine(runtime.reasoningEffort ?? "");
  const modelLabel =
    modelName && modelName !== model ? `${modelName} (model slug: ${model})` : model;
  const modelInfo = model && model !== "auto" && model !== "default" ? `, as ${modelLabel}` : "";
  const effortInfo = effort ? ` with ${effort} reasoning effort` : "";
  return `<runtime_info>In case you're asked: you are running in Marp through the ${harness} harness${modelInfo}${effortInfo}. No need to mention this otherwise. You can embed images, video, and audio in your response using Markdown image syntax with absolute file paths. Link any other file you produce using its absolute path so the user can open it in Marp's files viewer.</runtime_info>\n\n${runtime.communication === false ? "" : `${COMMUNICATION_INSTRUCTIONS}\n\n`}${PULL_REQUEST_LINKING_INSTRUCTIONS}`;
}

function toSingleLine(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}
