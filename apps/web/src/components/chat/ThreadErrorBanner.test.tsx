import { describe, expect, it } from "vite-plus/test";

import {
  dismissThreadErrorBannerForSession,
  failedTurnTitle,
  getThreadErrorBannerKey,
  getThreadErrorBannerMessage,
  isThreadErrorBannerDismissedForSession,
  shouldShowThreadErrorBanner,
} from "./ThreadErrorBanner";

describe("getThreadErrorBannerMessage", () => {
  it("extracts a readable nested message without trimming its whitespace", () => {
    const message =
      "  This model is not supported with a ChatGPT account.\nChoose another model.  ";
    const error = ` \n${JSON.stringify({ error: { message, code: "unsupported_model" } })}\t `;

    expect(getThreadErrorBannerMessage(error)).toBe(message);
  });

  it("keeps the diagnostics when the nested message is blank", () => {
    const error = JSON.stringify({ error: { message: " \n\t ", code: "unsupported_model" } });

    expect(getThreadErrorBannerMessage(error)).toBe(error);
  });
});

describe("failedTurnTitle", () => {
  it.each([
    ["transport_error", "Lost the connection to the agent"],
    ["usage_limit", "Usage limit reached"],
    ["unknown", "This turn failed"],
  ] as const)("names %s as %s", (errorClass, title) => {
    expect(failedTurnTitle(errorClass)).toBe(title);
  });
});

describe("ThreadErrorBanner", () => {
  it("reappears for different diagnostics with the same headline on the same thread", () => {
    const firstError = JSON.stringify({ error: { message: "Turn failed", code: "first" } });
    const secondError = JSON.stringify({ error: { message: "Turn failed", code: "second" } });
    const dismissedKey = getThreadErrorBannerKey("env:thread-b", firstError);
    dismissThreadErrorBannerForSession(dismissedKey);
    const newErrorKey = getThreadErrorBannerKey("env:thread-b", secondError);

    expect(isThreadErrorBannerDismissedForSession(dismissedKey)).toBe(true);
    expect(isThreadErrorBannerDismissedForSession(newErrorKey)).toBe(false);
    expect(
      shouldShowThreadErrorBanner(
        "env:thread-b",
        secondError,
        isThreadErrorBannerDismissedForSession(newErrorKey),
      ),
    ).toBe(true);
  });
});
