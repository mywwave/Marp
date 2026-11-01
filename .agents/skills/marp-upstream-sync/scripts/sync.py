"""Upstream (T3 Code) -> Marp sync helper.

Run from the repo root.

  python sync.py triage [--json PATH]   dry run: what is new, what merges cleanly, what conflicts
  python sync.py apply                  write the merge into the working tree (after `git merge -s ours`)
  python sync.py resolve FILE IDX ours|theirs|both|file:PATH
  python sync.py leaks                  T3 names that slipped into staged lines

Base and upstream are rebranded with rebrand.py before a 3-way `git merge-file`, so only
real edits conflict, not the T3 -> Marp rename.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rebrand import SKIP_FILES, rebrand, rebrand_path  # noqa: E402

UPSTREAM = os.environ.get("MARP_UPSTREAM_REF", "upstream/main")
NO_REBRAND_PARTS = ("/Vendor/", ".repos/", "patches/")
# Paths where an upstream change deserves a look even when it merges cleanly.
WATCH = {
    "deps": re.compile(r"(^|/)package\.json$|^pnpm-lock\.yaml$"),
    "contracts": re.compile(r"^packages/contracts/"),
    "migrations": re.compile(r"/[Mm]igrations?/"),
    "model-facing": re.compile(r"^evals/|Instructions|McpTools?|/mcp/"),
}
CONFLICT_RE = re.compile(r"^<<<<<<< ours \(Marp\)\n(.*?)^=======\n(.*?)^>>>>>>> upstream\n", re.S | re.M)


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, encoding="utf-8", check=True
    ).stdout


def blob(rev: str, path: str) -> bytes | None:
    r = subprocess.run(["git", "show", f"{rev}:{path}"], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def as_text(data: bytes | None) -> str | None:
    if data is None:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def brand(path: str, data: bytes | None) -> bytes | None:
    t = as_text(data)
    if t is None or path in SKIP_FILES or any(p in path for p in NO_REBRAND_PARTS):
        return data
    return rebrand(t).encode("utf-8")


def merge3(base: bytes, ours: bytes, theirs: bytes) -> tuple[bytes, int]:
    with tempfile.TemporaryDirectory() as d:
        paths = []
        for name, data in (("ours", ours), ("base", base), ("theirs", theirs)):
            p = os.path.join(d, name)
            with open(p, "wb") as f:
                f.write(data)
            paths.append(p)
        r = subprocess.run(
            ["git", "merge-file", "-p", "-L", "ours (Marp)", "-L", "base", "-L", "upstream", *paths],
            capture_output=True,
        )
        # merge-file exits with the number of conflicts (capped at 127), negative on error.
        return r.stdout, max(r.returncode, 0)


def plan(base: str):
    """Yield one decision per upstream-changed path, without touching the tree."""
    ours_renames: dict[str, str] = {}
    for line in git("diff", "--name-status", "-M", base, "HEAD").splitlines():
        parts = line.split("\t")
        if parts[0].startswith("R"):
            ours_renames[parts[1]] = parts[2]
    head_files = set(git("ls-files").splitlines())

    def our_path(p: str) -> str:
        if p in ours_renames:
            return ours_renames[p]
        if p in head_files:
            return p
        return rebrand_path(p)

    for line in git("diff", "--name-status", "-M", base, UPSTREAM).splitlines():
        parts = line.split("\t")
        status = parts[0][0]
        old_path, new_path = (parts[1], parts[2]) if status == "R" else (parts[1], parts[1])
        target, source = our_path(new_path), our_path(old_path)
        base_raw = blob(base, old_path) if status != "A" else None
        theirs_raw = blob(UPSTREAM, new_path) if status != "D" else None
        ours_raw = blob("HEAD", source)
        d = {"upstream_path": new_path, "path": target, "source": source}

        if status == "D":
            if ours_raw is None:
                continue
            if ours_raw in (base_raw, brand(old_path, base_raw)):
                yield {**d, "kind": "deleted"}
            else:
                yield {**d, "kind": "special", "why": "upstream deleted it, Marp changed it"}
            continue

        theirs_b = brand(new_path, theirs_raw)
        if ours_raw is None:
            if status in ("A", "R"):
                yield {**d, "kind": "added", "data": theirs_b}
            else:
                yield {**d, "kind": "special", "why": "upstream changed it, Marp deleted it"}
            continue

        base_b = brand(old_path, base_raw) if base_raw is not None else b""
        customized = ours_raw not in (base_raw, base_b)
        if as_text(ours_raw) is None or as_text(theirs_b) is None:
            if not customized:
                yield {**d, "kind": "clean", "customized": False, "data": theirs_b}
            else:
                yield {**d, "kind": "special", "why": "binary changed on both sides"}
            continue

        merged, conflicts = merge3(base_b, ours_raw, theirs_b)
        yield {
            **d,
            "kind": "conflict" if conflicts else "clean",
            "customized": customized,
            "hunks": conflicts,
            "data": merged,
        }


def commits_by_file(base: str) -> tuple[list[dict], dict[str, list[str]]]:
    out = git("log", "--no-merges", "--format=\x01%h\x02%ci\x02%s", "--name-only", f"{base}..{UPSTREAM}")
    commits, by_file = [], defaultdict(list)
    for chunk in out.split("\x01")[1:]:
        head, *files = chunk.strip().split("\n")
        sha, date, subject = head.split("\x02")
        files = [f for f in files if f]
        commits.append({"sha": sha, "date": date[:16], "subject": subject, "files": files})
        for f in files:
            by_file[f].append(sha)
    return commits, by_file


def triage(json_path: str | None) -> None:
    base = git("merge-base", "HEAD", UPSTREAM).strip()
    commits, by_file = commits_by_file(base)
    decisions = [{k: v for k, v in d.items() if k != "data"} for d in plan(base)]
    conflict_up = {d["upstream_path"] for d in decisions if d["kind"] == "conflict"}
    custom_up = {d["upstream_path"] for d in decisions if d.get("customized") and d["kind"] == "clean"}

    for c in commits:
        files = set(c["files"])
        c["risk"] = "conflict" if files & conflict_up else "touches-marp" if files & custom_up else ""
        c["watch"] = sorted({k for f in files for k, rx in WATCH.items() if rx.search(f)})

    print(f"base {base[:10]}  ->  {UPSTREAM} {git('rev-parse', '--short', UPSTREAM).strip()}")
    if commits:
        print(f"{len(commits)} commits, {commits[-1]['date']} .. {commits[0]['date']}")
    counts = defaultdict(int)
    for d in decisions:
        counts[d["kind"]] += 1
    print("files:", dict(counts), f"(clean but Marp-customized: {len(custom_up)})")

    groups = defaultdict(list)
    for c in commits:
        m = re.match(r"(\w+)(?:\(([^)]*)\))?!?:", c["subject"])
        groups[m.group(1) if m else "other"].append(c)
    for kind in ("feat", "fix", "perf", "refactor", "docs", "test", "chore", "other"):
        rest = [c for c in groups.pop(kind, [])]
        if not rest:
            continue
        print(f"\n## {kind} ({len(rest)})")
        for c in rest:
            tag = {"conflict": "[CONFLICT] ", "touches-marp": "[marp] "}.get(c["risk"], "")
            watch = f"  <{','.join(c['watch'])}>" if c["watch"] else ""
            print(f"  {c['sha']} {tag}{c['subject']}{watch}")
    for kind, rest in groups.items():
        print(f"\n## {kind} ({len(rest)})")
        for c in rest:
            print(f"  {c['sha']} {c['subject']}")

    print("\n## Predicted conflicts (hunks, upstream commits)")
    for d in sorted((d for d in decisions if d["kind"] == "conflict"), key=lambda d: -d["hunks"]):
        print(f"  {d['hunks']:>3}  {d['path']}  {' '.join(by_file.get(d['upstream_path'], []))}")
    print("\n## Need a decision")
    for d in decisions:
        if d["kind"] == "special":
            print(f"  {d['path']}: {d['why']}")
    print("\n## Upstream deletes (Marp left them untouched)")
    for d in decisions:
        if d["kind"] == "deleted":
            print(f"  {d['path']}")

    if json_path:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({"base": base, "commits": commits, "decisions": decisions}, f, indent=1)


def apply() -> None:
    if not os.path.exists(os.path.join(git("rev-parse", "--git-dir").strip(), "MERGE_HEAD")):
        raise SystemExit("Start with: git merge --no-commit --no-ff -s ours " + UPSTREAM)
    base = git("merge-base", "HEAD", UPSTREAM).strip()
    report = defaultdict(list)
    for d in plan(base):
        kind, path = d["kind"], d["path"]
        if kind == "deleted":
            os.remove(path)
        elif kind in ("added", "clean", "conflict"):
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "wb") as f:
                f.write(d["data"])
            if d["source"] != path and os.path.exists(d["source"]):
                os.remove(d["source"])
        report[kind].append(path if kind != "special" else f"{path}: {d['why']}")
    print({k: len(v) for k, v in report.items()})
    for k in ("conflict", "special", "deleted"):
        for p in report.get(k, []):
            print(f"  {k}: {p}")


def resolve(path: str, idx: int, choice: str) -> None:
    s = open(path, encoding="utf-8", newline="").read()
    hunks = list(CONFLICT_RE.finditer(s))
    m = hunks[idx]
    ours, theirs = m.group(1), m.group(2)
    rep = {"ours": ours, "theirs": theirs, "both": ours + theirs}.get(choice)
    if rep is None:
        if not choice.startswith("file:"):
            raise SystemExit("choice: ours|theirs|both|file:PATH")
        rep = open(choice[5:], encoding="utf-8").read()
    open(path, "w", encoding="utf-8", newline="").write(s[: m.start()] + rep + s[m.end() :])
    print(f"{path}: hunk {idx} -> {choice.split(':')[0]}, {len(hunks) - 1} left")


KEPT_T3 = re.compile(
    r"t3\.codes|t3 ?chat|T3 Tools|t3_write_pty|highlights_t3|-t3\.\d|t3-mobile|t3-fork|"
    r"pingdotgg/t3code|\[T3 Code\]",
    re.I,
)


def leaks() -> None:
    diff = git("diff", "--cached", "HEAD", "-U0")
    path, found = None, 0
    for line in diff.splitlines():
        if line.startswith("+++ "):
            path = line[6:]
        elif line.startswith("+") and re.search(r"t3", line, re.I) and not KEPT_T3.search(line):
            if path in SKIP_FILES or any(p in (path or "") for p in NO_REBRAND_PARTS):
                continue
            if re.search(r"(?<![A-Za-z0-9])[tT]3(?![0-9])|[a-z_]T3[A-Z_]|_t3[A-Z]", line):
                print(f"{path}: {line[1:].strip()[:160]}")
                found += 1
    print(f"{found} possible leak(s)")


if __name__ == "__main__":
    cmd, *rest = sys.argv[1:] or ["triage"]
    if cmd == "triage":
        triage(rest[1] if rest[:1] == ["--json"] else None)
    elif cmd == "apply":
        apply()
    elif cmd == "resolve":
        resolve(rest[0], int(rest[1]), rest[2])
    elif cmd == "leaks":
        leaks()
    else:
        raise SystemExit(__doc__)
