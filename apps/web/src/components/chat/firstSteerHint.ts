import type { useNavigate } from "@tanstack/react-router";
import * as Schema from "effect/Schema";

import { getLocalStorageItem, setLocalStorageItem } from "../../hooks/useLocalStorage";
import { toastManager } from "../ui/toast";
import { stackedThreadToast } from "../ui/toastHelpers";

const FIRST_STEER_HINT_STORAGE_KEY = "marp:first-steer-hint-shown:v1";

/** Once per device: a mid-turn message steered the agent, and Settings is where to change that. */
export function showFirstSteerHint(navigate: ReturnType<typeof useNavigate>): void {
  try {
    if (getLocalStorageItem(FIRST_STEER_HINT_STORAGE_KEY, Schema.Boolean) === true) return;
    setLocalStorageItem(FIRST_STEER_HINT_STORAGE_KEY, true, Schema.Boolean);
  } catch {
    // Unreadable storage would show the hint on every steer.
    return;
  }
  toastManager.add(
    stackedThreadToast({
      type: "info",
      title: "Your message steered the agent without stopping it",
      actionProps: {
        children: "Settings",
        onClick: () =>
          void navigate({
            to: "/settings/chat",
            hash: "follow-up-behavior",
            hashScrollIntoView: false,
          }),
      },
    }),
  );
}
