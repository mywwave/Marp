#!/usr/bin/env node
// Eval-only runner: it drives the local Claude Code CLI on the user's own login.
// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalConsole:off
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";
import { buildRuntimeInstructions } from "@marp/provider-core/server/runtimeInstructions";
import { narrationCases, type NarrationCase } from "./cases.ts";
import { gradeNarration, type NarrationCheck, type NarrationStep } from "./grade.ts";

const { values } = NodeUtil.parseArgs({
  options: {
    model: { type: "string", default: "claude-sonnet-5-5" },
    out: { type: "string" },
    case: { type: "string" },
    samples: { type: "string", default: "3" },
    concurrency: { type: "string", default: "3" },
    workdir: { type: "string", default: NodeOS.tmpdir() },
    "without-communication": { type: "boolean", default: false },
  },
});
if (!values.out) throw new Error("Use --out <directory> [--model <id>] [--case <ids>].");
const outDirectory = values.out;
const model = values.model;
const samples = Number(values.samples);
const wanted = values.case?.split(",");
const cases = narrationCases.filter((testCase) => !wanted || wanted.includes(testCase.id));
if (cases.length === 0) throw new Error(`No case matches ${values.case}.`);

// Claude Code reads CLAUDE.md in every parent directory, so a work directory under the home
// directory would load the user's own ~/.claude/CLAUDE.md into every sample.
const workRoot = NodePath.resolve(values.workdir);
const fromHome = NodePath.relative(NodeOS.homedir(), workRoot);
if (!fromHome.startsWith("..") && !NodePath.isAbsolute(fromHome))
  throw new Error(`--workdir ${workRoot} is inside the home directory; pass one outside it.`);
await NodeFSP.mkdir(workRoot, { recursive: true });
// What Marp appends to Claude Code's own prompt for a thread without Marp's MCP tools.
const appended = buildRuntimeInstructions({
  harness: "Claude Code",
  communication: !values["without-communication"],
});
const SAMPLE_TIMEOUT_MS = 10 * 60_000;

type Row = {
  readonly id: string;
  readonly kind: NarrationCase["kind"];
  readonly model: string;
  readonly sample: number;
  readonly pass: boolean;
  readonly checks: ReadonlyArray<NarrationCheck>;
  readonly steps: ReadonlyArray<NarrationStep>;
  readonly finalText: string;
  readonly costUsd: number;
  readonly error?: string;
};

type StreamEvent = {
  readonly type?: string;
  readonly subtype?: string;
  readonly result?: string;
  readonly total_cost_usd?: number;
  readonly message?: {
    readonly id?: string;
    readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
  };
};

/** Runs Claude Code headless in a throwaway copy of the case's repository. */
async function runSample(testCase: NarrationCase, sample: number): Promise<Row> {
  const cwd = await NodeFSP.mkdtemp(NodePath.join(workRoot, "marp-narration-"));
  try {
    for (const [file, contents] of Object.entries(testCase.files)) {
      const target = NodePath.join(cwd, file);
      await NodeFSP.mkdir(NodePath.dirname(target), { recursive: true });
      await NodeFSP.writeFile(target, contents);
    }
    // Project settings only and no MCP servers, so the user's hooks, memory and tools stay out.
    const args = [
      "-p",
      testCase.prompt,
      "--model",
      model,
      "--output-format",
      "stream-json",
      "--verbose",
      "--setting-sources",
      "project",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--permission-mode",
      "acceptEdits",
      "--allowedTools",
      "Read,Grep,Glob,Edit,Write",
      "--append-system-prompt",
      appended,
    ];
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = NodeChildProcess.spawn("claude", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: SAMPLE_TIMEOUT_MS,
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk) => (out += chunk));
      child.stderr.on("data", (chunk) => (err += chunk));
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve(out) : reject(new Error(`claude exited ${code}: ${err.slice(-400)}`)),
      );
    });
    // The CLI streams each content block as its own event; blocks of one response share an id.
    const steps = new Map<string, { text: Array<string>; tools: number }>();
    let finalText = "";
    let ended = false;
    let costUsd = 0;
    for (const line of stdout.split("\n")) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "assistant" && event.message?.id) {
        const step = steps.get(event.message.id) ?? { text: [], tools: 0 };
        for (const block of event.message.content ?? []) {
          if (block.type === "text" && block.text?.trim()) step.text.push(block.text.trim());
          if (block.type === "tool_use") step.tools += 1;
        }
        steps.set(event.message.id, step);
      }
      if (event.type === "result") {
        finalText = event.result ?? "";
        ended = event.subtype === "success";
        costUsd = event.total_cost_usd ?? 0;
      }
    }
    const recorded = [...steps.values()].map((step) => ({
      text: step.text.join("\n\n"),
      tools: step.tools,
    }));
    const checks = gradeNarration(testCase.expect, { steps: recorded, finalText, ended });
    return {
      id: testCase.id,
      kind: testCase.kind,
      model,
      sample,
      pass: checks.every((check) => check.pass),
      checks,
      steps: recorded,
      finalText,
      costUsd,
    };
  } catch (error) {
    return {
      id: testCase.id,
      kind: testCase.kind,
      model,
      sample,
      pass: false,
      checks: [],
      steps: [],
      finalText: "",
      costUsd: 0,
      error: String(error),
    };
  } finally {
    await NodeFSP.rm(cwd, { recursive: true, force: true });
  }
}

const jobs = cases.flatMap((testCase) =>
  Array.from({ length: samples }, (_, sample) => () => runSample(testCase, sample)),
);
const rows: Array<Row> = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.max(1, Number(values.concurrency)) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      const row = await job();
      rows.push(row);
      console.log(`${row.id} #${row.sample} ${row.error ? "error" : row.pass ? "pass" : "fail"}`);
    }
  }),
);

await NodeFSP.mkdir(outDirectory, { recursive: true });
await NodeFSP.writeFile(
  NodePath.join(outDirectory, "results.jsonl"),
  rows.map((row) => JSON.stringify(row)).join("\n") + "\n",
);
const summary = cases.map((testCase) => {
  const own = rows.filter((row) => row.id === testCase.id && row.error === undefined);
  const failures = own.flatMap((row) =>
    row.checks.filter((check) => !check.pass).map((check) => check.check),
  );
  const errors = rows.filter((row) => row.id === testCase.id && row.error !== undefined).length;
  return `| ${testCase.id} | ${testCase.kind} | ${own.filter((row) => row.pass).length}/${own.length} | ${[...new Set(failures)].join("; ") || "-"} | ${errors} |`;
});
const cost = rows.reduce((total, row) => total + row.costUsd, 0);
const report = [
  `# Narration on ${model}${values["without-communication"] ? ", without the communication block" : ""}`,
  "",
  "| Case | Kind | Passed | Failed checks | Errors |",
  "| --- | --- | --- | --- | --- |",
  ...summary,
  "",
  `Notional cost reported by the CLI: $${cost.toFixed(2)}.`,
  "",
].join("\n");
await NodeFSP.writeFile(NodePath.join(outDirectory, "summary.md"), report);
console.log(`\n${report}`);
