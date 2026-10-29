import * as Schema from "effect/Schema";
import { describe, expect, it } from "vite-plus/test";

import { parseMarpProjectFile, MarpProjectFileFromJson } from "./marpProjectFile.ts";

const decodeJson = Schema.decodeUnknownSync(MarpProjectFileFromJson);

describe("MarpProjectFileFromJson", () => {
  it("decodes lenient JSONC with comments and trailing commas", () => {
    const decoded = decodeJson(`{
      // team scripts
      "iconPath": "assets/logo.svg",
      "scripts": [
        { "name": "Dev", "command": "pnpm dev", },
      ],
    }`);

    expect(decoded.iconPath).toBe("assets/logo.svg");
    expect(decoded.scripts?.[0]).toEqual({ name: "Dev", command: "pnpm dev" });
  });
});

describe("parseMarpProjectFile", () => {
  it("reads project defaults from JSONC with a URL in a block comment", () => {
    expect(
      parseMarpProjectFile(`{
        /* See https://t3.codes/schema/marp.json */
        "defaultThreadEnvMode": "worktree"
      }`),
    ).toEqual({ defaultThreadEnvMode: "worktree" });
  });
});
