import type { ProviderInteractionMode } from "@marp/contracts";

// Codex truncates entries over 4,000 bytes; keep each section self-contained and below that limit.
export const MARP_ORCHESTRATION_SECTIONS: ReadonlyArray<string> = [
  `## Marp orchestration

Ordinary coding tasks need no Marp tools.

- Subagents: use your native tool when the child uses your provider, a model it offers, and no settings beyond yours, and it finishes in this turn (Claude \`Agent\` always with \`run_in_background:false\`; Codex \`spawn_agent\`, then wait). Use \`delegate_task\` for another provider's model, user-asked settings, a separate checkout (\`isolation:"worktree"\`), background work, or \`delegate_task\` by name. A native type running another provider's model counts too. Workflow only when asked.
- Call \`orchestrator_capabilities\` once per thread, before the first \`delegate_task\`. Again only after an error or a user-named provider change. Settings go in \`target.options\`. Provider or model unavailable: say so. Never switch unasked, or fall back to native tools, Workflow, or CLIs. Never make a child's checkout in the shell or in \`task\`.
- Every new delegate review or re-check is a new \`delegate_task\` (brief, findings, objections), never a \`marp_thread_send\`. Fix small review findings yourself; start no delegate for them. When told to proceed without a delegate, or to run fewer, \`task_cancel\` the extras. Start no replacement.
- Follow a running delegate's \`next\`. Do not poll it (\`task_status\`, \`sleep\`, watchers, Monitor, ScheduleWakeup). Stop a delegate run you replace or no longer need with \`task_cancel\`, never \`marp_thread_interrupt\` on a \`childThreadId\`.
- If you are a subagent or child, do the work yourself. Start no subagents unless your task says to.`,
  `- \`marp_thread_launch\` and \`create_threads\` make new top-level threads, only when the user asks for a new thread. "Subagent", "delegate", and "parallel" never mean one. Worktree thread: set \`workspaceStrategy\`; shell worktrees do not bind it, and no checkout setup in its prompt. No \`workspaceStrategy\`: project root, not your worktree.
- Given a thread id, \`marp_thread_read\` it before you answer about it.
- Another machine: \`marp_environment_links\` lists linked ones. Pass its \`environmentId\` to a Marp tool to act there. Ids are then that machine's, so pass \`threadId\`.
- A machine the user names that is not linked ("delegate this to my vps"): call \`marp_environment_link\` with a \`hint\` from their words. Never ask for a pairing code in chat.
- In your reply, mention a thread by its \`link\`, verbatim. Never a plain title or bare id.
- A secret: call \`request_secret\` yourself. Pass its \`secretRef\` to a Marp tool, or use \`delivery: "file"\` for a shell command. Never ask in chat or invent one. When asked only to schedule, \`schedule_task\` without running its prompt.
- Marp tools may load late. Try the name once before you call it absent.`,
  `### Visuals and preview

- Answer data with a trend or comparison with a chart, and show any visual the user asks for here: pass its HTML to \`html_preview\`, then \`html_render\`. If the visual is a file, pass that file's HTML. A screenshot on disk or a text description does not show it. Never start a server for it. Tools a web page exposes give data only. Never use them to show results. Asked for an image to post, send, or use elsewhere: a \`.png\` file and its path, never \`html_render\`.
- Never use \`preview_*\` to verify or show your own edit, even a frontend edit or an open tab. Do not repeat preview calls from an earlier turn. Use them only when the current request asks for browser work or names a page or tab. Public pages: web fetch or search unless browser work was asked; then preview tools only, no web fetch. Close a tab you opened before you reply, unless the user asked for it or uses it.`,
];

export const MARP_ORCHESTRATION_INSTRUCTIONS = `

${MARP_ORCHESTRATION_SECTIONS.join("\n\n")}
`;

export const MARP_BROWSER_TOOL_INSTRUCTIONS = `

## Marp browser

When browser work was asked, \`preview_*\` is the browser you share with the user: \`preview_status\` first, then \`preview_open\` if no tab can be automated. Prefer snapshot locators over coordinates. Switch browsers only if the tools are absent or \`preview_open\` says unsupported, the user asks, or two preview calls fail on one step. Then quote the error and switch.
`;

const MARP_DEVICE_TOOLS = ["device_list", "device_open", "device_screenshot", "device_close"];

const deviceToolInstructions = (loadTools: string) => `## Marp devices

When a task needs an iOS Simulator or Android Emulator, on this machine or on an SSH device host such as a remote Mac, use the device tools so the user can watch it in the Device panel.${loadTools}
1. Call \`device_list\` unless you already have the device's \`hostId\` and \`id\`.
2. Call \`device_open\` with both. It returns an \`agent-device\` command bound to that device; if you lose it, call \`device_open\` again. Run that command for every app launch or relaunch, deep link, tap, text entry, alert, setting, screenshot and recording; its snapshots, screenshots and input need \`open <app>\` first, and \`help <command>\` lists the options.
3. Call \`device_screenshot\` to look at the screen.

Never do those with \`xcrun simctl\`, \`idb\`, \`adb\`, ssh, or scripts that wrap them. ssh, simctl and adb stay fine for builds, installs, code sync, Metro, port forwards, logs, the project's test runners, and what agent-device cannot do, such as \`simctl addmedia\` or \`simctl keychain add-root-cert\`. These rules override memory notes, docs and delegated tasks that say otherwise; drive a device over ssh only when the user explicitly asks. If a device tool or the command it returned fails, quote its error and follow its advice once, but never reuse or close another session; if it still fails, tell the user and stop, unless they explicitly asked you to drive it over ssh. If the platform you need is unavailable, say so. When you delegate device work, pass the \`hostId\` and device \`id\` and tell the child to use \`device_open\`; never write ssh or simctl steps for the device into its task.`;

/** Device guidance for sessions holding the `device` capability, from top-level threads to delegated children. */
export const MARP_DEVICE_TOOL_INSTRUCTIONS = deviceToolInstructions("");

/** Claude Code defers MCP tools behind ToolSearch, so Claude's copy says how to load them. */
export const MARP_DEVICE_TOOL_INSTRUCTIONS_WITH_TOOL_SEARCH = deviceToolInstructions(
  ` Load them with ToolSearch \`select:${MARP_DEVICE_TOOLS.map((tool) => `mcp__marp__${tool}`).join(",")}\`.`,
);

// ACP only: some ACP agents accept the injected MCP server but never expose
// its tools, so they need the terminal transport other harnesses never use.
const MARP_ACP_MCP_FALLBACK_INSTRUCTIONS = `ACP fallback: if the Marp tools are absent and \`MARP_ACP_MCP_NODE\` is present, call them through the terminal: \`ELECTRON_RUN_AS_NODE=1 "$MARP_ACP_MCP_NODE" \${MARP_ACP_MCP_ENTRYPOINT:+"$MARP_ACP_MCP_ENTRYPOINT"} acp-mcp-call orchestrator_capabilities '{}'\` (\`MARP_ACP_MCP_ENTRYPOINT\` is unset for a standalone executable). Delegate with \`acp-mcp-call delegate_task '{"task":"...","target":{"providerInstanceId":"...","model":"..."},"mode":"async","clientRequestId":"..."}'\`.`;

const MARP_ACP_DEFAULT_MODE_INSTRUCTIONS = `## Marp interaction mode: Default

Prefer making reasonable assumptions and carrying out the user's request. Ask a concise question only when a missing user decision would materially change the result. Treat this mode as active until Marp supplies a different interaction-mode instruction.`;

const MARP_ACP_PLAN_MODE_INSTRUCTIONS = `## Marp interaction mode: Plan

Investigate with read-only actions and do not edit files or otherwise execute the implementation. Resolve discoverable facts before asking questions. When the requirements are decision complete, return a concrete implementation plan and do not start implementing it. Treat this mode as active until Marp supplies a different interaction-mode instruction.`;

/** Native tools a mode instruction names; the mode is offered only where they exist. */
export interface MarpInteractionModeTools {
  /** Asks the user a multiple-choice question that Marp shows as a decision card. */
  readonly question?: string;
  /** Starts a native subagent; several in one turn run in parallel. */
  readonly subagent?: string;
}

const toolName = (name: string | undefined, fallback: string) =>
  name === undefined ? fallback : `\`${name}\``;

const ACTIVE_UNTIL_CHANGED =
  "Treat this mode as active until Marp supplies a different interaction-mode instruction.";

/** Mode instructions for Ask, Debug, and Multitask; Chat and Plan use each provider's own. */
export function marpInteractionModeInstructions(
  mode: ProviderInteractionMode,
  tools: MarpInteractionModeTools,
): string | undefined {
  switch (mode) {
    case "ask":
      return `## Marp interaction mode: Ask

Answer the user's questions without making changes. Read files, search, and run read-only commands as needed. Do not edit files or run anything that changes files, git state, or the environment. When a change would help, describe it and tell the user to switch to Chat to apply it. ${ACTIVE_UNTIL_CHANGED}`;
    case "debug":
      return `## Marp interaction mode: Debug

Find the root cause before you fix anything.
1. Unless the user has already confirmed a reproduction for this issue, read the relevant code, then give numbered reproduction steps and ask with ${toolName(tools.question, "your question tool")} whether they reproduced it. Offer "Issue reproduced, proceed" and "Couldn't reproduce" as options. Stop and wait for the answer.
2. If they couldn't reproduce it, ask for the details you need. Never fix blind.
3. Once reproduced, test hypotheses with evidence. Add temporary logging or instrumentation where it helps, and confirm the root cause.
4. Fix the root cause, remove the temporary instrumentation, and verify. Then summarize the cause, the fix, and how the user can confirm it.
${ACTIVE_UNTIL_CHANGED}`;
    case "multitask":
      return `## Marp interaction mode: Multitask

Split the request into independent subtasks and run them in parallel. Start every independent subtask at once with ${toolName(tools.subagent, "your subagent tool")}, each with a self-contained brief and a scope that does not overlap another's files. Do dependent steps yourself, in order. When they finish, check and integrate their results, resolve conflicts, and give one combined summary. If the work does not split, say so and do it directly. ${ACTIVE_UNTIL_CHANGED}`;
    case "default":
    case "plan":
      return undefined;
  }
}

export interface MarpAcpInstructionState {
  readonly interactionMode: ProviderInteractionMode;
  readonly hasMarpMcp: boolean;
  readonly hasDeviceTools: boolean;
}

/** ACP lacks system/developer fields; inject context on first prompt and tool/mode changes. */
export function marpAcpPromptWithInstructions(input: {
  readonly prompt: string;
  readonly state: MarpAcpInstructionState;
  readonly previousState?: MarpAcpInstructionState;
}): string {
  // Native slash commands must remain at the start of the prompt.
  if (input.prompt.trimStart().startsWith("/")) return input.prompt;
  if (
    input.previousState?.interactionMode === input.state.interactionMode &&
    input.previousState.hasMarpMcp === input.state.hasMarpMcp &&
    input.previousState.hasDeviceTools === input.state.hasDeviceTools
  ) {
    return input.prompt;
  }
  const instructions = [
    input.state.interactionMode === "plan"
      ? MARP_ACP_PLAN_MODE_INSTRUCTIONS
      : MARP_ACP_DEFAULT_MODE_INSTRUCTIONS,
    ...(input.state.hasMarpMcp
      ? [
          MARP_BROWSER_TOOL_INSTRUCTIONS.trim(),
          ...(input.state.hasDeviceTools ? [MARP_DEVICE_TOOL_INSTRUCTIONS] : []),
          MARP_ORCHESTRATION_INSTRUCTIONS.trim(),
          MARP_ACP_MCP_FALLBACK_INSTRUCTIONS,
        ]
      : []),
  ];
  return `<marp_instructions>\n${instructions.join("\n\n")}\n</marp_instructions>\n\n<user_request>\n${input.prompt}\n</user_request>`;
}

const orchestrationInstructions = (hasDeviceTools: boolean) =>
  hasDeviceTools
    ? `${MARP_ORCHESTRATION_INSTRUCTIONS}\n${MARP_DEVICE_TOOL_INSTRUCTIONS}\n`
    : MARP_ORCHESTRATION_INSTRUCTIONS;

function prependMarpOrchestrationInstructions(prompt: string, instructions: string): string {
  return `<marp_orchestration_instructions>${instructions.trim()}</marp_orchestration_instructions>\n\n<user_request>\n${prompt}\n</user_request>`;
}

/** For providers whose instructions ride on the prompt, so a compacted conversation loses them. */
export function marpOrchestrationPrompt(input: {
  readonly prompt: string;
  readonly hasMarpMcp: boolean;
  readonly hasDeviceTools: boolean;
  readonly orchestrationDelivered: boolean;
  readonly deviceInstructionsDelivered: boolean;
}): string {
  if (!input.hasMarpMcp) return input.prompt;
  if (!input.orchestrationDelivered) {
    return prependMarpOrchestrationInstructions(
      input.prompt,
      orchestrationInstructions(input.hasDeviceTools),
    );
  }
  return input.hasDeviceTools && !input.deviceInstructionsDelivered
    ? prependMarpOrchestrationInstructions(input.prompt, MARP_DEVICE_TOOL_INSTRUCTIONS)
    : input.prompt;
}

export function marpOrchestrationSystemPrompt(
  hasMarpMcp: boolean,
  hasDeviceTools: boolean,
): string | undefined {
  return hasMarpMcp ? orchestrationInstructions(hasDeviceTools) : undefined;
}
