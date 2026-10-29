import { EnvironmentId } from "@marp/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import "~/index.css";
import { render } from "../../../test/render";

vi.mock(import("~/assets/longLivedAssetUrls"), () => ({
  useLongLivedAssetUrl: () => ({
    _tag: "Success",
    url: "about:blank",
    expiresAt: Date.now() + 60 * 60_000,
  }),
}));
vi.mock(import("~/assets/assetUrls"), async (importOriginal) => ({
  ...(await importOriginal()),
  useAssetUrlRefresh: () => async () => "about:blank",
}));

import { HtmlRenderFrame } from "./HtmlRenderFrame";

const htmlRender = { attachmentId: "attachment", title: "Report", height: 200 };

describe("HtmlRenderFrame", () => {
  it("mounts the sandboxed page only once the card nears the viewport", async () => {
    await using screen = await render(
      <div style={{ paddingTop: "400vh" }}>
        <HtmlRenderFrame
          environmentId={EnvironmentId.make("environment")}
          htmlRender={htmlRender}
          threadRef={undefined}
        />
      </div>,
    );
    const card = screen.getByRole("region", { name: "Report" });
    await expect.element(card).toBeInTheDocument();
    expect(card.element().querySelector("iframe")).toBeNull();

    card.element().scrollIntoView();
    await expect.element(screen.getByTitle("Report")).toBeInTheDocument();
    const frame = screen.getByTitle("Report").element();
    // The inline card must keep the opaque-origin sandbox of every html_render frame.
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts allow-forms");
    await expect.element(screen.getByRole("button", { name: "Copy HTML" })).toBeEnabled();
  });

  it("reports leaving full screen when it unmounts while expanded", async () => {
    const onFullscreenChange = vi.fn();
    await using screen = await render(
      <HtmlRenderFrame
        environmentId={EnvironmentId.make("environment")}
        htmlRender={htmlRender}
        threadRef={undefined}
        onFullscreenChange={onFullscreenChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open full screen" }));
    await expect.element(screen.getByRole("dialog")).toBeVisible();
    expect(onFullscreenChange).toHaveBeenLastCalledWith(true);

    await screen.unmount();
    expect(onFullscreenChange).toHaveBeenLastCalledWith(false);
  });
});
