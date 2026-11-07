import { assert, it } from "@effect/vitest";

import {
  repositoryPathFromRemoteUrl,
  transportSafeSourceControlErrorValue,
} from "./SourceControlProvider.ts";

it("removes URL credentials, query parameters, and fragments from error transport values", () => {
  assert.strictEqual(
    transportSafeSourceControlErrorValue(
      "https://user:secret@example.test/org/repo/pull/42?token=secret#discussion",
    ),
    "https://example.test/org/repo/pull/42",
  );
});

it.each([
  ["git@github.com:MarpTools/marp.git", "MarpTools/marp"],
  ["github.com:MarpTools/marp.git", "MarpTools/marp"],
  ["gitlab.com:MarpTools/platform/marp", "MarpTools/platform/marp"],
  ["https://github.com/MarpTools/marp.git", "MarpTools/marp"],
  ["C:/repos/marp", null],
])("reads the repository path of %s", (remoteUrl, expected) => {
  assert.strictEqual(repositoryPathFromRemoteUrl(remoteUrl), expected);
});
