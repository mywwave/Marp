import { threadChipCopyTarget } from "@marp/client-runtime/thread-reference";
import { EnvironmentId, ThreadId } from "@marp/contracts";
import {
  collectComposerContextReferences,
  threadContextRecord,
} from "@marp/shared/composerContextReferences";
import { userEvent } from "vite-plus/test/browser";
import { expect, it } from "vite-plus/test";

import { render } from "../../test/render";
import { ThreadContextChip } from "./ThreadContextChip";

it("renders a sent thread mention as a link that opens the thread", async () => {
  const ref = { environmentId: EnvironmentId.make("env"), threadId: ThreadId.make("abc-123") };
  const record = threadContextRecord(ref, "Fix login flow");
  const [occurrence] = collectComposerContextReferences(
    `Compare with ${threadChipCopyTarget(ref, "Fix login flow").value} please`,
  );
  expect(occurrence?.contextId).toBe(record.contextId);

  await using screen = await render(<ThreadContextChip record={record} />);
  const link = screen.getByRole("link", { name: "Thread, Fix login flow" });
  await expect.element(link).toHaveAttribute("href", "/env/abc-123");
  await userEvent.click(link);
  expect(screen.router?.state.location.pathname).toBe("/env/abc-123");
});
