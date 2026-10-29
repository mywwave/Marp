import { EnvironmentId, NodeId, ThreadId } from "@marp/contracts";
import { useState } from "react";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

vi.mock(import("./MessagesTimeline"), () => ({
  MessagesTimeline: (() => <div>Child timeline</div>) as never,
}));

vi.mock(import("../../state/entities"), async (importOriginal) => ({
  ...(await importOriginal()),
  useThreadVisibleTurnItems: (() => []) as never,
}));

vi.mock(import("../../state/threads"), async (importOriginal) => {
  const { Atom } = await import("effect/reactivity");
  const empty = Atom.make(null);
  return {
    ...(await importOriginal()),
    environmentThreadDetails: {
      threadAtom: () => empty,
      quietThreadAtom: () => empty,
    } as never,
  };
});

import "~/index.css";
import { render } from "../../../test/render";
import { SubagentPreviewTray } from "./SubagentPreviewTray";
import type { SubagentPreviewTarget } from "./subagentPreviewContext";

const target: SubagentPreviewTarget = {
  environmentId: EnvironmentId.make("environment:test"),
  parentThreadId: ThreadId.make("thread:parent"),
  subagentId: NodeId.make("node:agent"),
  childThreadId: ThreadId.make("thread:child"),
  title: "Fix send bugs",
};

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ position: "relative", height: 600 }}>
      <SubagentPreviewTray
        target={open ? target : null}
        bottom={80}
        settings={{
          onImageExpand: () => {},
          markdownCwd: undefined,
          resolvedTheme: "light",
          timestampFormat: "locale",
          workspaceRoot: undefined,
        }}
        onClose={() => setOpen(false)}
        onOpenThread={() => {}}
      />
    </div>
  );
}

it("closes from the scrim", async () => {
  await using screen = await render(<Harness />);
  const dialog = page.getByRole("dialog", { name: "Subagent preview: Fix send bugs" });
  await expect.element(dialog).toBeVisible();
  await expect.element(screen.getByText("Child timeline")).toBeVisible();

  // The corner, outside the tray: the scrim under it is what closes.
  await userEvent.click(screen.getByRole("button", { name: "Close subagent preview" }), {
    position: { x: 4, y: 4 },
  });
  await expect.element(dialog).not.toBeInTheDocument();
});

it("closes on Escape", async () => {
  await using _screen = await render(<Harness />);
  const dialog = page.getByRole("dialog", { name: "Subagent preview: Fix send bugs" });
  await expect.element(dialog).toBeVisible();

  await userEvent.keyboard("{Escape}");
  await expect.element(dialog).not.toBeInTheDocument();
});
