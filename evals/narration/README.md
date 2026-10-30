# Narration

Runs Claude Code on small throwaway repositories and checks how the agent talks while it works, with the communication block Marp appends to every harness (`packages/provider-core/src/server/runtimeInstructions.ts`):

- a short note before each batch of tool calls after the first,
- independent reads sent together,
- a short closing summary, and a plain answer to a simple question,
- existing code cited in a `startLine:endLine:path` fence.

The agent is the real `claude` CLI in headless mode, so it runs on your own Claude login (a subscription works; no API key). Each sample writes the case's files to a fresh directory and lets the agent read and edit them there; it has no shell.

## Run

```sh
cd evals
pnpm narration --workdir D:/marp-narration --without-communication --out runs/narration-base
pnpm narration --workdir D:/marp-narration --out runs/narration-new
pnpm narration --model claude-opus-5-5 --case explain-cites-code-range --samples 1 --workdir D:/marp-narration --out runs/check
```

- `--workdir` must be outside your home directory. Claude Code reads `CLAUDE.md` in every parent directory, so a directory under home would load your own `~/.claude/CLAUDE.md` into every sample. The runner refuses one there.
- Project settings only and no MCP servers (`--setting-sources project --strict-mcp-config`), so your hooks, plugins and MCP tools stay out.
- `--without-communication` runs Marp's text without the communication block: the baseline.
- Flags: `--model` (default `claude-sonnet-5-5`), `--case <ids>`, `--samples <n>` (default 3), `--concurrency <n>` (default 3).
- A run writes `results.jsonl` (every step's text and tool count, the final answer, and each check) and `summary.md`.
- Cost: a full run is 12 samples. On a subscription it counts against your usage; the CLI's notional cost is about $0.55 on Sonnet 5.5 and $1.30 on Opus 5.5.

## Add a case

Add an entry to `cases.ts` with an `id`, `kind` (`bad` reproduces a mistake, `control` is ordinary work that must not change), the `experience`, a `source`, the repository `files`, the `prompt`, and the `expect` checks that `grade.ts` documents. Run it with `--without-communication`, where a `bad` case must fail, and without, where it must pass.

## Results

Passes per case, Marp's text without → with the communication block, 3 samples each, from one run on 2026-10-30 (Claude Code 2.1.314, subscription login).

| Case                                 | Sonnet 5.5 | Opus 5.5  |
| ------------------------------------ | ---------- | --------- |
| fix-bug-narrates-between-batches     | 1/3 → 0/3  | 0/3 → 1/3 |
| explain-cites-code-range             | 0/3 → 3/3  | 0/3 → 3/3 |
| compare-handlers-reads-in-parallel   | 0/3 → 0/3  | 0/3 → 3/3 |
| control-simple-question-short-answer | 3/3 → 3/3  | 3/3 → 3/3 |

Closing answers got about 40% shorter on both models, and Opus noted more of its batches (0.14 → 0.56 of them). Sonnet's notes did not move (0.56 → 0.50), and it still globs before reading named files, so its first batch stays at one call; Claude Code's own prompt seems to govern both. An earlier wording without numbers ("one short sentence", "a short summary") moved only the citations and made Opus cite code in one-line answers.
