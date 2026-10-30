import { describe, expect, it } from "vite-plus/test";

import { timelinePathParts } from "./filePathDisplay";

describe("timelinePathParts", () => {
  it.each([
    ["D:\\w\\Marp\\apps\\web\\src\\chat\\Row.tsx", "D:\\w\\Marp", "Row.tsx", "…/src/chat"],
    ["/d/w/Marp/apps/web/Row.tsx", "D:\\w\\Marp", "Row.tsx", "apps/web"],
    ["src/auth/session.ts:12", "/home/me/app", "session.ts:12", "src/auth"],
    ["app/src/auth/session.ts", "/home/me/app", "session.ts", "src/auth"],
    ["/home/me/app/README.md", "/home/me/app", "README.md", ""],
    ["/etc/ssh/sshd/config", "/home/me/app", "config", "…/ssh/sshd"],
    ["/etc/hosts", undefined, "hosts", "/etc"],
  ])("%s under %s", (path, root, name, dir) => {
    expect(timelinePathParts(path, root)).toEqual({ name, dir });
  });
});
