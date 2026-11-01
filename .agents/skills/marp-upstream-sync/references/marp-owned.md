# Что у Marp своё — и как это не сломать при merge

Сверено на merge `18080ccb37` (2026‑11‑01, upstream до `da216062c9`). Полный и актуальный список наших правок даёт `sync.py triage`: метки `[marp]` и `[CONFLICT]`. Здесь — решения, которые повторяются.

## Наши зоны (по умолчанию `ours` + перенос сути upstream)

| Зона                | Файлы                                                                                                                       | Что у нас иначе                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Дизайн‑система      | `apps/web/src/index.css`, токены, шрифты                                                                                    | Тёплая тема, Onest + JetBrains Mono, без рамок. Скилл `marp-design-system`                                                                                        |
| Композер            | `chat/ComposerControl.tsx`, `ComposerControlsBar.tsx`, `ComposerModelEffort.tsx`, `ProviderModelPicker.tsx`, `TraitsPicker` | Пилюли Marp, свои отступы `px-2`/`px-2.5`, без upstream‑цветов текста. Единый контрол model+effort из upstream принят (#28057), effort — приглушённый текст       |
| Лента треда         | `chat/TimelineWorkEvents.tsx`, `TimelineAssistantRows.tsx`, `TimelineUserMessageRow.tsx`, `ChatMarkdown.tsx`                | Cursor‑подобные карточки событий, fade стримящегося чанка только в последнем блоке, цитаты кода                                                                   |
| Подписи команд      | `packages/client-runtime/src/work-log/commandLabel.ts`, `eventPresentation.ts`                                              | Читаемые подписи (`Ran tests`, `Committed fix: …`) вместо сырых команд; общие для web и mobile                                                                    |
| Фоновые задачи      | `chat/ThreadActivityBanners.tsx`, `client-runtime/src/work-log/liveCards.ts` (`summarizeBackgroundTasks`)                   | Свой баннер на готовых подписях, без upstream `presentPendingBackgroundWork` и моноширинных сырых команд                                                          |
| Вопросы агента      | `chat/ComposerPendingUserInputPanel.tsx`                                                                                    | Свои кнопки‑опции (номер, `rounded-field`, `bg-muted`). Переносить: `dir={textDirection(...)}`, a11y, клавиши                                                     |
| Сайдбар             | `sidebar/SidebarThreadRow.tsx`, `Sidebar.tsx`, `Sidebar.logic.ts`, `SidebarCollapsedRail.tsx`                               | Своя строка треда (статус‑индикатор, meta‑слот, `rowActions`), меню папки. Upstream‑варианты `card` / `folder` у нас удалены — их блоки не возвращать             |
| Настройки           | `settings/*Panel.tsx`, `settingsSearch.ts`, `SettingsScopeSentence.tsx`                                                     | Своя раскладка; «Proactive panels» живут в `/settings/source-control` со `scope: "device"`; идентификация окружения — только переключатель pill/none, без artwork |
| Проектные настройки | `settings/ProjectSettingsPanel.tsx`                                                                                         | Раскладка Marp поверх upstream `useProjectGroupUpdate`, строки Pin/Archive                                                                                        |
| Сервер              | `orchestration-v2/Orchestrator.ts`, `ProviderTurnStartService`                                                              | Свои команды (`thread.status.update`), `marp_status_update` MCP, контекст хода `[delivery.context, sideChatContext, restartNote, workspacePreamble]`              |

## Удалено нарочно — не возвращать

- `apps/web/src/components/ComposerContextPermissions.tsx`
- `apps/web/src/components/chat/ChangedFilesTree.tsx`, `ChangedFilesCard` и его тесты в `MessagesTimeline.browser.test.tsx`
- `apps/web/src/lib/turnDiffTree.ts`
- Upstream‑варианты строки сайдбара `card` / `folder` / `folder-multiline` (вместе с `WorkingDuration`)

Если upstream их правит, `triage` покажет «upstream changed it, Marp deleted it». Решение — не восстанавливать файл, но проверить, нет ли в правке фикса, который нужен нашему аналогу.

## Что остаётся T3 (защищено в `rebrand.py`)

`*.t3.codes`, T3 Chat (`T3Chat*`, `t3-chat`, `T3CHAT`), «T3 Tools Inc.», `t3_write_pty` (WASM ABI), `highlights_t3`, ссылка `[T3 Code](https://github.com/pingdotgg/t3code)` в описании форка, версии зависимостей `-t3.N`, `fork/t3-mobile`, `t3-fork.json`, легаси‑префиксы веток в `packages/shared/src/git.ts` (+ тест). Глобальные ключи `__t3Foo` → `__marpFoo`.

## Повторяющиеся приёмы разрешения

- **Перенос по смыслу:** upstream добавил строку в блок, который мы переписали (IME‑guard `if (event.nativeEvent.isComposing || event.keyCode === 229) return;`, `dir=`, класс `has-[[data-composer-label]]:gap-1.5`) → `ours` + вставить эту строку в наш аналог.
- **Импорты:** конфликт в импортах после `ours` часто требует `both` (нужны и наши, и новые upstream‑символы) — дальше `vp lint` и typecheck покажут лишнее и недостающее.
- **Тесты:** в `*.test.tsx` обычно `both` по импортам, а тело — как в upstream, если тест новый.
- **Переименование переменной upstream при нашем другом имени** (evals `t3Tools` vs наш `marp`): блок `theirs`, имя наше.
- **Заголовки настроек:** текст берите из upstream (он совпадает с подписью строки в `SettingsPanels.tsx`), маршрут и `scope` — наши.

## Известные падения тестов (Windows, до merge)

Не из‑за merge; если падает что‑то ещё — разбирайтесь.

- `apps/server/src/vcs/GitVcsDriverCore.test.ts`: structured errors (SSH: `remote_unreachable` вместо `authentication_failed` / `host_key_unverified`), пути `C:/` vs `C:\` в worktree, `git init` в review diff / nested commit.
- `scripts/check-changed.test.ts`: три теста «compares against … upstream/main …» (`git init` в песочнице).
- `apps/server/src/orchestration-v2/ProviderTurnStartService.test.ts`: 4 теста (падают и на чистом upstream).
- `ChatMarkdown` browser test «still rejects unsafe schemes».

## Окружение

- `.gitattributes` форсит `eol=lf`, `core.autocrlf=true`: наша сторона читается через `git show HEAD:path`, а не с диска.
- Remote `upstream` → `https://github.com/pingdotgg/t3code`. Наш `origin` — `mywwave/Marp`.
- Pre‑commit хук (`vite.config.ts` → `staged`): fmt, lint, knip. На сотнях файлов падает лимит командной строки Windows; см. SKILL.md, п. 4.
