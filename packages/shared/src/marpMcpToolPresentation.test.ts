import { describe, expect, it } from "vite-plus/test";

import {
  MARP_MCP_TOOL_NAMES,
  resolveMarpMcpSummaryAction,
  resolveMarpMcpToolDefinition,
  resolveMarpMcpToolPresentation,
} from "./marpMcpToolPresentation.ts";

describe("resolveMarpMcpToolPresentation", () => {
  it("recognizes every Marp tool across provider prefixes and completion suffixes", () => {
    for (const tool of MARP_MCP_TOOL_NAMES) {
      const presentation = resolveMarpMcpToolPresentation(tool);
      for (const prefix of [
        "mcp__marp__",
        "mcp__marp__",
        "mcp__marp__",
        "Marp.",
        "marp/",
        "marp:",
        "mcp_marp_",
        "Marp ",
        "marp · ",
      ]) {
        expect(resolveMarpMcpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolveMarpMcpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolveMarpMcpToolPresentation("marp-thread_opencode2-adapter_delegate_task")?.displayName,
    ).toBe("Delegate a child task");
    expect(resolveMarpMcpToolPresentation("marp-thread_opencode2-adapter_not_a_tool")).toBeNull();
  });
});

describe("resolveMarpMcpToolDefinition", () => {
  it("labels an action tool call as the action it ran", () => {
    expect(
      resolveMarpMcpToolDefinition("mcp__marp__preview_act", { action: "type" })?.labels,
    ).toEqual(resolveMarpMcpToolDefinition("preview_type")?.labels);
    expect(
      resolveMarpMcpToolDefinition("marp_thread_transfer", { action: "fork" })?.displayName,
    ).toBe(resolveMarpMcpToolDefinition("marp_thread_fork")?.displayName);
    expect(resolveMarpMcpToolDefinition("preview_act", { action: "unknown" })?.labels[2]).toBe(
      "Used",
    );
  });
});

describe("resolveMarpMcpSummaryAction", () => {
  it("summarizes an action tool by the action each call ran", () => {
    expect(resolveMarpMcpSummaryAction("mcp__marp__marp_queue", { action: "list" })).toBe(
      "queue-list",
    );
    expect(resolveMarpMcpSummaryAction("marp_queue", { action: "edit" })).toBe("queue-edit");
    expect(resolveMarpMcpSummaryAction("marp_thread_transfer", { action: "status" })).toBe(
      "thread-transfers",
    );
    expect(resolveMarpMcpSummaryAction("marp_thread_configure", {})).toBe("thread-configuration");
    expect(resolveMarpMcpSummaryAction("schedule_task", { scheduledTaskId: "task-1" })).toBe(
      "schedule-update",
    );
    expect(resolveMarpMcpSummaryAction("delegate_task", { task: "x" })).toBe("delegate");
  });
});
