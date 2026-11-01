---
name: marp-upstream-sync
description: Use when the user asks what is new in upstream T3 Code (pingdotgg/t3code), what can be merged, or asks to merge/sync upstream into Marp («что с T3 нового», «что слить», «влей апстрим»). Gives a dry-run triage (new commits grouped, predicted conflicts, which Marp customizations they touch) and a merge procedure that applies the T3→Marp rename so only real edits conflict, keeps Marp's design and features intact, and verifies the result.
argument-hint: "[triage | merge]"
---

# Marp ← upstream T3 Code

Marp — форк T3 Code с полным ребрендингом (T3 → Marp в именах, путях, пакетах `@marp/*`) и своим дизайном. Обычный `git merge upstream/main` даёт сотни ложных конфликтов из‑за переименований. Скрипты здесь ребрендят base и upstream перед 3‑way merge, поэтому конфликтуют только реальные правки.

Скрипты: `.agents/skills/marp-upstream-sync/scripts/` (`sync.py`, `rebrand.py`). Ниже `S=python .agents/skills/marp-upstream-sync/scripts/sync.py`, запуск из корня репо в Git Bash.

Справочник решений: [references/marp-owned.md](references/marp-owned.md) — что у нас своё, что удалено нарочно, что остаётся T3, известные падения тестов. Прочитайте перед разрешением конфликтов.

## 1. Разведка (только чтение, ~1–2 мин)

```bash
git status --short            # дерево должно быть чистым
git fetch upstream            # remote upstream = github.com/pingdotgg/t3code
$S triage --json "$TEMP/triage.json"
```

Отчёт:

- шапка: base → tip, число коммитов, даты, сколько файлов clean / conflict / added / deleted;
- коммиты по типам (`feat`, `fix`, `perf`…). Метки: `[CONFLICT]` — коммит трогает файл, который даст конфликт; `[marp]` — сольётся сам, но в файле есть наши правки, его стоит глянуть после merge; `<deps|contracts|migrations|model-facing>` — зависимости, wire‑контракты, миграции БД, текст для моделей (evals);
- «Predicted conflicts»: файл, число hunk'ов, upstream‑коммиты. Прогноз точный: это тот же `merge-file`, что и в `apply`;
- «Need a decision»: upstream правил файл, который мы удалили (или наоборот).

Пользователю отвечайте кратко: что нового по смыслу (фичи, важные фиксы, perf), где будут конфликты и что из нашего они задевают, затем спросите, сливать ли. Не перечисляйте 150 фиксов.

## 2. Merge

```bash
git merge --no-commit --no-ff -s ours upstream/main   # заготовка merge-коммита, дерево = наше
$S apply                                             # пишет результат 3-way merge в дерево
```

`apply` печатает список конфликтов. Маркеры: `<<<<<<< ours (Marp)` / `=======` / `>>>>>>> upstream`. Разрешение:

```bash
grep -c '^<<<<<<< ' FILE                       # сколько hunk'ов
$S resolve FILE 0 ours|theirs|both|file:PATH    # индекс всегда 0: следующий становится первым
```

Для своего текста запишите его во временный файл и передайте `file:PATH`. Не правьте через heredoc код с `\n` в строках: Git Bash портит экранирование, используйте Edit или Python с файлом.

### Как решать конфликт

Сначала поймите намерение upstream: `git diff $(git merge-base HEAD upstream/main) upstream/main -- <upstream-путь>` (upstream‑путь ещё с `t3` в имени, если файл переименован). Затем:

1. **Наш дизайн/поведение — главное.** Берите `ours` и вручную переносите суть upstream‑правки: новый пропс, фикс логики, a11y, RTL, IME и т. п. Типичные случаи — в справочнике.
2. **Upstream вынес логику в функцию** (например, `deriveResumableRunId`): берите `theirs` и сохраните наши добавки рядом.
3. **Upstream переименовал переменную**, а у нас другое имя после ребрендинга: оставьте наше имя, проверьте `grep` по файлу.
4. **Чисто upstream‑файлы** (evals, тесты, серверная логика без наших правок) → `theirs`.
5. **Upstream чинит то, чего у нас нет** (мы убрали этот UI) → `ours`, отметьте в отчёте.

Пустой `ours`‑блок при большом `theirs` обычно означает, что мы этот кусок удалили или переписали в другом месте. Найдите наш аналог, а не вставляйте upstream‑блок.

## 3. Проверка

По порядку, только затронутые пакеты (без repo‑wide `vp check`):

```bash
grep -rln '^<<<<<<< \|^>>>>>>> upstream' $(git diff --name-only) ; git add -A
$S leaks                                   # T3-имена в новых строках; чинить и добавлять правило в rebrand.py
vp i                                       # если менялись package.json / pnpm-lock.yaml
vp fmt && vp lint                          # чаще всего: неиспользуемые импорты после ours
vp run knip:check
(cd apps/web && vp run typecheck)          # и так для каждого пакета, где менялись файлы:
                                           # git diff --cached --name-only HEAD | cut -d/ -f1-2 | sort | uniq -c
vp test run <тесты рядом с конфликтными файлами и с [marp]-коммитами>
```

Падение теста сверяйте со списком известных падений в справочнике. Чтобы доказать, что падение старое, сравните с кодом до merge: временный `git worktree add --detach ../Marp-check HEAD` рядом с репо, затем удалите его.

`[marp]`‑файлы, которые слились без конфликта, всё равно просмотрите глазами: `git diff HEAD -- FILE`. Именно там тихо ломается наше: upstream может вернуть удалённый нами элемент или поменять поведение, на которое опирается наш UI.

## 4. Коммит и сборка

```bash
git commit -F - <<'EOF'
Merge upstream/main into <ветка>

Brings in N upstream commits (<главное по смыслу>).

Conflicts kept the Marp design and carried over upstream's intent:
- <по строке на перенесённую правку>

Co-Authored-By: <модель>
EOF
```

Pre‑commit хук на Windows падает с «The command line is too long» при сотнях файлов. Сами проверки к этому моменту уже пройдены (п. 3). `--no-verify` — только с явного разрешения пользователя в этой сессии; спросите и объясните почему.

После коммита по запросу соберите установщик (в фоне):

```bash
RUSTUP_TOOLCHAIN=stable node_modules/.bin/vp run dist:desktop:win:x64   # → release/Marp-<version>-x64.exe
```

Не пушить и не открывать PR без просьбы. В конце сообщите: коммит, что перенесено вручную, что осталось нашим и почему, какие тесты падают (старые или новые), что проверить руками в клиенте.

## Поддержка скриптов

- Новая T3‑строка просочилась (`leaks`) → добавьте правило в `RULES` или защиту в `PROTECT` в `rebrand.py` и закоммитьте вместе с merge.
- Файлы, где T3‑имена нужны по смыслу (легаси‑префиксы веток), — в `SKIP_FILES`.
- Другой upstream‑ref: `MARP_UPSTREAM_REF=upstream/release $S triage`.
