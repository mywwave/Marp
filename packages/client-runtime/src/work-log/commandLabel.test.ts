import { describe, expect, it } from "vite-plus/test";

import {
  commandDisplayText,
  commandProgramName,
  commandIntent,
  commandSummary,
  readOnlyCommandActions,
} from "./commandLabel.ts";

describe("commandProgramName", () => {
  it.each([
    ["/bin/bash --rcfile /tmp/config -c 'git status'", "git"],
    ["zsh -lc 'CI=1 env -u DEBUG sudo -u root vp test run'", "vp"],
    ['"C:\\Program Files\\Git\\bin\\bash.exe" -lc "git status"', "git"],
    // regression: #9371 a multiline script whose later line re-quotes must still label its first program
    ["/bin/zsh -lc 'git status\nsed -n '\"'1,20p' apps/web/src/components/DiffPanel.tsx\"", "git"],
  ])("unwraps shell scripts without executing them: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    ["sudo -u root pnpm test", "pnpm"],
    ["zsh script.sh -c 'git status'", "zsh"],
    ["my-shell -c 'git status'", "my-shell"],
    ["$HOME/.bun/bin/bun test", "bun"],
  ])("preserves ordinary programs and actual shell launches: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each(["zsh -lc", "zsh -lc 'git status", "zsh -lc 'env'"])(
    "falls back for missing or malformed scripts: %s",
    (command) => {
      expect(commandProgramName(command)).toBeNull();
    },
  );

  it.each([
    "if test -f package.json; then vp test; fi",
    "[[ -f package.json ]]",
    "test -f package.json",
    'for file in *; do echo "$file"; done',
    "check() { vp test; }",
    "{ vp test; }",
    "(( count += 1 ))",
    ". ./script.sh",
    "export NODE_ENV=test",
    "repeat 3 echo ok",
    "return 1",
    "true",
  ])("falls back for shell syntax and internal control commands: %s", (command) => {
    expect(commandProgramName(command)).toBeNull();
  });

  it.each([
    ['rg -n "if|for|while" src', "rg"],
    ["vp test && git status", "vp"],
    ["echo `git status`", "echo"],
    ["cat <(rg needle src)", "cat"],
  ])("uses the first executable-looking program: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    ["cd packages/client-runtime && vp test run", "vp"],
    ["PATH+=:/tools npm test", "npm"],
    ["cd $(find . -type d | head -1) && git status", "git"],
    ["cd /tmp && # use the selected workspace\nnpm test", "npm"],
    ["cd ${ROOT:-path;with;semicolons} && bun test", "bun"],
  ])("skips leading cd commands and uses the next useful program: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    ["source ~/.nvm/nvm.sh && nvm use", "nvm"],
    ["unset DEBUG; node app.js", "node"],
    ["/bin/zsh -lc 'source ~/.nvm/nvm.sh && nvm use'", "nvm"],
  ])("skips shell setup commands and uses the next useful program: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    ["timeout 10s python3 script.py", "python3"],
    ["arch -arch arm64 /opt/tools/check", "check"],
    ["timeout 60 script -q /dev/null env CI=1 node app.js", "node"],
  ])("unwraps process-launch wrappers: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    "command -v git",
    "exec > output.log",
    "env CI=1 cd /tmp && npm test",
    "$PY scripts/check.py",
    "& { Get-Process }",
    "coproc npm test",
  ])("does not treat shell lookup and commandless wrapper forms as executions: %s", (command) => {
    expect(commandProgramName(command)).toBeNull();
  });

  it.each([
    ["hash --help", "hash"],
    ["Exec node app.js", "Exec"],
    ["CD /tmp && npm test", "CD"],
  ])("does not hide legitimate or case-distinct program names: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it("uses the command after leading shell comments", () => {
    expect(commandProgramName("# first comment\n  # second comment\ngit status")).toBe("git");
  });

  it.each([
    [">/tmp/log && npm test", "npm"],
    ["cd /tmp && 2>& 1 node app.js", "node"],
    ["cd /tmp && {output}>/tmp/log deno test", "deno"],
  ])("skips redirections before the next command: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it.each([
    ["cd /tmp <<-EOF\n\tnot-a-command\n\tEOF\nbun test", "bun"],
    ["cd /tmp <<A <<B\none\nA\ntwo\nB\ngit status", "git"],
    ["cd /tmp <<EOF && pnpm test\nnot-a-command\nEOF\nbun test", "pnpm"],
  ])("skips heredoc bodies before finding the next command: %s", (command, program) => {
    expect(commandProgramName(command)).toBe(program);
  });

  it("bounds nested shell unwrapping", () => {
    let command = "git status";
    for (let depth = 0; depth < 9; depth += 1) {
      command = `sh -c '${command.replaceAll("'", "'\\''")}'`;
    }
    expect(commandProgramName(command)).toBeNull();
  });

  it("bounds the number of top-level setup segments", () => {
    const command = [
      ...Array.from({ length: 2_000 }, (_, index) => `export VALUE_${index}=configured`),
      "npm test",
    ].join(";");

    expect(commandProgramName(command)).toBeNull();
  });
});

describe("commandDisplayText with redacted Codex commands", () => {
  // Codex replaces secrets in command text before sending it
  // (codex-rs/secrets/src/sanitizer.rs). Usually the quoting survives.
  it("unwraps a redacted command whose quoting is intact", () => {
    expect(
      commandDisplayText(
        `/bin/zsh -lc 'curl -H "Authorization: Bearer [REDACTED_SECRET]" https://example.com'`,
      ),
    ).toBe('curl -H "Authorization: Bearer [REDACTED_SECRET]" https://example.com');
  });

  // Its secret-assignment pattern can also swallow the backslash of an escaped
  // quote: `token=config[\"apiToken\"]` becomes `token=[REDACTED_SECRET]"apiToken\"]`.
  // The bare quote ends the -lc argument early, so where the script ends is unknown.
  it("keeps the wrapper when redaction broke the quoting", () => {
    const input = `/bin/zsh -lc "python3 -c 'token=[REDACTED_SECRET]"apiToken\\"]; print(token)'"`;
    expect(commandDisplayText(input)).toBe(input);
  });
});

describe("commandDisplayText control characters", () => {
  it.each([
    ["printf '\u001b[31mred\u001b[0m'", "printf '␛[31mred␛[0m'"],
    ["zsh -lc 'printf \"\u001b[1m\"'", 'printf "␛[1m"'],
    ["printf 'a\\tb'\r\necho done", "printf 'a\\tb'\r\necho done"],
  ])("shows %j as %j", (input, expected) => {
    expect(commandDisplayText(input)).toBe(expected);
  });
});

describe("readOnlyCommandActions", () => {
  it.each([
    ["rg -n session src/auth", [{ type: "search", query: "session", path: "src/auth" }]],
    ["grep -rn -e TODO apps | head -20", [{ type: "search", query: "TODO", path: "apps" }]],
    ["rg --files src | wc -l", [{ type: "list", path: "src" }]],
    ["Select-String -Pattern foo -Path a.ts", [{ type: "search", query: "foo", path: "a.ts" }]],
    ['findstr /S /C:"needle" *.ts', [{ type: "search", query: "needle", path: "*.ts" }]],
    [
      "cat a.ts b.ts",
      [
        { type: "read", path: "a.ts" },
        { type: "read", path: "b.ts" },
      ],
    ],
    ["sed -n '1,80p' src/a.ts", [{ type: "read", path: "src/a.ts", lines: "L1-80" }]],
    ["head -n 40 README.md 2>/dev/null", [{ type: "read", path: "README.md" }]],
    ["Get-Content -Path a.ts | Select-Object -First 50", [{ type: "read", path: "a.ts" }]],
    ["/bin/zsh -lc 'ls -la src'", [{ type: "list", path: "src" }]],
    ['powershell -NoProfile -Command "gci -Recurse src"', [{ type: "list", path: "src" }]],
    ["find . -name '*.ts' -type f | sort", [{ type: "list", path: "." }]],
    ["tree -L 2 apps", [{ type: "list", path: "apps" }]],
    [
      "cat a.ts && rg foo",
      [
        { type: "read", path: "a.ts" },
        { type: "search", query: "foo" },
      ],
    ],
    [
      'cd D:/w/Adapters && grep -n "old_string" ClaudeAdapterV2.test.ts | head -20',
      [{ type: "search", query: "old_string", path: "D:/w/Adapters/ClaudeAdapterV2.test.ts" }],
    ],
    [
      "cd /w/web && sed -n 1,10p hooks/usePresence.ts",
      [{ type: "read", path: "/w/web/hooks/usePresence.ts", lines: "L1-10" }],
    ],
    ["pushd src && cat ./a.ts", [{ type: "read", path: "src/a.ts" }]],
    ["Set-Location src; Get-Content a.ts", [{ type: "read", path: "src/a.ts" }]],
    ["cd src && cat /etc/hosts", [{ type: "read", path: "/etc/hosts" }]],
    [
      "sed -n 1,10p a.ts; sed -n 20,40p b.ts",
      [
        { type: "read", path: "a.ts", lines: "L1-10" },
        { type: "read", path: "b.ts", lines: "L20-40" },
      ],
    ],
    ["wc -l src/a.ts", [{ type: "read", path: "src/a.ts" }]],
    ["awk -F: '{print $1}' /etc/passwd | sort", [{ type: "read", path: "/etc/passwd" }]],
    ["jq '.scripts' package.json", [{ type: "read", path: "package.json" }]],
    ["rg -l foo | awk '{print $1}'", [{ type: "search", query: "foo" }]],
    ["fd -e ts session src", [{ type: "list", path: "src" }]],
    ["ag TODO apps", [{ type: "search", query: "TODO", path: "apps" }]],
    ["git grep -n expiresAt -- src", [{ type: "search", query: "expiresAt", path: "src" }]],
    ["git ls-files apps/web", [{ type: "list", path: "apps/web" }]],
    ["git show HEAD~1:src/a.ts", [{ type: "read", path: "src/a.ts" }]],
    ["git blame -L 10,20 src/a.ts", [{ type: "read", path: "src/a.ts" }]],
  ])("classifies %s", (command, actions) => {
    expect(readOnlyCommandActions(command)).toEqual(actions);
  });

  it.each([
    "sed -i 's/a/b/' a.ts",
    "sed -n '1p' -i a.ts",
    "rg x > out",
    "cat a >> b",
    "cat a && rm b",
    "cat a; vp test",
    "find . -delete",
    "find . -name '*.tmp' -exec rm {} +",
    "cat $(x)",
    "cat `x`",
    "(cat a)",
    "rg foo | tee out",
    "rg -l foo | xargs sed -i s/a/b/",
    "cat a | sort -o b",
    "rg --pre ./script foo",
    "tree -o out.txt",
    "cat",
    "Set-Content a.ts x",
    "perl -pi -e s/a/b/ a.ts",
    "cat a &",
    "cd X && rm f",
    "cd X && grep a f > out",
    "cd X",
    "cd X && cd Y && cat a",
    "awk '{print > \"out\"}' a.ts",
    "awk '{system(\"rm \" $1)}' list",
    "awk -i inplace '{print}' a.ts",
    "fd -e tmp -x rm",
    "git show HEAD",
    "git checkout a.ts",
    "jq .",
    "echo {a,b}",
  ])("leaves %s as a command", (command) => {
    expect(readOnlyCommandActions(command)).toBeNull();
  });
});

describe("commandSummary", () => {
  it.each([
    [
      "cd D:/VSProjects/Marp/apps/web/src && sed -n 1,10p hooks/usePresence.ts",
      "sed · hooks/usePresence.ts",
    ],
    ['grep -rln "orphan" --include=*.go backend/ | head -20', "grep, head · backend"],
    ["pnpm test", "pnpm test"],
    ["ls", "ls"],
  ])("names the programs and their target: %s", (command, summary) => {
    expect(commandSummary(command)).toBe(summary);
  });

  it("clamps a very long command", () => {
    const summary = commandSummary(`cd /w && ${"x".repeat(300)} file.ts`);
    expect(summary.length).toBeLessThanOrEqual(80);
    expect(summary.endsWith("…")).toBe(true);
  });
});

describe("commandIntent", () => {
  const label = (command: string) => {
    const intent = commandIntent(command);
    if (intent === null) return null;
    return intent.object ? `${intent.verbs.completed} ${intent.object}` : intent.verbs.completed;
  };

  it.each([
    ["pnpm test", "Ran tests"],
    ["npm run test -- src/a.test.ts", "Ran tests src/a.test.ts"],
    ["yarn test", "Ran tests"],
    ["bun run test", "Ran tests"],
    ["vp test run apps/web/src/a.test.ts", "Ran tests src/a.test.ts"],
    ["vitest run src/a.test.ts", "Ran tests src/a.test.ts"],
    ["npx vitest", "Ran tests"],
    ["pytest tests/test_api.py", "Ran tests tests/test_api.py"],
    ["go test ./...", "Ran tests"],
    ["cargo test", "Ran tests"],
    ["dotnet test", "Ran tests"],
    ["cd apps/web && pnpm test 2>&1 | tail -20", "Ran tests"],
    ["CI=1 pnpm test", "Ran tests"],
    ["time pnpm test", "Ran tests"],
    ["bash -lc 'pnpm test'", "Ran tests"],
    ['powershell -NoProfile -Command "pnpm test"', "Ran tests"],
    ["tsc --noEmit", "Typechecked"],
    ["vp run typecheck", "Typechecked"],
    ["pnpm exec tsc -p .", "Typechecked"],
    ["mypy src", "Typechecked"],
    ["eslint src", "Linted"],
    ["vp lint src/a.ts", "Linted"],
    ["ruff check .", "Linted"],
    ["prettier --write src", "Formatted"],
    ["vp fmt", "Formatted"],
    ["pnpm run build", "Built"],
    ["vite build", "Built"],
    ["cargo build --release", "Built"],
    ["pnpm install", "Installed dependencies"],
    ["npm ci", "Installed dependencies"],
    ["vp i", "Installed dependencies"],
    ["pnpm add zod", "Added zod"],
    ["npm install -D vitest", "Added vitest"],
    ["pip install -r requirements.txt", "Installed dependencies"],
    ["pip install requests", "Added requests"],
    ["pnpm run dev", "Started dev server"],
    ["vp run dev", "Started dev server"],
    ["git status", "Viewed git status"],
    ["git diff --stat", "Viewed git diff"],
    ["git log --oneline -5", "Viewed git log"],
    ["git branch", "Listed branches"],
    ["git branch -D old", "Changed branches"],
    ["git stash list", "Viewed stashes"],
    ["git stash", "Stashed changes"],
    ['git commit -m "fix"', "Committed"],
    ["git push origin main", "Pushed"],
    ["git checkout -b feature/x", "Switched to feature/x"],
    ["git switch main", "Switched to main"],
    ["mkdir -p src/new", "Created src/new"],
    ["rm -rf dist", "Removed dist"],
    ["Remove-Item -Recurse build", "Removed build"],
    ["New-Item -ItemType File notes.md", "Created File"],
    ["mv a.ts b.ts", "Moved a.ts"],
    ["which node", "Looked up node"],
    ["Get-Command git", "Looked up git"],
    ["node --version", "Checked node version"],
    ["pwd", "Checked directory"],
  ])("labels %s as %s", (command, expected) => {
    expect(label(command)).toBe(expected);
  });

  it.each(["node scripts/gen.mjs", "python - <<'X'\nprint(1)\nX", "make", "cat a.ts", "ls"])(
    "leaves %s to the summary",
    (command) => {
      expect(commandIntent(command)).toBeNull();
    },
  );
});
