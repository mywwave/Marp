import { describe, expect, it } from "vite-plus/test";

import { approvalShortcutDecision, questionShortcutOptionIndex } from "./decisionCardKeys";

function keyEvent(key: string, target: EventTarget | null, init: Partial<KeyboardEventInit> = {}) {
  return {
    key,
    metaKey: init.metaKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    altKey: init.altKey ?? false,
    shiftKey: init.shiftKey ?? false,
    repeat: init.repeat ?? false,
    isComposing: init.isComposing ?? false,
    defaultPrevented: false,
    target,
  };
}

function element(html: string): Element {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.querySelector("[data-target]") ?? host;
}

describe("approvalShortcutDecision", () => {
  it("approves on Enter and declines on Esc from the page", () => {
    expect(approvalShortcutDecision(keyEvent("Enter", document.body), undefined)).toBe("accept");
    expect(approvalShortcutDecision(keyEvent("Escape", document.body), undefined)).toBe("decline");
    expect(approvalShortcutDecision(keyEvent("a", document.body), undefined)).toBeNull();
  });

  it.each([
    ["the composer", `<div contenteditable="true"><p data-target>draft</p></div>`],
    ["a text field", `<input data-target />`],
    ["a focused button", `<button data-target>Decline</button>`],
    ["an open menu", `<div role="menu"><div data-target>Item</div></div>`],
    ["a dialog", `<div role="dialog"><p data-target>Body</p></div>`],
  ])("leaves the keys to %s", (_name, html) => {
    const target = element(html);
    expect(approvalShortcutDecision(keyEvent("Enter", target), undefined)).toBeNull();
    expect(approvalShortcutDecision(keyEvent("Escape", target), undefined)).toBeNull();
  });

  it("ignores modified, repeated and composing keys", () => {
    for (const init of [
      { ctrlKey: true },
      { shiftKey: true },
      { repeat: true },
      { isComposing: true },
    ]) {
      expect(
        approvalShortcutDecision(keyEvent("Enter", document.body, init), undefined),
      ).toBeNull();
    }
  });

  it("gives no key to a missing answer or an approval with a warning", () => {
    const options = [
      { decision: "accept", label: "Approve", warning: "Runs with full access" },
      { decision: "cancel", label: "Cancel" },
    ] as const;
    expect(approvalShortcutDecision(keyEvent("Enter", document.body), options)).toBeNull();
    expect(approvalShortcutDecision(keyEvent("Escape", document.body), options)).toBeNull();
  });
});

describe("questionShortcutOptionIndex", () => {
  it("picks the option by digit, also from a focused option button", () => {
    expect(questionShortcutOptionIndex(keyEvent("2", document.body), 3)).toBe(1);
    expect(questionShortcutOptionIndex(keyEvent("3", element(`<button data-target />`)), 3)).toBe(
      2,
    );
    expect(questionShortcutOptionIndex(keyEvent("4", document.body), 3)).toBeNull();
    expect(questionShortcutOptionIndex(keyEvent("0", document.body), 3)).toBeNull();
  });

  it("never fires while typing", () => {
    const composer = element(`<div contenteditable="true"><p data-target>1</p></div>`);
    expect(questionShortcutOptionIndex(keyEvent("1", composer), 3)).toBeNull();
    expect(
      questionShortcutOptionIndex(keyEvent("1", element(`<textarea data-target />`)), 3),
    ).toBeNull();
  });
});
