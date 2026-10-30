import { expect, it, vi } from "vite-plus/test";

import "~/index.css";
import { act, fakeTimers, render } from "../../../test/render";
import { SubagentStatusText } from "./SubagentTaskCard";

it("holds each status label before the next replaces it, on one line", async () => {
  // The first render starts the hold, so its timer must already be fake.
  using _clock = fakeTimers();
  await using screen = await render(
    <SubagentStatusText label="Reading main.tsx" shimmer={false} />,
  );
  await screen.rerender(<SubagentStatusText label="Grepping orphan in backend" shimmer={false} />);
  await screen.rerender(<SubagentStatusText label="Running tests" shimmer={false} />);
  const status = () => screen.container.querySelectorAll("[data-subagent-status-text]");
  expect(status()[0]?.textContent).toBe("Reading main.tsx");

  // Fast steps in between are skipped; the newest shows once the hold ends.
  await act(() => vi.advanceTimersByTime(700));
  // The old label rolls out above the new one, then leaves.
  expect(status()[0]?.textContent).toBe("Reading main.tsxRunning tests");
  await act(() => vi.advanceTimersByTime(300));
  expect(status()[0]?.textContent).toBe("Running tests");
  expect(status()).toHaveLength(1);
});
