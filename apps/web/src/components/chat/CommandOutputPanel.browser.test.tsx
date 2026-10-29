import { EnvironmentId, ThreadId, TurnItemId } from "@marp/contracts";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

vi.mock(import("../../state/query"), async (original) => ({
  ...(await original()),
  useEnvironmentQuery: (() => ({
    data: {
      output: { text: "355:  --radius-2xl: 1rem;\n236-  }\n", truncated: false },
      running: true,
    },
    dataUpdatedAt: 0,
    error: null,
    failure: null,
    isPending: false,
    isSuccess: true,
    refresh: () => {},
  })) as never,
}));

import "~/index.css";
import { render } from "../../../test/render";
import { CommandOutputTail } from "./CommandOutputPanel";

it("shows a running command's tail inside its box, which opens the full output", async () => {
  const onOpen = vi.fn();
  await using screen = await render(
    <CommandOutputTail
      environmentId={EnvironmentId.make("environment:test")}
      threadId={ThreadId.make("thread:test")}
      itemId={TurnItemId.make("item:test")}
      className="ms-6"
      onOpen={onOpen}
    />,
  );
  const box = screen.container.querySelector<HTMLElement>("[data-command-output-tail]")!;
  expect(box.textContent).toContain("355:  --radius-2xl: 1rem;");
  expect([box.tagName, box.getAttribute("aria-label")]).toEqual([
    "BUTTON",
    "Show full command output",
  ]);
  expect(box.classList).toContain("bg-muted");
  await userEvent.click(box);
  expect(onOpen).toHaveBeenCalledOnce();
});
