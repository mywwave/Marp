"""T3 Code -> Marp renaming, reconstructed from the rebrand commit a62e99d91a.

rebrand(text) is applied to upstream versions of files so a 3-way merge sees only real edits.
"""
import re

# Things that stay T3 on purpose (external names, hosts, ABI symbols).
PROTECT = [
    r"https://github\.com/pingdotgg/t3code",
    r"\[T3 Code\]",
    r"[A-Za-z0-9.-]*\bt3\.codes\b",
    r"T3 Chat",
    r"t3 chat",
    r"[A-Za-z]*T3Chat[A-Za-z]*",
    r"[A-Za-z]*t3Chat[A-Za-z]*",
    r"T3CHAT[A-Z_]*",
    r"T3_CHAT[A-Z_]*",
    r"t3-chat[a-z-]*",
    r"T3 Tools",
    r"t3_write_pty",
    r"highlights_t3",
    r"-t3\.\d+",
    r"t3-mobile",
    r"t3-fork",
    # base64 blobs; real paths and imports break on '-', '.', '_' long before this.
    r"(?=(?:[A-Za-z+/=]*\d){4})[A-Za-z0-9+/=]{60,}",
    r"\x1b\[\d+mt3code",
]
# Legacy T3 branch prefixes Marp still recognises in users' repositories.
SKIP_FILES = {"packages/shared/src/git.ts", "packages/shared/src/git.test.ts"}
PROTECT_RE = re.compile("|".join(f"(?:{p})" for p in PROTECT))

RULES = [
    (r"@t3tools/", "@marp/"),
    (r"t3tools/t3code", "marp/marp"),
    (r"github\.repository == 'pingdotgg/t3code'", "github.repository == 'mywwave/Marp'"),
    (r"pingdotgg/t3code", "pingdotgg/marp"),
    (r"t3tools", "marp"),
    (r"t3coderelay", "marpcoderelay"),
    (r"T3CODE_", "MARP_"),
    (r"T3CODE", "MARP"),
    (r"T3_CODE_", "MARP_"),
    (r"t3_code_instructions", "marp_instructions"),
    (r"t3_code", "marp"),
    (r"t3-code", "marp"),
    (r"T3 Code", "Marp"),
    # Native module packages (expo.modules.t3terminal) and the dev global.
    (
        r"(?<![A-Za-z0-9_])t3(?=(?:terminal|reviewdiff|widgetexpiry|highlights|nativecontrols"
        r"|composereditor|agentnotifications|env|dev)\b)",
        "marp",
    ),
    (r"T3Code", "Marp"),
    (r"t3Code", "marp"),
    (r"t3code", "marp"),
    (r"__t3(?=[A-Z])", "__marp"),
    (r"(?<![A-Za-z0-9_])T3_", "MARP_"),
    (r"(?<![A-Za-z0-9_])t3_", "marp_"),
    # Uppercase T3 as a word or a camelCase part (useT3Foo, T3Composer).
    (r"(?<![A-Z0-9_])T3(?![0-9a-z])", "Marp"),
    # Lowercase t3 as a word or the head of a camelCase name (.t3, t3-xai, t3Home).
    (r"(?<![A-Za-z0-9_])t3(?![0-9a-z_])", "marp"),
]
RULES_RE = [(re.compile(a), b) for a, b in RULES]


def rebrand(text: str) -> str:
    saved: list[str] = []

    def hide(match: re.Match[str]) -> str:
        saved.append(match.group(0))
        return f"\x00{len(saved) - 1}\x00"

    text = PROTECT_RE.sub(hide, text)
    for pattern, replacement in RULES_RE:
        text = pattern.sub(replacement, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: saved[int(m.group(1))], text)


def rebrand_path(path: str) -> str:
    return rebrand(path)
