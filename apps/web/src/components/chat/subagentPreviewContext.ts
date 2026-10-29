import type { EnvironmentId, NodeId, ThreadId } from "@marp/contracts";
import { createContext } from "react";

export interface SubagentPreviewTarget {
  readonly environmentId: EnvironmentId;
  readonly parentThreadId: ThreadId;
  readonly subagentId: NodeId;
  readonly childThreadId: ThreadId;
  readonly title: string;
}

/** Opens a subagent's preview in the chat column; null where there is none, so rows open the thread. */
export const SubagentPreviewContext = createContext<
  ((target: SubagentPreviewTarget) => void) | null
>(null);
