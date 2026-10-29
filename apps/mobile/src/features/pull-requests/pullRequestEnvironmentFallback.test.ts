import { describe, expect, it } from "vite-plus/test";
import type { EnvironmentProject } from "@marp/client-runtime/state/models";
import type { EnvironmentConnectionPhase } from "@marp/client-runtime/connection";
import { EnvironmentId } from "@marp/contracts";
import { pullRequestFallbackEnvironment } from "./pullRequestEnvironmentFallback";

const project = (environmentId: string, id: string, canonicalKey: string) =>
  ({
    environmentId,
    id,
    repositoryIdentity: { canonicalKey },
  }) as unknown as EnvironmentProject;

const projects = [
  project("laptop", "marp", "github.com/pingdotgg/marp"),
  project("desktop", "other", "github.com/pingdotgg/other"),
  project("server", "marp-copy", "github.com/pingdotgg/marp"),
];
const target = {
  environmentId: "laptop",
  projectId: "marp",
  repository: "pingdotgg/marp",
  host: "github.com",
};
const environment = (
  environmentId: string,
  connectionState: EnvironmentConnectionPhase = "connected",
  isEnabled = true,
) => ({ environmentId: EnvironmentId.make(environmentId), connectionState, isEnabled });

describe("pullRequestFallbackEnvironment", () => {
  it("moves to a connected copy of the repository when the original is down", () => {
    expect(
      pullRequestFallbackEnvironment(target, projects, [
        environment("desktop"),
        environment("server"),
      ]),
    ).toEqual({ environmentId: "server", projectId: "marp-copy" });
  });

  it("stays put while the original is connected or nothing else holds the repository", () => {
    expect(
      pullRequestFallbackEnvironment(target, projects, [
        environment("laptop"),
        environment("server"),
      ]),
    ).toBe(null);
    expect(pullRequestFallbackEnvironment(target, projects, [environment("desktop")])).toBe(null);
  });

  it("derives the host from the original project when the route has none", () => {
    const { host: _host, ...hostless } = target;
    expect(pullRequestFallbackEnvironment(hostless, projects, [environment("server")])).toEqual({
      environmentId: "server",
      projectId: "marp-copy",
    });
  });
});
