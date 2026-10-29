// @effect-diagnostics nodeBuiltinImport:off globalTimers:off globalDate:off - This host-side fixture creates an isolated local Marp environment.
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";
import * as NodeUtil from "node:util";

const execFile = NodeUtil.promisify(NodeChildProcess.execFile);

const SHOWCASE_PROJECT_ID = "marp";
const SHOWCASE_THREAD_ID = "remote-command-center";

export const SHOWCASE_SCENES = [
  "threads",
  "thread",
  "terminal",
  "review",
  "environments",
  "agent-activity",
] as const;
export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

const MODEL_SELECTION = JSON.stringify({ instanceId: "codex", model: "gpt-5.4" });
const PROJECT_SCRIPTS = JSON.stringify([
  {
    id: "dev",
    name: "Dev",
    command: "pnpm dev",
    icon: "play",
    runOnWorktreeCreate: false,
  },
  {
    id: "test",
    name: "Tests",
    command: "pnpm test",
    icon: "test",
    runOnWorktreeCreate: false,
  },
]);

const SHOWCASE_TERMINAL_PROMPT =
  "\u001b[1;32m→\u001b[0m \u001b[1;36mt3code\u001b[0m \u001b[1;34mgit:(\u001b[1;31mfeat/remote-command-center\u001b[1;34m)\u001b[0m \u001b[1;33m✗\u001b[0m ";

const SHOWCASE_TERMINAL_BUFFER = [
  `${SHOWCASE_TERMINAL_PROMPT}vpr dev`,
  "",
  "  \u001b[1;32mVITE\u001b[0m \u001b[32mv7.1.1\u001b[0m  \u001b[2mready in\u001b[0m \u001b[1m1.24s\u001b[0m",
  "",
  "  \u001b[32m→\u001b[0m  \u001b[2mLocal:\u001b[0m    \u001b[4;36mhttp://127.0.0.1:5173/\u001b[0m",
  "  \u001b[32m→\u001b[0m  \u001b[2mNetwork:\u001b[0m  \u001b[4;36mhttp://192.168.1.24:5173/\u001b[0m",
  "  \u001b[32m→\u001b[0m  \u001b[2mProject:\u001b[0m  \u001b[1mt3code\u001b[0m \u001b[2m(~/Code/marp)\u001b[0m",
  "",
  "  \u001b[32m✓ 612 passed\u001b[0m   \u001b[33m△ 2 warnings\u001b[0m   \u001b[31m✗ 0 failed\u001b[0m",
  "",
  "  \u001b[42;30m READY \u001b[0m \u001b[2mwatching for changes, press\u001b[0m \u001b[1mq\u001b[0m \u001b[2mto quit\u001b[0m",
  "",
  SHOWCASE_TERMINAL_PROMPT,
].join("\r\n");

const BASE_ENVIRONMENT_PRESENCE = `export function environmentLabel(count: number): string {
  return \`${"${count}"} environments\`;
}
`;

const UPDATED_ENVIRONMENT_PRESENCE = `const PULSE = ["✦", "✧", "·", "✧"] as const;

export function environmentLabel(connected: number, total: number, frame: number): string {
  const pulse = PULSE[frame % PULSE.length];
  return \`${"${pulse} ${connected}/${total}"} ready\`;
}
`;

const REMOTE_HANDOFF_CARD = `import { View, Text } from "react-native";

export function RemoteHandoffCard(props: { machine: string; latencyMs: number }) {
  return (
    <View className="rounded-2xl bg-surface-2 p-4">
      <Text className="font-semibold">Ready on {props.machine}</Text>
      <Text className="text-success">Handoff in {props.latencyMs}ms</Text>
    </View>
  );
}
`;

const PROJECT_FAVICONS = {
  marp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="#171717"/>
  <g transform="translate(219 164) scale(1.6)"><path fill="#b5b4b4" d="M499.418 328.113c2.091-.219 8.477-.319 10.241.364 14.563 5.635 33.273 17.641 46.806 25.318l58.394 32.753c14.129 7.923 28.565 15.449 42.529 23.641 10.179 5.972 12.124 12.946 12.577 24.01.487 11.918.437 23.88.383 35.859l-.261 56.752.2 49.044c.199 40.04 4.108 36.617-30.466 56.792a3433 3433 0 0 0-33.102 19.423c-1.295.718-1.288.872-2.726.866-1.262-2.05-.575-40.584-.575-45.55l-.08-94.623c-.024-14.719.014-29.343-.676-44.05-.784-16.697-16.546-22.381-29.268-29.356l-32.983-18.175-104.603-58.185c2.743-1.946 5.578-3.643 8.524-5.269 16.704-9.22 32.973-19.341 49.937-28.069 1.466-.754 3.541-1.218 5.149-1.545"/><path fill="#f3f3f3" d="M358.837 418.441c11.868 2.654 26.027 13.451 37.204 18.721 4.407 2.078 16.894 9.14 18.231 13.772 4.218 14.613 6.254 30.944 8.791 46.096l14.413 84.703c2.09-10.716 23.359-98.279 26.628-102.899.627-.887.831-.944 1.923-1.031 5.062-.404 38.904 20.133 44.578 24.048 2.151 1.484 4.013 3.042 5.817 4.934 1.81 25.185.956 49.825 1.005 75.076l.101 113.379c-13.409-7.231-25.177-14.583-39.111-21.455l.218-101.142q.391-18.22.305-36.444a1383 1383 0 0 1-30.462 118.375c-9.085-4.5-18.025-9.933-26.779-15.098-1.979-11.776-4.838-24.793-7.16-36.592a8247 8247 0 0 1-17.601-90.745c-2.014-10.757-4.426-21.821-6.168-32.571-.843 13.155.466 35.289.588 49.3q.227 46.858-.249 93.714c-12.005-6.547-23.51-13.352-35.688-19.788l-.007-119.322c-.025-18.196-.57-36.51-.285-54.689.086-5.49-.019-6.909 3.708-10.342"/><path fill="#f3f3f3" d="M583.408 473.953q.86.138 1.709.33c1.293.303 3.319 1.188 3.59 2.387.8 3.542 1.055 10.511 1.043 14.18-.089 27.75-.271 55.53-.169 83.27l.24 44.805c.074 9.56.058 19.17.025 28.713-.059 17.038-12.58 20.698-25.31 27.94l-29.235 16.876-5.421 3.088.109-100.964c-.014-14.696-2.002-79.117 1.546-87.872 3.014-7.44 43.32-29.313 51.873-32.753"/><path fill="#f3f3f3" d="M421.285 371.445c2.894.872 10.721 5.125 13.591 6.649a1910 1910 0 0 1 31.55 17.302l114.528 63.863c-11.133 7.48-44.506 28.319-56.218 30.751-10.904-.753-20.268-7.279-29.579-12.569l-29.647-16.775a8204 8204 0 0 1-100.828-56.054c17.461-10.956 38.645-22.706 56.603-33.167"/></g>
</svg>`,
  react: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#20232a"/>
  <g fill="none" stroke="#61dafb" stroke-width="2.8"><ellipse cx="32" cy="32" rx="25" ry="9"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(120 32 32)"/></g>
  <circle cx="32" cy="32" r="4.8" fill="#61dafb"/>
</svg>`,
  linux: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#f7c948"/>
  <ellipse cx="32" cy="35" rx="17" ry="22" fill="#202124"/>
  <ellipse cx="32" cy="40" rx="12" ry="14" fill="#f5f5f2"/>
  <circle cx="27" cy="24" r="5" fill="white"/><circle cx="37" cy="24" r="5" fill="white"/>
  <circle cx="28" cy="25" r="2"/><circle cx="36" cy="25" r="2"/>
  <path d="M27 31l5-4 5 4-5 4z" fill="#f28c28"/><path d="M16 55h14l-7-5zM34 55h14l-7-5z" fill="#f28c28"/>
</svg>`,
} as const;

export const SHOWCASE_PROJECTS = [
  {
    id: "marp",
    title: "Marp",
    directory: "marp",
    repositoryUrl: "https://github.com/mywwave/Marp.git",
    favicon: PROJECT_FAVICONS.marp,
  },
  {
    id: "react",
    title: "React",
    directory: "react",
    repositoryUrl: "https://github.com/facebook/react.git",
    favicon: PROJECT_FAVICONS.react,
  },
  {
    id: "linux",
    title: "Linux",
    directory: "linux",
    repositoryUrl: "https://github.com/torvalds/linux.git",
    favicon: PROJECT_FAVICONS.linux,
  },
] as const;

export const SHOWCASE_ENVIRONMENTS = [
  {
    id: "moonbase-terminal",
    label: "Moonbase Terminal",
    projectIds: ["marp"],
  },
  {
    id: "suspense-station",
    label: "Suspense Station",
    projectIds: ["react"],
  },
  {
    id: "kernel-cabin",
    label: "Kernel Cabin",
    projectIds: ["linux"],
  },
] as const;

export const SHOWCASE_THREADS = [
  {
    id: SHOWCASE_THREAD_ID,
    projectId: "marp",
    title: "Make remote coding feel local ✦",
    branch: "feat/remote-command-center",
    minutesAgo: 3,
    request:
      "Give Marp a remote-first command center. Make three machines feel one tap away, keep agent work in sync, and make every handoff feel instant.",
    response:
      "Marp now treats every machine like it is right here in the room. ✦\n\n- Moonbase, Suspense Station, and Kernel Cabin stay live together\n- Terminal state follows you without losing a single line\n- Agent work remains perfectly in sync across devices\n- Handoffs land before your train of thought can wander\n\nI also ran the changed workspace: **612 tests passed**.",
  },
  {
    id: "pocket-command-center",
    projectId: "marp",
    title: "Put the command center in your pocket",
    branch: "feat/pocket-command-center",
    minutesAgo: 21,
    state: "approval" as const,
    request: "Make switching between desktop, phone, and tablet feel like one continuous session.",
    response:
      "The handoff flow preserves the selected thread, terminal buffer, and working diff. The final motion treatment is ready for approval.",
  },
  {
    id: "buttery-suspense",
    projectId: "react",
    title: "Make Suspense transitions buttery",
    branch: "perf/buttery-suspense",
    minutesAgo: 12,
    state: "working" as const,
    request:
      "Trace the last few dropped frames in nested Suspense transitions and make them disappear.",
    response: null,
  },
  {
    id: "hydration-haikus",
    projectId: "react",
    title: "Turn hydration warnings into haikus",
    branch: "dev/hydration-haikus",
    minutesAgo: 44,
    request:
      "Keep hydration errors precise, but make the development copy unexpectedly delightful.",
    response:
      "The diagnostics still lead with the exact mismatch and component stack. A tiny optional haiku now closes the expanded explanation.",
    snoozeMinutes: 90,
  },
  {
    id: "beautiful-boot",
    projectId: "linux",
    title: "Make boot logs oddly beautiful",
    branch: "feat/beautiful-boot",
    minutesAgo: 34,
    state: "plan" as const,
    request:
      "Design a clearer boot timeline that remains useful over serial and never hides kernel detail.",
    response:
      "The plan groups milestones without changing the underlying log stream, preserves plain-text output, and adds zero work to the hot path.",
  },
  {
    id: "patient-penguins",
    projectId: "linux",
    title: "Teach penguins to wait patiently",
    branch: "feat/patient-penguins",
    minutesAgo: 52,
    request: "Make delayed work easier to follow without adding noise to the scheduler trace.",
    response:
      "Delayed work now carries a concise reason through the trace, so the wait is legible without changing scheduling behavior.",
    snoozeMinutes: 8 * 60,
  },
  {
    id: "handoff-haptics",
    projectId: "marp",
    title: "Tune the handoff haptics",
    branch: "feat/handoff-haptics",
    minutesAgo: 5 * 60,
    settled: true,
    request: "Give the desktop-to-phone handoff a haptic that lands with the animation.",
    response:
      "The handoff now taps once as the thread lands and stays silent on failure, so the phone never celebrates a handoff that did not happen.",
  },
  {
    id: "streaming-shell",
    projectId: "react",
    title: "Stream the shell before the data",
    branch: "feat/streaming-shell",
    minutesAgo: 28 * 60,
    settled: true,
    request: "Get the app shell painted before any data request resolves.",
    response:
      "The shell now flushes on first byte and the data boundaries hydrate underneath it, so the first paint no longer waits on the slowest query.",
  },
  {
    id: "quieter-oom",
    projectId: "linux",
    title: "Make the OOM killer explain itself",
    branch: "feat/quieter-oom",
    minutesAgo: 2 * 24 * 60,
    settled: true,
    request: "Make out-of-memory kills legible without adding a single allocation to the hot path.",
    response:
      "Kills now report the winning heuristic and the runner-up alongside the usual dump, assembled entirely from data the path already had.",
  },
] as const;

function minutesBefore(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

async function runGit(workspaceRoot: string, args: ReadonlyArray<string>): Promise<void> {
  await execFile("git", [...args], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Alex Rivera",
      GIT_AUTHOR_EMAIL: "alex@lumen.test",
      GIT_COMMITTER_NAME: "Alex Rivera",
      GIT_COMMITTER_EMAIL: "alex@lumen.test",
    },
  });
}

async function initializeRepository(input: {
  readonly workspaceRoot: string;
  readonly repositoryUrl: string;
  readonly commitMessage: string;
}): Promise<void> {
  await runGit(input.workspaceRoot, ["init", "-b", "main"]);
  await runGit(input.workspaceRoot, ["remote", "add", "origin", input.repositoryUrl]);
  await runGit(input.workspaceRoot, ["add", "."]);
  await runGit(input.workspaceRoot, ["commit", "-m", input.commitMessage]);
}

async function seedMarpWorkspace(workspaceRoot: string): Promise<void> {
  await NodeFSP.mkdir(NodePath.join(workspaceRoot, "apps/mobile/src/features/home"), {
    recursive: true,
  });
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "package.json"),
    `${JSON.stringify({ name: "marp", private: true, scripts: { test: "vp test" } }, null, 2)}\n`,
  );
  await NodeFSP.writeFile(NodePath.join(workspaceRoot, "favicon.svg"), PROJECT_FAVICONS.marp);
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/features/home/environmentPresence.ts"),
    BASE_ENVIRONMENT_PRESENCE,
  );
  await initializeRepository({
    workspaceRoot,
    repositoryUrl: "https://github.com/mywwave/Marp.git",
    commitMessage: "Show connected environments",
  });
  await runGit(workspaceRoot, ["checkout", "-b", "feat/remote-command-center"]);
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/features/home/environmentPresence.ts"),
    UPDATED_ENVIRONMENT_PRESENCE,
  );
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/features/home/RemoteHandoffCard.tsx"),
    REMOTE_HANDOFF_CARD,
  );
}

async function seedCompanionWorkspace(input: {
  readonly workspaceRoot: string;
  readonly title: string;
  readonly repositoryUrl: string;
  readonly favicon: string;
}): Promise<void> {
  await NodeFSP.mkdir(input.workspaceRoot, { recursive: true });
  await NodeFSP.writeFile(NodePath.join(input.workspaceRoot, "favicon.svg"), input.favicon);
  await NodeFSP.writeFile(
    NodePath.join(input.workspaceRoot, "README.md"),
    `# ${input.title}\n\nSeeded by the Marp mobile screenshot harness.\n`,
  );
  await initializeRepository({
    workspaceRoot: input.workspaceRoot,
    repositoryUrl: input.repositoryUrl,
    commitMessage: `Seed ${input.title} workspace`,
  });
}

function insertThread(
  database: NodeSqlite.DatabaseSync,
  now: number,
  input: {
    readonly id: string;
    readonly projectId: string;
    readonly title: string;
    readonly branch: string;
    readonly minutesAgo: number;
    readonly state?: "working" | "approval" | "plan";
    readonly settled?: boolean;
    readonly snoozeMinutes?: number;
    readonly workspaceRoot: string;
  },
): void {
  const turnId = `${input.id}-turn`;
  const updatedAt = minutesBefore(now, input.minutesAgo);
  const isWorking = input.state === "working";
  const snoozedUntil =
    input.snoozeMinutes === undefined
      ? null
      : new Date(now + input.snoozeMinutes * 60_000).toISOString();
  const snoozedAt =
    input.snoozeMinutes === undefined
      ? null
      : minutesBefore(now, Math.max(1, Math.floor(input.minutesAgo / 2)));
  database
    .prepare(
      `INSERT INTO projection_threads (
        thread_id, project_id, title, model_selection_json, runtime_mode, interaction_mode,
        branch, worktree_path, latest_turn_id, latest_user_message_at, pending_approval_count,
        pending_user_input_count, has_actionable_proposed_plan, created_at, updated_at,
        archived_at, deleted_at, settled_override, settled_at, snoozed_until, snoozed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.projectId,
      input.title,
      MODEL_SELECTION,
      "full-access",
      input.state === "plan" ? "plan" : "default",
      input.branch,
      input.workspaceRoot,
      turnId,
      minutesBefore(now, input.minutesAgo + 1),
      input.state === "approval" ? 1 : 0,
      input.state === "plan" ? 1 : 0,
      minutesBefore(now, input.minutesAgo + 120),
      updatedAt,
      input.settled ? "settled" : null,
      input.settled ? updatedAt : null,
      snoozedUntil,
      snoozedAt,
    );
  database
    .prepare(
      `INSERT INTO projection_thread_sessions (
        thread_id, status, provider_name, provider_instance_id, provider_session_id,
        provider_thread_id, runtime_mode, active_turn_id, last_error, updated_at
      ) VALUES (?, ?, 'Codex', 'codex', NULL, NULL, 'full-access', ?, NULL, ?)`,
    )
    .run(input.id, isWorking ? "running" : "ready", isWorking ? turnId : null, updatedAt);
}

// V2 still owns projection_projects; upsert project rows without deleting them with V1 thread data.
const SEEDED_V1_TABLES = [
  "projection_thread_messages",
  "projection_thread_sessions",
  "projection_threads",
] as const;

const SEEDED_PROJECTION_TABLES = [...SEEDED_V1_TABLES, "projection_projects"] as const;

const SEEDED_THREAD_COLUMNS = ["snoozed_until", "snoozed_at"] as const;

function hasSeedableSchema(dbPath: string): boolean {
  let database: NodeSqlite.DatabaseSync;
  try {
    database = new NodeSqlite.DatabaseSync(dbPath, { readOnly: true });
  } catch {
    return false;
  }
  try {
    const tableCount = database
      .prepare(
        `SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN (${SEEDED_PROJECTION_TABLES.map(() => "?").join(", ")})`,
      )
      .get(...SEEDED_PROJECTION_TABLES) as { count: number };
    if (tableCount.count !== SEEDED_PROJECTION_TABLES.length) return false;

    const threadColumns = database.prepare("PRAGMA table_info(projection_threads)").all() as Array<{
      name: string;
    }>;
    const threadColumnNames = new Set(threadColumns.map((column) => column.name));
    return SEEDED_THREAD_COLUMNS.every((column) => threadColumnNames.has(column));
  } catch {
    return false;
  } finally {
    database.close();
  }
}

async function waitForSeedableSchema(dbPath: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (hasSeedableSchema(dbPath)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The environment server did not migrate ${dbPath} within ${timeoutMs}ms.`);
}

function seedDatabase(
  dbPath: string,
  workspaceRoots: ReadonlyMap<string, string>,
  projects: ReadonlyArray<(typeof SHOWCASE_PROJECTS)[number]>,
  threads: ReadonlyArray<(typeof SHOWCASE_THREADS)[number]>,
  now: number,
): void {
  // The running server writes migrations/projections concurrently; wait for its lock instead of failing SQLITE_BUSY.
  const database = new NodeSqlite.DatabaseSync(dbPath, { timeout: 30_000 });
  try {
    database.exec("BEGIN IMMEDIATE");
    for (const table of SEEDED_V1_TABLES) {
      database.exec(`DELETE FROM ${table}`);
    }
    const insertProject = database.prepare(
      `INSERT OR REPLACE INTO projection_projects (
          project_id, title, workspace_root, default_model_selection_json, scripts_json,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    );
    for (const [index, project] of projects.entries()) {
      const workspaceRoot = workspaceRoots.get(project.id);
      if (!workspaceRoot) throw new Error(`Missing workspace root for ${project.id}.`);
      const latestThreadMinutes = Math.min(
        ...threads
          .filter((thread) => thread.projectId === project.id)
          .map((thread) => thread.minutesAgo),
      );
      insertProject.run(
        project.id,
        project.title,
        workspaceRoot,
        MODEL_SELECTION,
        PROJECT_SCRIPTS,
        minutesBefore(now, 60 * 24 * (90 - index * 12)),
        minutesBefore(now, latestThreadMinutes),
      );
    }

    for (const thread of threads) {
      const workspaceRoot = workspaceRoots.get(thread.projectId);
      if (!workspaceRoot) throw new Error(`Missing workspace root for ${thread.projectId}.`);
      insertThread(database, now, {
        ...thread,
        ...("state" in thread ? { state: thread.state } : {}),
        workspaceRoot,
      });
    }

    const insertMessage = database.prepare(
      `INSERT INTO projection_thread_messages (
        message_id, thread_id, turn_id, role, text, is_streaming, attachments_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    );
    for (const thread of threads) {
      const turnId = `${thread.id}-turn`;
      const requestTime = minutesBefore(now, thread.minutesAgo + 5);
      insertMessage.run(
        `${thread.id}-request`,
        thread.id,
        turnId,
        "user",
        thread.request,
        requestTime,
        requestTime,
      );
      if (thread.response !== null) {
        const responseTime = minutesBefore(now, thread.minutesAgo);
        insertMessage.run(
          `${thread.id}-answer`,
          thread.id,
          turnId,
          "assistant",
          thread.response,
          responseTime,
          responseTime,
        );
      }
    }

    database.exec("COMMIT");
  } catch (error) {
    // Failed BEGIN or automatic rollback leaves no transaction; preserve the original error if rollback fails.
    try {
      database.exec("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    database.close();
  }
}

export async function seedShowcaseEnvironment(input: {
  readonly baseDir: string;
  readonly projectIds?: ReadonlyArray<string>;
  readonly now?: number;
}): Promise<{ readonly dbPath: string; readonly workspaceRoot: string }> {
  const now = input.now ?? Date.now();
  const selectedProjectIds = new Set(
    input.projectIds ?? SHOWCASE_PROJECTS.map((project) => project.id),
  );
  const projects = SHOWCASE_PROJECTS.filter((project) => selectedProjectIds.has(project.id));
  if (projects.length === 0) throw new Error("At least one showcase project must be selected.");
  const threads = SHOWCASE_THREADS.filter((thread) => selectedProjectIds.has(thread.projectId));
  const workspaceBase = NodePath.join(input.baseDir, "workspace");
  const workspaceRoots = new Map(
    projects.map(
      (project) => [project.id, NodePath.join(workspaceBase, project.directory)] as const,
    ),
  );
  const primaryProject =
    projects.find((project) => project.id === SHOWCASE_PROJECT_ID) ?? projects[0];
  if (!primaryProject) throw new Error("The primary showcase workspace is not configured.");
  const workspaceRoot = workspaceRoots.get(primaryProject.id);
  if (!workspaceRoot) throw new Error("The primary showcase workspace is not configured.");
  const dbPath = NodePath.join(input.baseDir, "userdata", "statev2.sqlite");
  if (primaryProject.id === SHOWCASE_PROJECT_ID) {
    await seedMarpWorkspace(workspaceRoot);
  }
  await Promise.all(
    projects
      .filter((project) => project.id !== SHOWCASE_PROJECT_ID)
      .map(async (project) => {
        const projectWorkspaceRoot = workspaceRoots.get(project.id);
        if (!projectWorkspaceRoot) throw new Error(`Missing workspace root for ${project.id}.`);
        await seedCompanionWorkspace({
          workspaceRoot: projectWorkspaceRoot,
          title: project.title,
          repositoryUrl: project.repositoryUrl,
          favicon: project.favicon,
        });
      }),
  );
  // Listening precedes migration completion; wait for the schema before reseeding.
  await waitForSeedableSchema(dbPath);
  seedDatabase(dbPath, workspaceRoots, projects, threads, now);

  const terminalDirectory = NodePath.join(input.baseDir, "userdata", "logs", "terminals");
  if (selectedProjectIds.has(SHOWCASE_PROJECT_ID)) {
    const safeThreadId = Buffer.from(SHOWCASE_THREAD_ID).toString("base64url");
    await NodeFSP.mkdir(terminalDirectory, { recursive: true });
    await NodeFSP.writeFile(
      NodePath.join(terminalDirectory, `terminal_${safeThreadId}.log`),
      SHOWCASE_TERMINAL_BUFFER,
    );
  }
  return { dbPath, workspaceRoot };
}
