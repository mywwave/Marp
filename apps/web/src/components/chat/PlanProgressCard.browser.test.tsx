import { presentPlanProgress } from "@marp/client-runtime/work-log/live-cards";
import { userEvent } from "vite-plus/test/browser";
import { expect, it } from "vite-plus/test";

import "~/index.css";

import { render } from "../../../test/render";
import { PlanProgressCard } from "./PlanProgressCard";

const progress = presentPlanProgress(
  [
    { id: "1", text: "Read the timeline", status: "completed" },
    { id: "2", text: "Write the card", status: "running" },
    { id: "3", text: "Add tests", status: "pending" },
  ],
  null,
);

it("opens the docked plan upward by a known height without moving its header", async () => {
  await using screen = await render(
    <div style={{ position: "absolute", bottom: 0, width: 600 }}>
      <PlanProgressCard docked progress={progress} onStop={() => {}} />
    </div>,
  );
  const header = screen.container.querySelector<HTMLElement>("[data-plan-card-header]")!;
  const card = screen.container.querySelector<HTMLElement>("[data-plan-card]")!;
  const collapsedHeader = header.getBoundingClientRect();
  const collapsedHeight = card.getBoundingClientRect().height;
  await expect.element(screen.getByText("· 1 of 3")).toBeVisible();

  await userEvent.click(header);
  await expect.element(screen.getByRole("list", { name: "Plan steps" })).toBeVisible();
  const expandedHeader = header.getBoundingClientRect();
  expect([expandedHeader.top, expandedHeader.height]).toEqual([
    collapsedHeader.top,
    collapsedHeader.height,
  ]);
  // Three fixed 24px step rows; nothing else changes height.
  expect(card.getBoundingClientRect().height - collapsedHeight).toBe(3 * 24);

  await userEvent.click(header);
  await expect.element(screen.getByRole("list", { name: "Plan steps" })).not.toBeInTheDocument();
  expect(card.getBoundingClientRect().height).toBe(collapsedHeight);
  expect(header.getBoundingClientRect().top).toBe(collapsedHeader.top);
});
