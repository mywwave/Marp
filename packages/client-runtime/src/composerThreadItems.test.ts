import { EnvironmentId, ProjectId, ThreadId } from "@marp/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  matchComposerEnvironmentItems,
  matchComposerThreadItems,
  type ComposerThreadCandidate,
} from "./composerThreadItems.ts";

const environmentId = EnvironmentId.make("env-composer");

function shell(
  id: string,
  title: string,
  overrides: Partial<ComposerThreadCandidate> = {},
): ComposerThreadCandidate {
  return {
    environmentId,
    id: ThreadId.make(id),
    projectId: ProjectId.make("project-other"),
    title,
    branch: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    latestUserMessageAt: null,
    opens: null,
    archivedAt: null,
    lineage: { rootThreadId: ThreadId.make(id), parentThreadId: null, relationshipToParent: null },
    ...overrides,
  };
}

it("ranks thread mentions like the palette and leaves out subagent threads", () => {
  const items = matchComposerThreadItems({
    shells: [
      shell("newer-mid-word", "Remodel the settings page", {
        updatedAt: "2026-10-20T00:00:00.000Z",
      }),
      shell("word", "Fix model picker"),
      shell("subagent", "Model review", {
        lineage: {
          rootThreadId: ThreadId.make("word"),
          parentThreadId: ThreadId.make("word"),
          relationshipToParent: "subagent",
        },
      }),
      shell("other-environment", "Model docs", { environmentId: EnvironmentId.make("env-other") }),
    ],
    environmentId,
    linkedEnvironments: new Map(),
    excludeThreadId: null,
    projectId: null,
    query: "model",
    now: Date.parse("2026-10-23T00:00:00.000Z"),
  });
  expect(items.map((item) => item.thread.threadId)).toEqual(["word", "newer-mid-word"]);
});

it("also offers threads on linked machines, naming the machine, but no other machine's", () => {
  const vps = EnvironmentId.make("env-vps");
  const items = matchComposerThreadItems({
    shells: [
      shell("here", "Deploy script"),
      shell("there", "Deploy script", { environmentId: vps }),
      shell("unlinked", "Deploy notes", { environmentId: EnvironmentId.make("env-unlinked") }),
    ],
    environmentId,
    linkedEnvironments: new Map([[vps, "Hetzner VPS"]]),
    excludeThreadId: null,
    projectId: null,
    query: "deploy",
    now: Date.parse("2026-10-23T00:00:00.000Z"),
  });
  expect(
    items.map(({ thread, label, description, machineLabel }) => ({
      thread,
      label,
      description,
      machineLabel,
    })),
  ).toEqual([
    {
      thread: { environmentId, threadId: "here" },
      label: "Deploy script",
      description: "Thread",
      machineLabel: null,
    },
    {
      thread: { environmentId: vps, threadId: "there" },
      label: "Deploy script",
      description: "Thread on Hetzner VPS",
      machineLabel: "Hetzner VPS",
    },
  ]);
});

it("puts the composer's project first, then recent, and leaves out itself and archived threads", () => {
  const projectId = ProjectId.make("project-here");
  const items = matchComposerThreadItems({
    shells: [
      shell("other-recent", "Auth refactor", { updatedAt: "2026-10-22T00:00:00.000Z" }),
      shell("here-old", "Auth tokens", { projectId }),
      shell("here-recent", "Auth flow", { projectId, updatedAt: "2026-10-22T00:00:00.000Z" }),
      shell("current", "Auth current", { projectId }),
      shell("archived", "Auth archive", { projectId, archivedAt: "2026-10-02T00:00:00.000Z" }),
      shell("mid-word-here", "Reauthorize notes", { projectId }),
    ],
    environmentId,
    linkedEnvironments: new Map(),
    excludeThreadId: ThreadId.make("current"),
    projectId,
    query: "auth",
    now: Date.parse("2026-10-23T00:00:00.000Z"),
  });
  // A word match elsewhere still beats a mid-word match in the composer's project.
  expect(items.map((item) => item.thread.threadId)).toEqual([
    "here-recent",
    "here-old",
    "other-recent",
    "mid-word-here",
  ]);
});

describe("matchComposerEnvironmentItems", () => {
  const environments = [
    { environmentId: EnvironmentId.make("env-here"), label: "Laptop", machine: "laptop" },
    { environmentId: EnvironmentId.make("env-vps"), label: "Hetzner VPS", machine: "cloud" },
    { environmentId: EnvironmentId.make("env-mini"), label: "Mac mini", machine: "mac-mini" },
  ] as const;

  it("offers the other machines matching the query, never the composer's own", () => {
    expect(
      matchComposerEnvironmentItems({
        environments,
        environmentId: EnvironmentId.make("env-here"),
        query: "  vps ",
      }),
    ).toEqual([
      {
        id: "environment:env-vps",
        type: "environment",
        environmentId: "env-vps",
        machine: "cloud",
        label: "Hetzner VPS",
        description: "Machine",
      },
    ]);
    expect(
      matchComposerEnvironmentItems({
        environments,
        environmentId: EnvironmentId.make("env-here"),
        query: "lap",
      }),
    ).toEqual([]);
    expect(
      matchComposerEnvironmentItems({
        environments,
        environmentId: EnvironmentId.make("env-here"),
        query: "",
      }),
    ).toEqual([]);
  });
});
