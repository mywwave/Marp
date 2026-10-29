import { makeThreadPullRequests } from "@marp/source-control-core/shared/threadPullRequests";

import { sourceControlDefinitions } from "./sourceControlDefinitions.ts";

export { visibleThreadPullRequests } from "@marp/shared/threadPullRequests";

export const {
  normalizeThreadPullRequestKey,
  legacyThreadPullRequestKey,
  threadPullRequestKeysEqual,
  threadPullRequestKeyOf,
  resolveThreadPullRequestChains,
  threadPullRequestsOf,
  applyThreadPullRequestLinkUpdate,
} = makeThreadPullRequests(sourceControlDefinitions);
