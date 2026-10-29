# Тексты интерфейса

Интерфейс — на английском. Тон: спокойный, прямой, дружелюбный коллега-инженер. Без маркетинга, без восклицаний, без «Oops».

## Правила

1. **Коротко.** Заголовок до 5 слов. Пояснение — одно предложение, максимум два.
2. **Sentence case везде.** «Create pull request», не «Create Pull Request». Без капса.
3. **Кнопка = глагол + объект.** «Add project», «Restore checkpoint», «Approve command». Никогда «OK», «Yes», «Confirm», «Submit». В подтверждении удаления кнопка повторяет действие: «Delete thread».
4. **Ошибка говорит, что случилось и что делать.** «Claude isn't signed in. Run `claude login` or sign in from Settings → Providers.» — не «Authentication error». «Can't reach MacBook Pro. Check that it's awake and online.» — не «Network error».
5. **Последствия прямо.** «This deletes the worktree and 3 uncommitted changes. You can't undo this.»
6. **Статус — конкретное слово.** «Working», «Approval needed», «Done», «Failed», не «Processing…», «Loading…».
7. **Время и числа.** Относительное до суток: «now», «5m», «3h»; дальше «Oct 4», в прошлом году «Oct 4, 2025». Длительности: «12s», «2m 14s», «1h 3m». Тысячи — `1,234`. Диффы — `+12 −3` (настоящий минус U+2212).
8. **Код — в моно.** Команды, пути, ветки, переменные окружения, клавиши в тексте — в `code`.
9. **Имена провайдеров и моделей** — как у вендора: Codex, Claude, Cursor, Grok, OpenCode, Antigravity; «Claude Sonnet 4.5», не «claude-sonnet-4-5» в интерфейсе (id — только в моно-мете).
10. **Без эмодзи** в интерфейсе. Без «please» в ошибках.

## Подсказка (i)

Формат: **Название** + 1–2 предложения: что это и что изменится.

| Термин           | Подсказка                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Worktree mode    | Runs the thread in its own git worktree, so changes never touch your current checkout.             |
| Full access      | The agent can run any command and edit any file without asking. Use it only in projects you trust. |
| Checkpoint       | A snapshot taken after every turn. Restore it to undo everything the agent changed since.          |
| Context window   | How much of the model's memory this thread uses. Near the limit, older messages get summarized.    |
| Reasoning effort | How long the model thinks before answering. Higher is slower and more thorough.                    |

## Шаблоны

| Ситуация              | Заголовок                    | Текст                                                           | Кнопка           |
| --------------------- | ---------------------------- | --------------------------------------------------------------- | ---------------- |
| Нет проектов          | Add your first project       | Point Marp at a folder or clone a repository.                   | Add project      |
| Нет провайдера        | Connect an agent             | Sign in to Codex, Claude or another provider to start.          | Connect provider |
| Поиск без результата  | —                            | No threads match “auth”.                                        | —                |
| Фильтр без результата | Nothing matches              | Try removing a filter.                                          | Clear filters    |
| Всё прочитано         | All caught up                | New pull requests will show up here.                            | —                |
| Удаление              | Delete “fix-auth-flow”?      | Removes the thread and its 14 checkpoints. You can't undo this. | Delete thread    |
| Тост успеха           | Pull request created         | #482 · fix-auth-flow → main                                     | Open             |
| Тост с отменой        | Thread archived              | —                                                               | Undo             |
| Тост ошибки           | Couldn't push                | Remote rejected the push: branch is protected.                  | Retry            |
| Фоновый тред закончил | “Refactor auth” is done      | 6 files changed                                                 | Open             |
| Нет соединения        | Reconnecting to MacBook Pro… | Messages will send when it's back.                              | Retry now        |
