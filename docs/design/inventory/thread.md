# Тред — инвентаризация

Источник правды для эталона `docs/design/thread.html` (новый раздел; «было» — текущий код). Собрано по коду 29 окт 2026.

**Что это за раздел.** Экран работы с агентом: шапка треда, лента (сообщения, работа агента, одобрения, вопросы, планы, чекпоинты, ошибки), композер и правая панель (дифф, терминал, превью, файлы, PR, устройства). Префикс RPR — адаптив правой панели (в исходной инвентаризации RS).

**Как читать строку.** `- **ID** что есть в продукте — `файл:строка` ⟶ статус`. Статус: `✓ #экран` (в скобках — что поменяли), `＋ новое: что`, `✗ убрано: почему и как сделать то же самое`. Пути — от `apps/web/src/`, если не указано иное.

Repo: `D:\VSProjects\Marp` (branch `design/marp-design-system`). Web app only (`apps/web/src`). Paths are repo-relative. Shortcuts are the defaults from `packages/shared/src/keybindings.ts` (`mod` = Cmd/Ctrl).

Structure: `ThreadRouteView` picks draft/server `ChatView` (`apps/web/src/components/ThreadRouteView.tsx:108-149`). `ChatView` renders `<header data-chat-header>` with only the breadcrumb (`ChatHeader`), the panel toggles, then `ThreadFindCanvas` → `ChatBannerLane` → `ThreadTimeline`/`MessagesTimeline` → composer (`apps/web/src/components/ChatView.tsx:3192-3300`). In this fork **git actions, open-in, branch toolbar and scripts are not in the header**. They live in the **Thread details card** (`ThreadDetailsPanel`).

## Header & toolbar

Files: `components/chat/ChatHeader.tsx`, `components/WorkspaceBreadcrumb.tsx`, `components/WorkspacePageHeader.tsx`, `components/chat/PanelLayoutControls.tsx`, `components/threadActionMenu.logic.ts`, `hooks/useThreadActionMenu.ts`, `components/ChatView.tsx`.

- **HD-01** Header bar: fixed topbar height. On Electron it is a drag region and reserves an inset for the window controls. Its padding animates with panel open/close (`motion-safe:transition-[padding-left]`) — `apps/web/src/components/ChatView.tsx:3207` ⟶ ✓ #working (шапка 48; отступ при открытии панели больше не анимируется — без layout на каждом переключении)
- **HD-02** Breadcrumb `<nav aria-label="Thread breadcrumb">` built from `WorkspaceBreadcrumbItem/Separator` ("/") — `apps/web/src/components/chat/ChatHeader.tsx:284` ⟶ ✓ #working (шапка)
- **HD-03** Project crumb: favicon plus project name (or "No project" for a scratch thread). It is a button with tooltip "New thread in {project}" and starts a new thread in that project — `apps/web/src/components/chat/ChatHeader.tsx:84`, `:293-309` ⟶ ✓ #working (шапка)
- **HD-04** Parent-thread crumb (subagent/fork child): button "Open parent thread: {title}". The title collapses to "..." when space runs out (measured by a ResizeObserver) — `apps/web/src/components/chat/ChatHeader.tsx:316-345`, `:110-140` ⟶ ✓ #working (шапка)
- **HD-05** Thread title (server thread): an `h2` inside a button "Thread actions for {title}". Single click opens the thread actions menu after a 500 ms delay. A chevron appears on hover/focus. Tooltip shows the full title — `apps/web/src/components/chat/ChatHeader.tsx:372-399`, `:70` ⟶ ✓ #working (шапка)
- **HD-06** Rename title inline: double-click the title (needs operate scope) to get `input aria-label="Thread title"`. Enter commits, Escape cancels, blur commits. An empty title shows the toast "Thread title cannot be empty". Failure shows "Failed to rename thread" — `apps/web/src/components/chat/ChatHeader.tsx:352-371`, `:177-190`, `:265-275` ⟶ ✓ #working (шапка)
- **HD-07** Draft/local thread title: plain `h2` with tooltip, no menu — `apps/web/src/components/chat/ChatHeader.tsx:400-413` ⟶ ✓ #working (шапка)
- **HD-08** "From {origin}" info badge with tooltip "Started by an agent on {origin} through a linked environment." — `apps/web/src/components/chat/ChatHeader.tsx:414-423` ⟶ ✓ #working (шапка)
- **HD-09** Right-click on the header opens the thread actions menu (server thread). On a draft it opens a native context menu with only "Project settings" — `apps/web/src/components/chat/ChatHeader.tsx:245-264` ⟶ ✓ #working (шапка)
- **HD-10** Thread actions menu items, in order. "New thread on {branch}", "Pin thread"/"Unpin thread", "Settle thread"/"Un-settle thread", "Snooze" ▸ presets "{label} ({when})" and "Custom…" (or "Wake thread"), — "Rename thread", "Regenerate title"/"Regenerating…", "Mark unread", "Share with guest", "Filter by {project}", "Turn into project", "Auto-settle behavior" ▸ Enabled/Disabled, "Copy" ▸ Path/Branch/Thread/Thread ID, "Project settings", "Archive thread", "Delete" — `apps/web/src/components/threadActionMenu.logic.ts:120-245` ⟶ ✓ #working (шапка)
- **HD-11** Draft actions menu: "Copy" ▸ Path/Branch, "Project settings", "Discard draft" — `apps/web/src/components/threadActionMenu.logic.ts:44-62` ⟶ ✓ #working (шапка)
- **HD-12** Guest share indicator next to the breadcrumb, shown while a guest link exists (see GS-03) — `apps/web/src/components/chat/ChatHeader.tsx:426` ⟶ ✓ #working (шапка)
- **HD-13** Toggle "Toggle thread details" (SquareMenu icon, `mod+shift+B`). Opens as a popover when the card has no inline slot — `apps/web/src/components/chat/PanelLayoutControls.tsx:52-79` ⟶ ✓ #working (шапка)
- **HD-14** Toggle "Toggle terminal drawer" (`mod+J`). Disabled with the tooltip "Terminal drawer is unavailable" when there is no project — `apps/web/src/components/chat/PanelLayoutControls.tsx:86-107` ⟶ ✓ #working (шапка)
- **HD-15** Toggle "Toggle right panel" (`mod+alt+B`). Disabled tooltip "Right panel is unavailable" — `apps/web/src/components/chat/PanelLayoutControls.tsx:108-130`, `:47` ⟶ ✓ #working (шапка)
- **HD-16** "Maximize panel"/"Restore panel size" toggle. Shows only while the right panel is open and fades in and out — `apps/web/src/components/chat/PanelLayoutControls.tsx:135-160`, `:180-212` ⟶ ✓ #working (шапка)
- **HD-17** Panel toggles render in up to three places depending on layout: the window titlebar root, inside the header, or `ThreadPanelHeaderControl` when the inline right panel owns the titlebar — `apps/web/src/components/ChatView.tsx:3162-3180`, `:3226-3228` ⟶ ✓ #working (шапка)
- **HD-18** Thread shortcuts (no visible button). `mod+F` find, `mod+shift+S` settle, `mod+shift+P` pin, `mod+shift+C` copy reference, `mod+shift+[`/`]` previous/next thread, `mod+1..9` jump to thread (desktop), `mod+O` open in favorite editor, `mod+Z` thread undo (sidebar) — `packages/shared/src/keybindings.ts:205-222`, `apps/web/src/components/chat/useThreadLifecycle.tsx:568-590` ⟶ ✓ #working (шапка)
- **HD-19** Workspace file drag-over shows the overlay "Drop files to attach" across the canvas — `apps/web/src/components/chat/TimelineOverlays.tsx:5-16`, `apps/web/src/components/ChatView.tsx:3267` ⟶ ✓ #working (шапка)

## Thread details

Files: `components/chat/ThreadDetailsPanel.tsx`, `ThreadDetailsCard.tsx`, `threadDetailsItems.ts`, `ThreadDetailsItemsMenu.tsx`, `ThreadDetailsSection.tsx`, `ThreadDetailsUsage.tsx`, `ThreadDetailsPrRows.tsx`, `ThreadDetailsPrRow.tsx`, `ThreadServersPanel.tsx`, `ThreadAutomationsPanel.tsx`, `ThreadRelationshipsControl.tsx`, `ThreadLineageWorkflowRow.tsx`, `components/BranchToolbar*.tsx`, `components/BranchPicker.tsx`, `components/GitActionsControl.tsx`(+`.logic.ts`), `components/chat/OpenInPicker.tsx`, `components/ProjectScriptsControl.tsx`.

- **TD-01** Thread details card: a glass card floating in the canvas (inline mode) or a popover from HD-13, labeled "Thread details" for F6 workspace focus — `apps/web/src/components/chat/ThreadDetailsCard.tsx:38-150` ⟶ ✓ #details
- **TD-02** Density adapts to the available height: full → compact → essential. Compact hides Environment. Essential also hides Open in. Servers, Automations and Lineage show only at full density — `apps/web/src/components/chat/ThreadDetailsCard.tsx:50-105`, `apps/web/src/components/chat/ThreadDetailsPanel.tsx:146-156` ⟶ ✓ #details (карточка деталей открывается из шапки; ключевые действия всегда в шапке, не зависят от высоты)
- **TD-03** Configurable items (stored in client settings). "Environment and worktree", "Open in editor", "Project scripts", "Branch and pull request", "Git actions", "Changes", "Servers", "Automations", "Lineage", "Usage" (off by default) — `apps/web/src/components/chat/threadDetailsItems.ts:4-15` ⟶ ✓ #details
- **TD-04** Right-click the card to open the menu "Show in thread details" with checkboxes and "Reset to default" — `apps/web/src/components/chat/ThreadDetailsPanel.tsx:127-143`, `apps/web/src/components/chat/ThreadDetailsItemsMenu.tsx:21-41` ⟶ ✓ #details
- **TD-05** "Choose what to show" button, shown only when every section is hidden, so the user can refill an emptied card — `apps/web/src/components/chat/ThreadDetailsPanel.tsx:257-273` ⟶ ✓ #details
- **TD-06** Hidden section headings "Workspace" and "Version Control" (aria-only) — `apps/web/src/components/chat/ThreadDetailsPanel.tsx:160-166`, `:208-213` ⟶ ✓ #details
- **TD-07** Environment row: "Run on" machine picker ("Auto balance", "Add to another machine") with `mod+shift+H` — `apps/web/src/components/BranchToolbarEnvironmentSelector.tsx:57-165`, `apps/web/src/components/BranchToolbar.tsx:329-350` ⟶ ✓ #details
- **TD-08** Workspace mode picker: "New worktree" / "Current checkout" / "Local checkout" / "Current worktree" / "Previous worktree ({branch})". Uses `mod+shift+X`, plus `mod+shift+L` for the previous worktree. Note "Each model starts in its own worktree." for multi-model sends — `apps/web/src/components/BranchToolbarEnvModeSelector.tsx:99-156`, `apps/web/src/components/BranchToolbar.logic.ts:92-152` ⟶ ✓ #details
- **TD-09** Run-context row accessible label "Run context: {env}, {workspace}". Right-click offers "Copy full path", with toasts "Path copied" / "Failed to copy path" — `apps/web/src/components/BranchToolbar.tsx:112-134`, `:275-306` ⟶ ✓ #details
- **TD-10** Open in editor: "Open in {editor}" primary plus a "Choose editor" menu ("Open in…", editor list with `mod+O` shortcut, "No installed editors found"). Announces "Opened in {editor}" — `apps/web/src/components/chat/OpenInPicker.tsx:287-418` ⟶ ✓ #working (Open in — иконка в шапке + меню редакторов; дубль в карточке деталей)
- **TD-11** Project scripts: "Run {script}" primary, "Script actions" menu, "Add project script", "From t3.json" group, per-script "Edit {name}". Disabled tooltip "Pair this client again with permission to run terminal commands." — `apps/web/src/components/ProjectScriptsControl.tsx:159-447` ⟶ ✓ #details
- **TD-12** Branch row: ref label "From {branch}" / "From {branch} (remote)" / "Select ref". Picker "Search refs...", "No refs found.", "Loading refs...", "Showing N of M refs", create-branch item, "Start worktree from remote" toggle. Uses `mod+shift+G` — `apps/web/src/components/BranchToolbar.logic.ts:214-220`, `apps/web/src/components/BranchPicker.tsx:155-229`, `apps/web/src/components/BranchToolbarBranchSelector.tsx:319-323` ⟶ ✓ #working (ветка — чип в шапке; дубль в карточке деталей)
- **TD-13** Branch right-click "Copy branch name". Toasts "Branch name copied", "Failed to switch ref.", "Failed to create and switch ref.", "Action unavailable — This connection cannot change the thread's branch." — `apps/web/src/components/BranchToolbarBranchSelector.tsx:332-473` ⟶ ✓ #details
- **TD-14** Pull request rows under the branch, with "Show N more"/"Show less" — `apps/web/src/components/chat/ThreadDetailsPrRows.tsx:134` ⟶ ✓ #details
- **TD-15** PR row actions: "Resolve" (tooltip "Check the branch out and resolve the conflicts in a new thread"), "Ready", "Fix" ("Fix the failing checks in a new thread"), "Merge" with a confirm dialog (Cancel/Merge). Watching eye button "Stop watching #N", tooltip "Watching: the agent wakes when checks finish, someone comments, or the branch conflicts. Click to stop." `mod+shift+K` copies the PR number — `apps/web/src/components/chat/ThreadDetailsPrRow.tsx:323-506` ⟶ ✓ #details
- **TD-16** Git actions split button: the quick action label is derived from state. Possible labels: "Commit", "Commit & push", "Commit, push & {PR}", "Push", "Push & create {PR}", "Pull", "Sync ref", "Create {PR}", "Publish repository" — `apps/web/src/components/GitActionsControl.logic.ts:139-325` ⟶ ✓ #working (Git-действия — сплит-кнопка в шапке, secondary; дубль в карточке деталей)
- **TD-17** Disabled quick action shows the reason in a hover popover, for example "Worktree is clean. Make changes before committing.", "No local commits to push.", "Branch is up to date. No action needed.", "Detached HEAD: …", "Add an \"origin\" remote…", "This connection cannot change source control." — `apps/web/src/components/GitActionsControl.tsx:225-272`, `:1110-1112`, `:1530-1560` ⟶ ✓ #working (причина недоступности — в тултипе и в меню, не только во всплывашке)
- **TD-18** Git progress replaces the button: status plus streamed hook output ("Running {hook}...", "Pulling latest changes...") and an elapsed timer. An inline success state follows — `apps/web/src/components/GitActionsControl.tsx:1507-1528`, `:1582-1588`, `packages/client-runtime/src/state/vcsAction.ts:365` ⟶ ✓ #details
- **TD-19** "Git action options" chevron menu lists every action, plus "Publish repository...". Warnings "Detached HEAD: create and check out a branch to enable push and {PR} actions." and "Behind upstream. Pull/rebase first." — `apps/web/src/components/GitActionsControl.tsx:1438-1470`, `:1595-1620` ⟶ ✓ #details
- **TD-20** Not a repo: "Initialize Git" / "Initializing..." row. Failure toast "Git initialization failed" — `apps/web/src/components/GitActionsControl.tsx:1478-1496`, `:1402` ⟶ ✓ #details
- **TD-21** Commit dialog "Commit changes", description "Review and confirm your commit. Leave the message blank to auto-generate one." Shows Branch (with a "Default branch" warning), a file list with checkboxes in edit mode, a message field "Leave empty to auto-generate", and buttons Cancel / "Commit on new branch" / "Commit" — `apps/web/src/components/GitActionsControl.tsx:275-277`, `:1662-1827` ⟶ ✓ #details
- **TD-22** Default-branch confirm, for example "Commit & push to default ref?". Buttons Abort / "Check out feature branch & continue" / "Commit & push to {branch}" — `apps/web/src/components/GitActionsControl.logic.ts:342-374`, `apps/web/src/components/GitActionsControl.tsx:1853-1884` ⟶ ✓ #details
- **TD-23** Publish repository dialog with Provider, "Setup Required", Repository, Visibility (Private "Only invited people" / Public "Anyone on the web"), Advanced (remote "origin", Protocol SSH/HTTPS). Buttons Next / "Publishing..." / Done. Result "Repository published"/"Repository created" — `apps/web/src/components/GitActionsControl.tsx:582-911` ⟶ ✓ #details
- **TD-24** Git toasts: "Action failed", "Created {PR}", "Pull failed", "Pulled"/"Already up to date" ("Updated {ref} from {upstream}"), "Unable to open file", "Editor opening is unavailable." — `apps/web/src/components/GitActionsControl.tsx:1221-1382` ⟶ ✓ #details
- **TD-25** "Changes" row with +N/−N diff totals. Opens the diff surface in the right panel — `apps/web/src/components/GitActionsControl.tsx:1625-1650` ⟶ ✓ #working (+N −M в шапке рядом с Git; клик открывает дифф)
- **TD-26** Servers section "Servers": localhost ports with open-in-browser/preview and "Stop server" ("Stop localhost:{port}"). Errors "Unable to open in browser", "Unable to open preview", "Could not stop server" — `apps/web/src/components/chat/ThreadServersPanel.tsx:74-158` ⟶ ✓ #details
- **TD-27** Automations section "Automations": "Manage scheduled tasks", per task "Edit automation", "Run now", Pause/Resume toggle. Errors "Could not update automation", "Could not run automation" — `apps/web/src/components/chat/ThreadAutomationsPanel.tsx:106-233` ⟶ ✓ #details
- **TD-28** Lineage section, titled "Lineage" or "Lineage · N running". Relationship labels Subagent / Parent agent / Fork / Parent thread / Context transfer. Groups "Previous agents". Remote child tooltip "Runs on {env}. Connect to it to open the thread there." "More thread actions" ▸ "Disconnect agent session" — `apps/web/src/components/chat/ThreadRelationshipsControl.tsx:109-584` ⟶ ✓ #details
- **TD-29** Lineage row actions: "Merge back to {parent}" (disabled "Complete a run in this fork before merging it back"), "Stop subagent". Toasts "Could not stop subagent", "Could not stop workflow". Unavailable row "This related thread is unavailable" — `apps/web/src/components/chat/ThreadRelationshipsControl.tsx:530-849` ⟶ ✓ #details
- **TD-30** Workflow lineage row: members "Open {title} chat", "Stop entire workflow", expand/collapse phases "{phase} phase, {status}", "Failed" status — `apps/web/src/components/chat/ThreadLineageWorkflowRow.tsx:76-204` ⟶ ✓ #details
- **TD-31** Usage section "Usage": "Limits" meters with pace labels "Ahead of pace"/"On pace"/"Under pace", and a "Context" meter ("{label}: N% left") — `apps/web/src/components/chat/ThreadDetailsUsage.tsx:26-177` ⟶ ✓ #details

## Empty & new thread

Files: `components/NoActiveThreadState.tsx`, `components/NoProjectsHero.tsx`, `components/HostedEmptyState.tsx`, `routes/_chat.index.tsx`, `components/chat/DraftHeroHeadline.tsx`, `DraftHeroProjectHeading.tsx`, `DraftProjectName.tsx`, `TriageDraftHero.tsx`, `components/chat/MessagesTimeline.tsx`, `components/promptLinks/*`, `components/ThreadRouteView.tsx`.

- **EM-01** No active thread: header "No active thread" (web only), empty state "Pick a thread to continue" / "Select an existing thread or create a new one to get started." — `apps/web/src/components/NoActiveThreadState.tsx:16-27`, `apps/web/src/components/ChatView.tsx:3094` ⟶ ✓ #new
- **EM-02** No projects hero "What should we work on?". Body "Add a project to start your first thread." or "Add a project, or start without one.". Buttons "Add project", "Start without a project" — `apps/web/src/components/NoProjectsHero.tsx:31-49` ⟶ ✓ #new
- **EM-03** Hosted (app.t3.codes) with no environment: "No computer connected" / "This computer is off", "Your agents run on your computer. Start T3 Code there first.", "Open Environments", "Sign in"/"Signed in", "Add pairing link", "Run on your computer:", "Or download the desktop app" — `apps/web/src/components/HostedEmptyState.tsx:39-159`, `apps/web/src/routes/_chat.index.tsx:28-30` ⟶ ✓ #new
- **EM-04** Draft hero headline "What should we build in {project}" with an inline project combobox ("Search projects...", "No matching projects.", "Add project", "Choose a project", "No project") — `apps/web/src/components/chat/DraftHeroProjectHeading.tsx:42-50`, `apps/web/src/components/chat/DraftHeroHeadline.tsx:161-306` ⟶ ✓ #new
- **EM-05** Draft hero fallbacks "What should we work on?" / "Add a project to start", and the link "or start without a project" (tooltip `mod+alt+N`) — `apps/web/src/components/chat/DraftHeroHeadline.tsx:346-396` ⟶ ✓ #new
- **EM-06** Triage hero "What went wrong?" with a machine label "This machine" plus "v{version}". Tooltip "The agent reads T3 Code's logs and source here, and asks before it applies a fix or posts anything." Link "or run" / "Copied" copies a CLI command — `apps/web/src/components/chat/TriageDraftHero.tsx:15-54` ⟶ ✓ #new
- **EM-07** Empty server thread timeline "Send a message to start the conversation." (hidden while the draft hero shows) — `apps/web/src/components/chat/MessagesTimeline.tsx:1263-1278` ⟶ ✓ #new
- **EM-08** Missing thread: if the thread is confirmed missing the route silently navigates home. A draft without a session redirects to "/" — `apps/web/src/components/ThreadRouteView.tsx:92-139` ⟶ ✓ #new
- **EM-09** Thread link prompt (`?prompt=` on a thread URL) puts the text into the composer, then strips the URL param. Bad link toast "Could not open the linked prompt" — `apps/web/src/components/promptLinks/ThreadLinkPrompt.tsx:28-46`, `apps/web/src/routes/_chat.tsx:34` ⟶ ✓ #new
- **EM-10** Hosted prompt link landing "Open this prompt" / "It opens as a draft. Nothing runs until you press Send." Shows details (Repository, Model, PR) and the warning "This prompt had hidden characters, it may be malicious". Buttons "Open in desktop app"/"Open in app", "Continue here", "Get T3 Code", checkbox "Remember my choice" — `apps/web/src/components/promptLinks/HostedPromptLinkLanding.tsx:37-159` ⟶ ✓ #new
- **EM-11** New-thread link view states: "Opening the link...", "This link is open" / "Open it again", "You don't have {repo}" / "Use without project", clone toasts "Cloning {repo}" and "Clone failed", "Check out {owner}/{name}#{n}?" / "Check out", model fallback notice — `apps/web/src/components/promptLinks/NewThreadLinkView.tsx:163-420` ⟶ ✓ #new
- **EM-12** Draft threads: the timeline shows local `draftTimelineEntries` for non-server threads. Discard through the HD-11 menu — `apps/web/src/components/ChatView.tsx:3298` ⟶ ✓ #new

## User messages

Files: `components/chat/TimelineUserMessageRow.tsx`, `UserMessageContextChips.tsx`, `TerminalContextInlineChip.tsx`, `SkillInlineText.tsx`, `components/ThreadContextChip.tsx`, `GuestMessageAttachments.tsx`, `SnapShotAttachmentDetails.tsx`, `ExpandedImageDialog.tsx`, `ZoomableImage.tsx`, `WorkflowOpeningBlock.tsx`, `MessageCopyButton.tsx`, `QueuedRunsControl.tsx`.

- **UM-01** User bubble (right-aligned, max 80%). Long text collapses with "Show full message"/"Show less" — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:815` ⟶ ✓ #working
- **UM-02** Hover footer: timestamp (tooltip has the full date), "Copy message", "Copy prompt link", "Edit from here" (Undo icon, disabled while working or reverting) — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:655-750`, `apps/web/src/components/chat/MessageCopyButton.tsx:16` ⟶ ✓ #working (действия под сообщением видны при наведении и всегда на тач-устройствах)
- **UM-03** Steer marker (Redo icon), tooltip "Steered the active turn" or "Originally queued, then promoted to steer the active turn" — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:700-717` ⟶ ✓ #working
- **UM-04** Attribution line "Sent by T3 Code" for system-authored prompts — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:450-456` ⟶ ✓ #working
- **UM-05** Agent-sent message (from another thread) shows an "Open thread" link — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:650-652` ⟶ ✓ #working
- **UM-06** Automation-sent message: heading "Automation", a folded header showing the task title, expand to read the body, "Open automation" link to Settings › Scheduled tasks — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:163-225` ⟶ ✓ #working
- **UM-07** Failure status pill showing the raw projected status (for example `failed`, `cancelled`) under the bubble — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:273-289` ⟶ ✓ #failed (вместо сырого `failed`/`cancelled` — пилюля «Failed» / «Stopped»)
- **UM-08** Image attachments: thumbnails "Preview {name}" open the expanded dialog (Prev/Next media "Previous media"/"Next media", "Close {media} preview", zoom/pan help text, "Image unavailable. The file may have been moved or deleted.") — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:520`, `apps/web/src/components/chat/ExpandedImageDialog.tsx:144-269`, `apps/web/src/components/chat/ZoomableImage.tsx:160-161` ⟶ ✓ #working
- **UM-09** File attachments "Preview {file}" / "Download {file}". Audio and video play inline. Download failure toast "Could not download {name}" — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:590-603`, `apps/web/src/components/ChatView.tsx:1466` ⟶ ✓ #working
- **UM-10** Snap-shot (window capture) attachment details: "Captured window", accessibility badge "Accessibility data"/"No accessibility data", popover text. Expanded view toggles "Show screenshot"/"Show accessibility JSON"/"Show extracted text" — `apps/web/src/components/chat/SnapShotAttachmentDetails.tsx:86-163` ⟶ ✓ #working
- **UM-11** Context chips: file "Preview {path}", preview annotation crop ("Screenshot unavailable", "Preview annotation"), browser element "Browser element, {label}", review comment / PR context, expired chip tooltip "This context is no longer available." — `apps/web/src/components/chat/UserMessageContextChips.tsx:76-493` ⟶ ✓ #working
- **UM-12** Terminal excerpt chip "Lines a–b"/"Line n", popover "Captured terminal output". Expired: "Terminal context expired. Remove and re-add {label}…" — `apps/web/src/components/chat/TerminalContextInlineChip.tsx:25-59` ⟶ ✓ #working
- **UM-13** Skill chip "Skill {name}". Popover shows the description (or "No description is available for this skill.") and "View instructions" — `apps/web/src/components/chat/SkillInlineText.tsx:97-105` ⟶ ✓ #working
- **UM-14** Thread context chip "Thread, {title}". Tooltips "Open thread" / "Thread no longer available" / "On another machine, so this machine's agent can't read it…" — `apps/web/src/components/ThreadContextChip.tsx:28-46` ⟶ ✓ #working
- **UM-15** Workflow opening block "Workflow started: {title}", with phase sections, member links "Open {member}", and "Show full script"/"Show less" — `apps/web/src/components/chat/WorkflowOpeningBlock.tsx:60-232` ⟶ ✓ #working
- **UM-16** Guest-authored message: guest name heading above the bubble, plus guest attachments — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:458-462`, `apps/web/src/components/chat/GuestMessageAttachments.tsx:43-89` ⟶ ✓ #working
- **UM-17** Queued messages, in the timeline footer above the composer. Region "{N} queued messages". Per item: "Send now" (tooltip "Start a turn with this message" / "Send into the current turn" / "Skip compaction and send this message", `mod+shift+Enter`), "Edit queued message" ("Edit in the composer", `alt+↑`), "Saving", "Cancel", "Remove from queue". "Show all N queued"/"Show fewer". Automation items have "Open thread"/"Open automation" — `apps/web/src/components/chat/QueuedRunsControl.tsx:230-512`, `apps/web/src/components/ChatView.tsx:2921`, `:3050` ⟶ ✓ #working
- **UM-18** Optimistic (not yet acknowledged) user messages render immediately — `apps/web/src/components/chat/optimisticUserMessages.ts` ⟶ ✓ #working

## Assistant messages & markdown

Files: `components/chat/TimelineAssistantRows.tsx`, `components/ChatMarkdown.tsx`, `components/chat/Markdown*.tsx`, `ChatMarkdownMedia.tsx`, `MermaidDiagram.tsx`, `MathTypeset.tsx`, `externalLinkContextMenu.ts`, `AssistantCitation*.tsx`, `AssistantSelectionToolbar.tsx`, `citationProcedure.ts`, `ChangedFilesTree.tsx`, `DiffStatLabel.tsx`, `HtmlRenderFrame.tsx`, `HtmlRenderDialog.tsx`, `McpAppFrame.tsx`, `components/CommandBlock.tsx`.

- **AM-01** Assistant row: sr-only heading "T3 Code", then markdown body and a meta footer. Streaming text renders progressively — `apps/web/src/components/chat/TimelineAssistantRows.tsx:26-75` ⟶ ✓ #done
- **AM-02** Meta footer (on hover; always visible on touch): raw status text when not completed, "Copy message", "Fork from this response" (GitFork icon pulses while busy, hidden in the guest view), timestamp with tooltip — `apps/web/src/components/chat/TimelineAssistantRows.tsx:100-200` ⟶ ✓ #done (вместо сырого статуса — слово; иконка Fork не пульсирует, во время работы — спиннер)
- **AM-03** Turn changed-files card "N changed files" with diff stat "{a} additions, {d} deletions", "Expand all folders"/"Collapse all folders", "Open diff" (tooltip "Open the full diff"), file tree with context menu — `apps/web/src/components/chat/ChangedFilesTree.tsx:63-116`, `apps/web/src/components/chat/TimelineAssistantRows.tsx:155-200` ⟶ ✓ #done
- **AM-04** Headings get anchor ids, with in-document fragment navigation and RTL/LTR auto direction — `apps/web/src/components/ChatMarkdown.tsx:388-397`, `:952-957` ⟶ ✓ #done
- **AM-05** Code block: language highlighting (falls back to plain text with a console warning), "Copy code"/"Copied", "Wrap lines"/"Disable line wrap", "Run in terminal" for shell blocks — `apps/web/src/components/chat/MarkdownCodeBlock.tsx:167-257`, `:345` ⟶ ✓ #done
- **AM-06** Mermaid block: rendered diagram with "Show code"/"Show diagram", "Expand diagram", errors "The diagram could not be rendered." / "The diagram renderer failed to load." and "Retry" — `apps/web/src/components/chat/MarkdownMermaidCodeBlock.tsx:31-51`, `apps/web/src/components/chat/MermaidDiagram.tsx:250-308` ⟶ ✓ #done
- **AM-07** Math (`$…$`, `$$…$$`, math code fences): "Inline equation"/"Display equation", scrollable when wide — `apps/web/src/components/chat/MarkdownMath.tsx:30-46`, `apps/web/src/components/ChatMarkdown.tsx:1656` ⟶ ✓ #done
- **AM-08** Tables: "Copy table" menu with "Copy as Markdown" / "Copy as CSV" — `apps/web/src/components/chat/MarkdownTable.tsx:23-65` ⟶ ✓ #done
- **AM-09** GitHub alerts as callouts: Note / Tip / Important / Warning / Caution — `apps/web/src/components/ChatMarkdown.tsx:348-372` ⟶ ✓ #done
- **AM-10** Task lists: checkbox "Toggle task" — `apps/web/src/components/ChatMarkdown.tsx:1014-1033` ⟶ ✓ #done
- **AM-11** `<details>` disclosures — `apps/web/src/components/chat/MarkdownDetails.tsx`, `apps/web/src/components/ChatMarkdown.tsx:1543` ⟶ ✓ #done
- **AM-12** External links: favicon plus host chip. Context menu "Open in integrated browser", "Open in system browser", "Copy Link", "Link to thread"/"Unlink from thread" (for PR URLs). Errors "Unable to open link in browser", "Unable to link pull request" — `apps/web/src/components/chat/MarkdownExternalLink.tsx:21-102`, `apps/web/src/components/chat/externalLinkContextMenu.ts:27-44`, `apps/web/src/components/ChatMarkdown.tsx:712`, `:1247` ⟶ ✓ #done
- **AM-13** File links (paths in text): chip that opens in the editor. "File options for {label}" menu: "Preview media", "Open in {editor}", "Open in integrated browser", Reveal, copy "Relative path"/"Full path". Toasts "Unable to open file", "Unable to reveal file", "{Path} copied" — `apps/web/src/components/chat/MarkdownFileLink.tsx:90-364` ⟶ ✓ #done
- **AM-14** Thread links render as a thread chip (title or "Untitled thread") — `apps/web/src/components/chat/MarkdownThreadLink.tsx:37` ⟶ ✓ #done
- **AM-15** Images/video/audio in markdown: "Loading image" skeleton, zoomable preview "Preview {name}", fallbacks "Image unavailable"/"Video unavailable"/"Audio unavailable", "Media unavailable" toast with a file-not-found description — `apps/web/src/components/chat/ChatMarkdownMedia.tsx:91-252`, `apps/web/src/components/ChatMarkdown.tsx:547-570`, `:1355-1537` ⟶ ✓ #done
- **AM-16** Assistant citations: select text to get the floating toolbar "Cite" ("Cite selection in composer"; too long: "Shorten selection"). The comment editor has "Add an optional comment...", Save/Cancel, Enter/`mod+Enter`/Shift+Enter — `apps/web/src/components/chat/AssistantSelectionToolbar.tsx:195-209`, `apps/web/src/components/chat/AssistantCitationCommentEditor.tsx:49-97` ⟶ ✓ #done
- **AM-17** Citation chip in markdown "Quoted assistant text: {label}" with "Go to source" and "Edit citation comment"/"Add comment to citation". Errors "Could not open the cited response", "The quoted text has changed", "Could not load the cited response", "The cited response is unavailable" — `apps/web/src/components/chat/AssistantCitationChip.tsx:130-208`, `apps/web/src/components/chat/AssistantCitationSource.tsx:197-211`, `apps/web/src/components/chat/citationProcedure.ts:41-72` ⟶ ✓ #done
- **AM-18** Codex only: inline directives rendered as markdown, and artifact template cards "{name} template" / "Use template" — `apps/web/src/components/ChatMarkdown.tsx:271-311`, `:613`, `apps/web/src/components/chat/MessagesTimeline.logic.ts:16` ⟶ ✓ #done
- **AM-19** HTML render row (agent `html_render`): sandboxed frame with "Open full screen". The dialog has Zoom out/Reset zoom/Zoom in/Close. Toast "Page unavailable — Reconnect to the environment and try again." — `apps/web/src/components/chat/HtmlRenderFrame.tsx:75-113`, `apps/web/src/components/chat/HtmlRenderDialog.tsx:30-69` ⟶ ✓ #done
- **AM-20** MCP app row: embedded app frame with "Show app", "Exit full screen", and native `confirm` prompts "Allow {server} to run {tool}?", "Send this message from {server}?", "Save {names} from {server}?" — `apps/web/src/components/chat/McpAppFrame.tsx:278-468` ⟶ ✓ #done
- **AM-21** Copy command button "Copy command" for inline command blocks — `apps/web/src/components/CommandBlock.tsx:37` ⟶ ✓ #done

## Work log & tool calls

Files: `components/chat/MessagesTimeline.tsx`(+`.logic.ts`), `TimelineWorkGroupRows.tsx`, `TimelineWorkEntryRow.tsx`(+`.logic.ts`), `WorkLog.tsx`, `TimelineToolActivityIcon.tsx`, `V2ItemInspector.tsx`, `CommandOutputPanel.tsx`, `ShellCommandBlock.tsx`, `V2LifecycleRow.tsx`, `TimelineV2EventRow.tsx`, `packages/client-runtime/src/work-log/presentation.ts`, `packages/shared/src/toolActivity.ts`, `packages/shared/src/t3McpToolPresentation.ts`, `packages/client-runtime/src/t3ToolSummary.ts`.

- **WL-01** Turn fold "Worked for {duration}" / "Worked" (or "You stopped after {duration}" / "You stopped this response"), with a chevron and timestamp. Expanding it loads the hidden work, showing the "Loading work history" skeleton — `apps/web/src/components/chat/MessagesTimeline.logic.ts:1169-1175`, `apps/web/src/components/chat/MessagesTimeline.tsx:1629-1662` ⟶ ✓ #working (журнал работы)
- **WL-02** Steer segment fold "Continued for {duration}" / "Continued" — `apps/web/src/components/chat/MessagesTimeline.logic.ts:1206` ⟶ ✓ #working (журнал работы)
- **WL-03** Attempt fold "Superseded attempt" (retried run) — `apps/web/src/components/chat/MessagesTimeline.logic.ts:1736`, `apps/web/src/components/chat/MessagesTimeline.tsx:1663-1693` ⟶ ✓ #working (журнал работы)
- **WL-04** Fold load failure "Couldn't load work. Click to retry." — `apps/web/src/components/chat/MessagesTimeline.tsx:1602` ⟶ ✓ #working (журнал работы)
- **WL-05** Work group header (collapsed groups) summaries: "Read N files", "Changed N files", "Ran N commands", "Searched the web N times", "Searched code N times", "Created N threads", "Used browser N times", "Used device controls N times", "Used N tools", "Received N updates", "Linked/Unlinked/Watching/Stopped watching N pull requests", "Checked linked pull requests" — `packages/client-runtime/src/work-log/presentation.ts:422-455`, `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:582-631` ⟶ ✓ #working (журнал работы)
- **WL-06** Subagent group summary "Kicked off N subagents" / "Ran N subagents" — `packages/client-runtime/src/state/subagentDisplay.ts:19` ⟶ ✓ #working (журнал работы)
- **WL-07** Expanded tool group: scrollable region "Tool calls" (max 18rem/50dvh) with scroll fades — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:124-272` ⟶ ✓ #working (журнал работы)
- **WL-08** Entry rows per tool kind. Read ("Read {path}", "Read file"), edit ("Changed files"), command ("Running"/"Ran"/"Failed"/"Declined"/"Stopped" plus the command text), search ("Searched {query} in {target}", "Searched files {glob}"), web ("Web search"/tool title), MCP/dynamic tool (title from the tool presentation table, for example "Read a T3 thread", "Delegated a child task"), each with a tool icon and hover timestamp — `apps/web/src/components/chat/MessagesTimeline.logic.ts:97-261`, `packages/shared/src/toolActivity.ts:369-454`, `packages/shared/src/t3McpToolPresentation.ts:123-345` ⟶ ✓ #working (журнал работы)
- **WL-09** Live (in-progress) entry row: the current tool label, with the latest thought line (up to 4 lines) above it. Click expands the group — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:487-580` ⟶ ✓ #working (журнал работы)
- **WL-10** Expanded entry: command block (shell-highlighted), streamed output panel that follows the live edge, "exit {code}" in red on non-zero exit — `apps/web/src/components/chat/V2ItemInspector.tsx:200-270`, `apps/web/src/components/chat/CommandOutputPanel.tsx:26-84`, `apps/web/src/components/chat/ShellCommandBlock.tsx:48` ⟶ ✓ #failed (вместо «exit {code}» — «Failed · exit 1»)
- **WL-11** File change details: relative path, +/− stats, "Open diff" button (opens the diff in the right panel), raw diff text on failure, list of operations ("{op} {old} → {path}") — `apps/web/src/components/chat/V2ItemInspector.tsx:281-327` ⟶ ✓ #working (журнал работы)
- **WL-12** Search details: file-search pattern and results, web-search patterns and results (links titled by result title/URL, or "Search result") — `apps/web/src/components/chat/V2ItemInspector.tsx:328-380` ⟶ ✓ #working (журнал работы)
- **WL-13** Dynamic/MCP tool details: structured JSON input/output ("Tool input …"), images "Tool output image", "Output is no longer available." when pruned — `apps/web/src/components/chat/V2ItemInspector.tsx:136-159`, `:381`, `apps/web/src/components/chat/TimelineWorkEntryRow.logic.ts:115` ⟶ ✓ #working (журнал работы)
- **WL-14** Viewed-image entries show the image inline when expanded — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:495-507` ⟶ ✓ #working (журнал работы)
- **WL-15** Todo list items as text with ✓ / ◉ / ○ markers — `apps/web/src/components/chat/V2ItemInspector.tsx:405-414` ⟶ ✓ #working (журнал работы)
- **WL-16** Notification / system notice / error details as structured values — `apps/web/src/components/chat/V2ItemInspector.tsx:402-404` ⟶ ✓ #working (журнал работы)
- **WL-17** Failed tool: X glyph or red alert icon. Accessible label "…, tool call failed". Severe failures use destructive row styling. Runtime warnings use a warning tint — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:263-276`, `:396-402` ⟶ ✓ #working (журнал работы)
- **WL-18** Created-thread / subagent entries with inline actions "Open chat" ("Open {title}") and "Open subagent" — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:451-482` ⟶ ✓ #working (журнал работы)
- **WL-19** Thread-created lifecycle row "{title}" / "Created thread" with "Open chat" — `apps/web/src/components/chat/V2LifecycleRow.tsx:100-132` ⟶ ✓ #working (журнал работы)
- **WL-20** Subagent row/group: avatar, title, status dot with labels Queued / Running / Waiting / "Idle · resumable" / Completed / Failed / Stopped, elapsed time. Group collapsible "N subagents" — `apps/web/src/components/chat/V2LifecycleRow.tsx:147-172`, `apps/web/src/components/chat/TimelineV2EventRow.tsx:57-160` ⟶ ✓ #working (журнал работы)
- **WL-21** Claude skill invocation entries show the skill args as their output — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:296-302` ⟶ ✓ #working (журнал работы)
- **WL-22** Worktree setup card in the timeline: "Setting up worktree…", "Worktree ready", "Worktree ready, setup script failed", "Worktree setup failed", "Worktree setup cancelled". Actions "Details", "Open terminal", "Work locally", "Cancel" — `apps/web/src/components/chat/WorktreeSetupCard.tsx:115-387`, `apps/web/src/components/chat/MessagesTimeline.tsx:1505-1520` ⟶ ✓ #working (журнал работы)
- **WL-23** Background setup chip next to Working, labeled "Background setup" with a spinner. Popover shows the setup card — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:311-343` ⟶ ✓ #working (журнал работы)
- **WL-24** Workspace preparation failure row: message plus "Retry" — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:207-262` ⟶ ✓ #working (журнал работы)
- **WL-25** Agent secret request card: input with placeholder, "Save securely", "Decline" — `apps/web/src/components/chat/SecretRequestCard.tsx:131-163` ⟶ ✓ #working (журнал работы)
- **WL-26** Agent link request card "Link {target} to this environment" / "Link a machine to this environment". Buttons "Decline", "Review link…"/"Choose machine…". Note "Only a session that manages access here can answer this." The dialog takes an address ("https://machine.tailnet.ts.net"), "Pairing code", Back/Cancel/"Link"/"Continue"/"Use this link" — `apps/web/src/components/chat/LinkRequestCard.tsx:121-481` ⟶ ✓ #working (журнал работы)

## Reasoning

Files: `components/chat/TimelineWorkGroupRows.tsx`, `TimelineWorkEntryRow.tsx`, `MessagesTimeline.logic.ts`, `V2ItemInspector.tsx`.

- **RS-01** Live "Thinking" row (brain icon, shimmer) while a turn runs with no other activity row. Becomes a toggle when a failed tool group is attached — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:360-381`, `apps/web/src/components/chat/MessagesTimeline.logic.ts:2096-2130` ⟶ ✓ #working (Thinking без шиммера: иконка + «Thinking · 8s»)
- **RS-02** Reasoning entry: inline markdown preview prefixed "Thinking"/"Thought", clamped. Expanding it shows the full trace — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:284-289`, `:411-428`, `:118-170` ⟶ ✓ #working
- **RS-03** Reasoning label fallback "Thought" when there is no detail — `apps/web/src/components/chat/MessagesTimeline.logic.ts:97`, `:242` ⟶ ✓ #working
- **RS-04** Thought line as status above the live tool row (`remarkThoughtPreview`) — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:518-545` ⟶ ✓ #working
- **RS-05** Inspector reasoning text block — `apps/web/src/components/chat/V2ItemInspector.tsx:248` ⟶ ✓ #working

## Approvals & questions

Files: `components/chat/TimelinePendingApprovalRow.tsx`, `ComposerPendingApprovalActions.tsx`, `packages/client-runtime/src/state/threadRequests.ts`, `components/chat/ThreadActivityBanners.tsx`, `threadActivityAnnouncement.ts`, `TimelineWorkEntryRow.tsx`.

- **AP-01** Inline approval row, labeled by kind: "Command approval" (detail "Command"), "File change approval" ("File change"), "File read approval" ("File to read"), "App permission approval", "App access approval". The detail text is in `<code>`, followed by the app name and reason — `apps/web/src/components/chat/TimelinePendingApprovalRow.tsx:15-73` ⟶ ✓ #needs-you
- **AP-02** Status "Waiting for approval" (shield icon) followed by inline actions "Decline" · "Approve" and a "More" menu ("Always allow this session", "Cancel"). Options can carry a warning icon and tooltip. Actions disable while responding or without operate scope — `apps/web/src/components/chat/TimelinePendingApprovalRow.tsx:74-97`, `apps/web/src/components/chat/ComposerPendingApprovalActions.tsx:26-110` ⟶ ✓ #needs-you
- **AP-03** Orphaned approval: "Provider process is gone. Interrupt or restart the run to respond." — `apps/web/src/components/chat/TimelinePendingApprovalRow.tsx:98-101` ⟶ ✓ #needs-you
- **AP-04** "Why am I being asked this?" hover popover explaining a full-access override — `apps/web/src/components/chat/TimelinePendingApprovalRow.tsx:102-116`, `packages/client-runtime/src/state/threadRequests.ts:60` ⟶ ✓ #needs-you
- **AP-05** Approvals render in place of their work entry (inside groups and live rows), and pending approvals not tied to an entry render in the list footer — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:206`, `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:500`, `apps/web/src/components/chat/MessagesTimeline.tsx:1236-1250` ⟶ ✓ #needs-you
- **AP-06** Answering user-input questions happens in the composer panel (excluded). The timeline shows the question as the entry heading, with an answer preview and expandable Q&A history (including attachment answers) — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:277-293`, `:564-624` ⟶ ✓ #needs-you
- **AP-07** Inspector for `user_input_request` lists the question plus "• option" lines — `apps/web/src/components/chat/V2ItemInspector.tsx:391-401` ⟶ ✓ #needs-you
- **AP-08** Subagent attention item in the timeline footer: "{child titles}" links plus "Open approval"/"Open question". The scroll-to-end summary reads "Subagent waiting" — `apps/web/src/components/chat/ThreadActivityBanners.tsx:31-66`, `apps/web/src/components/ChatView.tsx:3005-3010` ⟶ ✓ #needs-you
- **AP-09** Screen-reader announcements "Needs approval" / "Needs your input" — `apps/web/src/components/chat/threadActivityAnnouncement.ts:8-9`, `apps/web/src/components/chat/MessagesTimeline.tsx:1073` ⟶ ✓ #needs-you

## Plans

Files: `components/chat/ProposedPlanCard.tsx`, `TimelineAssistantRows.tsx`, `useProposedPlanSend.ts`, `ComposerPlanFollowUpBanner.tsx`, `ComposerPrimaryActions.tsx`.

- **PL-01** Proposed plan card: "Plan" badge, title from the plan's first heading (or "Proposed plan"), markdown body with "Expand plan"/"Collapse plan" — `apps/web/src/components/chat/ProposedPlanCard.tsx:76`, `:160-230`, `apps/web/src/components/chat/TimelineAssistantRows.tsx:217-235` ⟶ ✓ #plan
- **PL-02** "Plan actions" menu: "Copy to clipboard"/"Copied!", "Download as markdown", "Save to workspace" — `apps/web/src/components/chat/ProposedPlanCard.tsx:172-185` ⟶ ✓ #plan
- **PL-03** Save dialog "Save plan to workspace" (path field, Cancel/Save). Toasts "Plan saved to workspace", "Could not save plan", "Workspace path is unavailable", "Enter a workspace path", "Could not copy plan" — `apps/web/src/components/chat/ProposedPlanCard.tsx:70-153`, `:245-300` ⟶ ✓ #plan
- **PL-04** Implement/refine controls live in the composer, not on the card: "Refine", "Implement", "Implementation actions" menu, placeholder "Add feedback to refine the plan, or leave this blank to implement it". Error "Could not start implementation thread" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:213-237`, `apps/web/src/components/chat/ChatComposer.tsx:3373`, `apps/web/src/components/chat/useProposedPlanSend.ts:385` ⟶ ✓ #plan (кнопки «Implement plan» и «Refine» — на карточке плана; в композере остаётся поле для уточнений)

## Checkpoints & history

Files: `components/chat/TimelineUserMessageRow.tsx`, `ChatOverlayHosts.tsx`, `useTimelineRewind.ts`, `TimelineAssistantRows.tsx`, `V2LifecycleRow.tsx`, `MessagesTimeline.tsx`.

- **CP-01** "Edit from here" on a user message opens the confirm dialog "Edit from here?": "Rewind chat to before this message. Your prompt and attachments return to the composer. "Revert files too" also undoes your own edits." Buttons Cancel / "Revert files too" (destructive outline) / "Revert and keep changes" — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:722-750`, `apps/web/src/components/chat/ChatOverlayHosts.tsx:186-228` ⟶ ✓ #done (＋ разделитель «Checkpoint» после каждого хода с View diff / Restore; «Edit from here» остаётся у сообщения)
- **CP-02** Revert errors, shown in the thread error banner: "This provider does not support reverting conversation history. Start a new thread instead.", "Interrupt the current turn before reverting checkpoints.", "Failed to revert thread state." — `apps/web/src/components/chat/useTimelineRewind.ts:112-124`, `apps/web/src/components/chat/chatViewSend.ts:250` ⟶ ✓ #done
- **CP-03** "Fork from this response" on assistant messages. Errors "Failed to fork this response.", "The fork was created, but its thread data did not reach this client…" — `apps/web/src/components/chat/TimelineAssistantRows.tsx:100-120`, `apps/web/src/components/chat/useTimelineRewind.ts:195-204` ⟶ ✓ #done
- **CP-04** Fork divider "Forked from conversation" / "Conversation fork" with "Open source conversation"/"Open fork" — `apps/web/src/components/chat/V2LifecycleRow.tsx:88-95` ⟶ ✓ #done
- **CP-05** Context handoff divider "Context handoff" / "Context handoff pending" (provider/model switch). A pending handoff also renders in the footer — `apps/web/src/components/chat/V2LifecycleRow.tsx:575`, `apps/web/src/components/ChatView.tsx:3021-3030` ⟶ ✓ #done
- **CP-06** Subagent-of header divider "Subagent of {parent}[ on {env}]" with "Open parent thread" — `apps/web/src/components/chat/MessagesTimeline.tsx:1089-1104` ⟶ ✓ #done
- **CP-07** History paging: "Load earlier turns" / "Loading earlier turns…" divider button at the top — `apps/web/src/components/chat/MessagesTimeline.tsx:1370-1392` ⟶ ✓ #done
- **CP-08** Branch restore confirm "Switch to {branch}?" / "You have uncommitted changes…" with Cancel / "Switch branch" — `apps/web/src/components/chat/ChatOverlayHosts.tsx:150-176` ⟶ ✓ #done
- **CP-09** Turn-diff "Open diff" from the changed-files card (see AM-03) and from tool entries (WL-11) ⟶ ✓ #done

## Status/streaming/errors

Files: `components/chat/TimelineWorkGroupRows.tsx`, `MessagesTimeline.tsx`(+`.logic.ts`), `packages/client-runtime/src/userMessage.ts`, `useThreadLifecycle.tsx`, `ThreadStatusLine.tsx`, `ThreadNow.tsx`, `ThreadActivityBanners.tsx`, `ChatBannerLane.tsx`, `ThreadErrorBanner.tsx`, `ProviderStatusBanner.tsx`, `UsageLimitRecoveryBanner.tsx`, `ProviderSubagentBar.tsx`, `V2LifecycleRow.tsx`, `threadSync.ts`.

- **ST-01** Working row "Working for {timer}" / "Working..." (ticking timer). Also "Setting up worktree…" (shimmer) — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:277-309` ⟶ ✓ #working (без шиммера у «Setting up worktree…»)
- **ST-02** Compaction live label "Compacting for {timer}" / "Compacting…" / "Compacting before the cache expires…" (shimmer) — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:345-358`, `packages/client-runtime/src/userMessage.ts:10-13` ⟶ ✓ #working (без шиммера у «Compacting…»)
- **ST-03** Compaction notice row "Context compacted {before} → {after}" (Minimize icon). Variants "Context automatically compacted before cache expiry", "Context compacted before sending", "Context compacted after {age} idle" (Claude resume), "Context compaction"/"Compacting context". On failure: alert icon plus failure text — `apps/web/src/components/chat/MessagesTimeline.tsx:1522-1570`, `apps/web/src/components/chat/MessagesTimeline.logic.ts:1598-1608`, `:2004-2011`, `packages/client-runtime/src/userMessage.ts:16-19` ⟶ ✓ #failed
- **ST-04** "Run interrupted" divider with message — `apps/web/src/components/chat/V2LifecycleRow.tsx:73-76` ⟶ ✓ #failed
- **ST-05** Usage-limit error row "Usage limit reached. Retry after {time}." — `apps/web/src/components/chat/TimelineWorkEntryRow.tsx:208-213` ⟶ ✓ #failed (лимит — одна карточка в ленте + один баннер над композером, без третьего уведомления)
- **ST-06** Usage-limit recovery banner (composer banner stack) "Usage limit reached", "Resets {time}", "Resume at reset"/"Cancel auto-resume", "Snooze until reset"/"Wake now". Errors "Could not snooze thread", "Could not change auto-resume" — `apps/web/src/components/chat/UsageLimitRecoveryBanner.tsx:33-97`, `apps/web/src/components/ChatView.tsx:2561-2573` ⟶ ✓ #failed
- **ST-07** Thread error banner (top lane): expandable error text with "Dismiss error". Codex/ChatGPT plan limit variant: "You've reached your workspace's limit for using your ChatGPT plan in other apps…" plus "Copy request for admin" (toast "Request copied — Send it to your workspace admin."), or "Review your usage settings in ChatGPT." plus a usage button — `apps/web/src/components/chat/ThreadErrorBanner.tsx:22-119` ⟶ ✓ #failed
- **ST-08** Provider status banner (top lane): "{Provider} is unauthenticated", "{Provider} {v} is known to be broken/unsupported", "{Provider} provider is unavailable.", "…has limited availability.", "No models are available for this provider.", "Sign in via the CLI to authenticate again.", "Open provider setup to sign in." (Antigravity: "…to sign in with Google."). Buttons "Open provider setup", "Dismiss {provider} provider {status}" — `apps/web/src/components/chat/ProviderStatusBanner.tsx:60-138` ⟶ ✓ #failed
- **ST-09** Settled status line "Settled {relative}" / "Settled" with "Un-settle"/"Un-settling...". Failure "Failed to un-settle thread" — `apps/web/src/components/chat/useThreadLifecycle.tsx:539-547`, `:228` ⟶ ✓ #failed
- **ST-10** Snoozed status line "Snoozed, {time} left" / "Snoozed" with "Wake now"/"Waking...". "Woke from snooze" with "Dismiss". Failure "Failed to wake thread" — `apps/web/src/components/chat/useThreadLifecycle.tsx:530-553`, `:273` ⟶ ✓ #failed
- **ST-11** Thread-now footer: sync line "Loading messages..." / "Syncing messages...", plus item details buttons "Show details: {title}" — `apps/web/src/components/chat/ThreadNow.tsx:49-99`, `apps/web/src/threadSync.ts:26` ⟶ ✓ #failed
- **ST-12** Goal item "{goal} · {usage}" with "Resume" (`/goal resume`) and "Clear" (`/goal clear`) — `apps/web/src/components/chat/ThreadActivityBanners.tsx:68-104` ⟶ ✓ #failed
- **ST-13** Background work item "Running {tasks}" / "Waiting on {tasks}", newest activity "{task}: {activity}", "Open", "Stop"/"Stopping..." — `apps/web/src/components/chat/ThreadActivityBanners.tsx:109-180`, `packages/client-runtime/src/state/threadExecution.ts:351-360` ⟶ ✓ #failed
- **ST-14** Branch mismatch banner (composer stack) "Restore branch"/"Restoring...", "Dismiss branch change notice" — `apps/web/src/components/chat/ThreadActivityBanners.tsx:187-224` ⟶ ✓ #failed
- **ST-15** Provider subagent bar (above the composer, in a subagent thread): provider icon, model and effort, live ticking status, "Runs on its own", "Open parent". sr-only "{model} subagent: {status}" — `apps/web/src/components/chat/ProviderSubagentBar.tsx:20-72`, `apps/web/src/components/ChatView.tsx:3446` ⟶ ✓ #failed
- **ST-16** Assistant streaming: copy is disabled while streaming and the timestamp is hidden until done — `apps/web/src/components/chat/TimelineAssistantRows.tsx:170-195` ⟶ ✓ #failed
- **ST-17** Live tool icons animate only while visible (`observeVisibleAnimation`) — `apps/web/src/components/chat/TimelineWorkGroupRows.tsx:383-420`, `apps/web/src/lib/visibleAnimation.ts` ⟶ ✓ #failed
- **ST-18** Misc toasts: "This thread is no longer available", "Failed to switch checkout", "Checkout switched, but the thread could not be updated", "The environment is not connected.", "Start a new chat to switch providers", "{noun} won't be sent" / "omitted from message" — `apps/web/src/components/chat/useThreadLifecycle.tsx:330-422`, `apps/web/src/components/ChatView.tsx:1448`, `apps/web/src/components/ChatView.logic.ts:786-938` ⟶ ✓ #failed

## Navigation (minimap, find, scroll)

Files: `components/chat/TimelineMinimap.tsx`, `timelineMinimapItems.ts`, `timelineMinimapWheel.ts`, `ThreadFindBar.tsx`, `ThreadFindProvider.tsx`, `threadFind*.ts`, `TimelineOverlays.tsx`, `timelineScroll*.ts`, `pageScrollController.ts`.

- **NV-01** Timeline minimap: one strip per user message along the edge. Hidden until hover or focus (opacity transition) — `apps/web/src/components/chat/TimelineMinimap.tsx:110-140`, `apps/web/src/components/chat/MessagesTimeline.tsx:1347` ⟶ ✓ #find (миникарта всегда видна тонкой полосой, ярче при наведении)
- **NV-02** Minimap keyboard: focusable "Jump to message: {text}". ↑/↓ move, Home/End, Enter/Space jump. A hover popover shows the message text ("User message" fallback). Wheel over the minimap scrolls — `apps/web/src/components/chat/TimelineMinimap.tsx:155-250` ⟶ ✓ #find
- **NV-03** "Previous turn"/"Next turn" step buttons (shown on hover) — `apps/web/src/components/chat/TimelineMinimap.tsx:302-320` ⟶ ✓ #find
- **NV-04** Find in thread (`mod+F`): bar "Find in thread" with counter "{i}/{n}" (or "1/…" while counting). States "Searching…" / "Search failed" (+Retry). "Previous match"/"Next match", Enter / Shift+Enter, "Close find". Folded messages reveal on match — `apps/web/src/components/chat/ThreadFindBar.tsx:44-119`, `apps/web/src/components/ChatView.tsx:3266` ⟶ ✓ #find
- **NV-05** "Scroll to end" glass pill above the composer, with a summary "· Subagent waiting · N queued" — `apps/web/src/components/chat/TimelineOverlays.tsx:26-55`, `apps/web/src/components/ChatView.tsx:3005-3010`, `:3385` ⟶ ✓ #find
- **NV-06** Hover timestamps on rows, with a full-date tooltip — `apps/web/src/components/chat/TimelineRowParts.tsx:13-41` ⟶ ✓ #find
- **NV-07** Workspace F6 focus areas ("Thread details", etc.) and `mod+[`/`mod+]` back/forward — `packages/shared/src/keybindings.ts:148-155` ⟶ ✓ #find

## Guest & sharing

Files: `components/chat/GuestShareControls.tsx`, `guestShareAvailability.ts`, `guestMessageStyle.tsx`, `GuestMessageAttachments.tsx`, `components/guest/GuestPage.tsx`, `routes/guest.tsx`, `components/threadActionMenu.logic.ts`.

- **GS-01** Thread menu "Share with guest" (when guest sharing is available) — `apps/web/src/components/threadActionMenu.logic.ts:176` ⟶ ✓ #guest
- **GS-02** Dialog "Share with guest": "Create link"/"Creating...", then a read-only "Guest link" field with "Copy"/"Copied" and the note "The link works once and expires in 24 hours." (or "A new link ends the current one."), and Done/Cancel. Error "Could not create a guest link." — `apps/web/src/components/chat/GuestShareControls.tsx:100-166` ⟶ ✓ #guest
- **GS-03** Header indicator "Guest link active" / "{name} is a guest" / "Guest link expired", with "Stop sharing" — `apps/web/src/components/chat/GuestShareControls.tsx:173-215` ⟶ ✓ #guest
- **GS-04** Pending guest messages in the timeline footer: "{N} guest messages waiting", each a bubble with name and attachments, plus "Dismiss" / "Send" ("Send message from {name}") — `apps/web/src/components/chat/GuestShareControls.tsx:217-320`, `apps/web/src/components/ChatView.tsx:3039-3045` ⟶ ✓ #guest
- **GS-05** Guest page (the guest's browser): "Connecting...", "This link has ended or is not valid" / "Ask the owner for a new link. Each link works in one browser.", "This link has ended" / "The owner stopped sharing this thread." — `apps/web/src/components/guest/GuestPage.tsx:211-283` ⟶ ✓ #guest
- **GS-06** Guest join: "Your name", "Join", "The owner sees your name and approves each message before the agent gets it." — `apps/web/src/components/guest/GuestPage.tsx:321-340` ⟶ ✓ #guest
- **GS-07** Guest composer "Message", "Attach files", "Remove {file}", "Send", hint "The owner approves each message". Statuses "Waiting for approval" / "Sent" / "Not sent". Errors "Something went wrong. Try again." / "Could not reach the server." — `apps/web/src/components/guest/GuestPage.tsx:154-165`, `:711-762` ⟶ ✓ #guest
- **GS-08** Guest timeline reuses the owner timeline but has no "Fork from this response". The model is shown as "Model: {label}". HTML renders through `GuestHtmlRender` — `apps/web/src/components/chat/timelineRowContext.ts:83`, `apps/web/src/components/guest/GuestPage.tsx:571`, `apps/web/src/components/guest/GuestHtmlRender.tsx:90` ⟶ ✓ #guest
- **GS-09** Owner-side guest message rendering: guest name heading plus `guestMessageStyle` bubble — `apps/web/src/components/chat/TimelineUserMessageRow.tsx:458-462` ⟶ ✓ #guest

## Observations

- **Header is breadcrumb-only, details card carries the toolbar.** Git actions, open-in, branch, scripts and changes live only in the Thread details card (TD-*). If the card is hidden or at "essential" density, Open in disappears. Discoverability now depends on `mod+shift+B` and right-click on the card. "Choose what to show" appears only when every section is hidden.
- **Three hosts for the panel toggles** (root titlebar, header, `ThreadPanelHeaderControl`), chosen by layout flags (`ChatView.tsx:3162-3228`). Hard to reason about, and a likely source of double or missing toggles.
- **Title interaction is overloaded.** Single click opens the menu after a 500 ms delay so that double-click can rename. That delay makes the click feel laggy. Right-click opens the same menu, and drafts get a different native menu.
- **Raw status strings leak into the UI.** The user-message pill shows `{status}` raw (`TimelineUserMessageRow.tsx:285`), and so does the assistant meta (`TimelineAssistantRows.tsx:168`). "exit {code}" is lowercase and technical (`V2ItemInspector.tsx:226`).
- **Technical/internal copy:** "Sync ref", "Select ref", "Search refs...", "Loading refs...", "default ref" in confirmations ("Commit & push to default ref?"), "Detached HEAD", "Provider process is gone. Interrupt or restart the run to respond.", "Context handoff", "Idle · resumable", "Superseded attempt", "Output is no longer available.", "Tool input" JSON blocks, and "Copy Link" (title case, inconsistent with "Copy link"-style copy elsewhere).
- **Inconsistent ellipses:** "Working..." vs "Compacting…", "Loading earlier turns…" vs "Loading messages...", "Creating...", "Initializing...", "Publishing...", "Un-settling...", "Waking...", "Searching…". Mixed three-dot and the single "…" character.
- **Duplicate "stopped" vocabulary:** "Stopped" (subagent cancelled/interrupted), "You stopped this response", "Run interrupted" divider, and command status "Stopped". These are four different presentations of interruption.
- **Usage-limit duplication:** an inline error row "Usage limit reached. Retry after …" (WL/ST-05), the composer banner "Usage limit reached" (ST-06), and the Codex ChatGPT limit error banner (ST-07) can all show for one event.
- **Compaction has 7+ label variants** across live, finished, idle and resume states (ST-02/ST-03), split between `client-runtime/userMessage.ts` and `MessagesTimeline.logic.ts`.
- **Plan actions split.** The card has only copy/download/save. "Implement"/"Refine" live in the composer primary actions, so the plan card has no visible implement CTA. This is a dead-end feeling when the composer is collapsed or on mobile.
- **Edit from here = revert.** The Undo icon is labeled "Edit from here", but the dialog speaks of "Revert files too" / "Revert and keep changes". The vocabulary mixes rewind, edit and revert. There is no visible checkpoint/restore marker per turn; rewind is reachable only from user-message hover.
- **Two "Open diff" entry points** (turn changed-files card and per-tool inspector) plus "Changes" in the details card, which all open the right-panel diff.
- **MCP app prompts use native `confirm()`** text with raw JSON (`McpAppFrame.tsx:278`). This is off-brand and inaccessible on mobile/remote.
- **Hover-only affordances:** copy, fork, edit-from-here, timestamps, the minimap and minimap step buttons are opacity-0 until hover (touch gets them always). They are invisible to keyboard users until focus-within.
- **Animation/perf risks:**
  - The text shimmer overlay (`ActivityShimmerOverlay`, a duplicated text layer) runs on "Thinking", worktree setup and compaction rows (`TimelineWorkGroupRows.tsx:297-301`, `:367`; `MessagesTimeline.tsx:1567`). It is gated by `observeVisibleAnimation`, but it is still a continuous animation for the whole turn.
  - The Fork button uses `animate-pulse` while busy (`TimelineAssistantRows.tsx:118`), with no visibility gating.
  - Ticking timers re-render: "Working for", "Compacting for", git elapsed, subagent elapsed, and the provider subagent bar status (`tickTextContent`).
  - Panel open/close animates header padding (`transition-[padding-left]`), which is a layout-thrashing property, on every toggle.
  - Thread details card density is measured with a ResizeObserver plus a state write per density, and the breadcrumb collapse uses a ResizeObserver. Both are fine, but they are layout reads on resize.
- **Per-provider differences in rendering** are limited to: Codex directives and artifact templates (AM-18), the Codex/ChatGPT limit banner (ST-07), Claude skill invocations (WL-21), Claude resume-compaction age (ST-03), the Antigravity Google sign-in copy (ST-08), ACP registry icons for ACP agents (Cursor/Grok/OpenCode/Antigravity) in the subagent rows, provider-specific approval option sets (AP-02, options come from the provider), and revert support ("This provider does not support reverting…", CP-02). There are no Grok/OpenCode/Cursor-specific timeline renderers.
- **Remote/offline:** "Environment is not connected." / "The environment is not connected." exist in two phrasings. Remote lineage rows "Runs on {env}. Connect to it…". Thread data loss after a fork: "Reconnect and try opening it from the sidebar". `HtmlRenderFrame` says "Reconnect to the environment and try again." There is no single offline state for the timeline itself; only the sync line "Syncing messages..." shows.
- **Missing thread** silently redirects home with no toast in ThreadRouteView (EM-08), while `useThreadLifecycle` has a separate "This thread is no longer available" toast. The behavior is inconsistent.

Source: `D:\VSProjects\Marp` (branch `design/marp-design-system`), web app `apps/web/src`. UI strings are verbatim. Status after ⟶ is left empty.

## Surface & layout

Files: `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/chat/ComposerSurface.tsx`, `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/chat/ComposerFooterControls.tsx`, `apps/web/src/components/chat/ProviderSubagentBar.tsx`, `apps/web/src/components/chat/DraftHeroHeadline.tsx`, `apps/web/src/components/composerFooterLayout.ts`.

- **CO-01** Composer overlay floats over the bottom of the timeline. In a new draft ("hero" state) it sits vertically centred with a `DraftHeroHeadline` above it — `apps/web/src/components/ChatView.tsx:3400` ⟶ ✓ #composer
- **CO-02** Composer stack: banner dock and shoulder tabs (stash) above the card. Mobile drafts use view transitions (`MOBILE_COMPOSER_VIEW_TRANSITION_NAME`) — `apps/web/src/components/ChatView.tsx:3408` ⟶ ✓ #composer
- **CO-03** `ComposerSurface.Shell`: max chat-content width, rounded-3xl glass (backdrop blur/saturate, theme-aware outline and highlight vars). The glass moves to Host when a context row is shown — `apps/web/src/components/chat/ComposerSurface.tsx:5` ⟶ ✓ #composer
- **CO-04** `ComposerSurface.Host`: card with shadow and 1px outline. It becomes `inert`/`aria-busy` while a queued-message edit is saving — `apps/web/src/components/ChatView.tsx:3440` ⟶ ✓ #composer
- **CO-05** `ComposerSurface.Main`: inner card. When a banner is attached on top, it takes the glass and outline so banner and card read as one surface — `apps/web/src/components/chat/ComposerSurface.tsx:52` ⟶ ✓ #composer
- **CO-06** `ComposerSurface.ContextStrip`: bare row under the card (environment, worktree, branch, permissions) — `apps/web/src/components/chat/ComposerSurface.tsx:72` ⟶ ✓ #composer
- **CO-07** Provider subagent bar above the composer in subagent threads: provider icon, model label, effort label, live status ticker, "Runs on its own", "Open parent" button. Labels become sr-only at narrow container widths — `apps/web/src/components/chat/ProviderSubagentBar.tsx:66` ⟶ ✓ #composer
- **CO-08** Composer body order: stash menu or command menu layer, queued-attachment row (when editing a queued message), media row, file list, editor, length validation, footer — `apps/web/src/components/chat/ChatComposer.tsx:3245` ⟶ ✓ #composer
- **CO-09** Footer row: attach button on the left, composer controls (model, effort, mode and more; right-aligned, flex-1), context window meter, primary action — `apps/web/src/components/chat/ChatComposer.tsx:3420` ⟶ ✓ #composer
- **CO-10** Drop highlight: the surface tints `bg-accent/45` with an inset primary ring while files or a thread/mention are dragged over it. Cleared on window `dragend` — `apps/web/src/components/chat/ChatComposer.tsx:3190` ⟶ ✓ #composer
- **CO-11** The surface dims to 75% opacity when a project must be chosen first — `apps/web/src/components/chat/ChatComposer.tsx:3195` ⟶ ✓ #composer
- **CO-12** Per-provider classes for the frame, the surface and the model picker icon, from provider state — `apps/web/src/components/chat/ChatComposer.tsx:3183` ⟶ ✓ #composer
- **CO-13** The footer switches to a compact layout below 620px form width (780px when wide actions are shown: plan follow-up or a question) — `apps/web/src/components/composerFooterLayout.ts:1` ⟶ ✓ #composer
- **CO-14** Composer controls shrink blocks to icon-only or hide them (overflowing into the "More composer controls" menu) based on measured width (`hiddenBlockCount`, `iconOnlyBlockCount`) — `apps/web/src/components/chat/ChatComposer.tsx:2283` ⟶ ✓ #composer
- **CO-15** The bottom spacer respects the safe-area inset (`env(safe-area-inset-bottom)` + 1rem / 1.25rem) — `apps/web/src/components/ChatView.tsx:3686` ⟶ ✓ #composer

## Editor & input

Files: `apps/web/src/components/ComposerPromptEditorTiptap.tsx`, `apps/web/src/composer-rich-text-doc.ts`, `apps/web/src/composer-rich-text.ts`, `apps/web/src/composer-code-block.ts`, `apps/web/src/composer-code-languages.ts`, `apps/web/src/composer-list-continuation.ts`, `apps/web/src/composer-text-direction.ts`, `apps/web/src/composer-undo-grouping.ts`, `apps/web/src/composerPlaceholder.ts`, `apps/web/src/composerDraftStore.ts`, `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/chat/ComposerCodeBlockNodeView.tsx`, `apps/web/src/components/chat/ComposerCodeBlockLanguagePicker.tsx`, `apps/web/src/components/chat/useComposerAttachmentIntake.ts`, `apps/web/src/components/chat/usePasteToFocusComposer.ts`, `apps/web/src/components/chat/composerFocusRedirect.ts`, `apps/web/src/components/chat/composerPromptHistory.ts`, `apps/web/src/components/chat/composerTypingGuard.ts`, `apps/web/src/components/chat/useComposerMultilinePrompt.ts`, `apps/web/src/components/chat/TerminalContextInlineChip.tsx`, `apps/web/src/components/chat/SkillInlineText.tsx`, `apps/web/src/components/chat/AssistantCitationChip.tsx`, `apps/web/src/components/composerContextPresentation.tsx`, `apps/web/src/components/composerInlineTokenPaste.ts`, `apps/web/src/components/chat/ComposerPromptLengthValidation.tsx`, `apps/web/src/components/settings/SettingsPanels.tsx`, `packages/client-runtime/src/textPaste.ts`.

- **CO-16** Tiptap/ProseMirror contenteditable, `role="textbox"`, `aria-multiline`, `data-testid="composer-editor"`; grows from 2 lines to max-h-52 then scrolls internally; `aria-readonly` when disabled — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1075` ⟶ ✓ #composer
- **CO-17** Accessible name: "Message <thread title>" (or "Message" with no thread), so switching threads announces the target thread — `apps/web/src/components/chat/ChatComposer.tsx:3334` ⟶ ✓ #composer
- **CO-18** Default placeholder: "Ask anything. @ files, $ skills, / commands" (overlay div, hidden once text or a context chip exists; also exposed as `aria-placeholder`) — `apps/web/src/composerPlaceholder.ts:1` ⟶ ✓ #composer
- **CO-19** Context-specific placeholders: "Send feedback to decline this request" / "Send a message to decline and redirect the agent" (approval pending), "Choose an option above" / "Type your own answer, or leave this blank to use the selected option" (agent question), "Add feedback to refine the plan, or leave this blank to implement it" (plan follow-up), "Choose a project above to start a thread", "Enable a provider in Settings to send a message" — `apps/web/src/components/chat/ChatComposer.tsx:3363` ⟶ ✓ #composer
- **CO-20** Editor is non-editable when a project must be chosen, when the agent question is choice-only, or while a question answer is being submitted — `apps/web/src/components/chat/ChatComposer.tsx:3380` ⟶ ✓ #composer
- **CO-21** Rich text mode (Settings › Chat › Composer › "Rich text composer", default on, "Show formatted Markdown as you type."): toggling remounts the editor with rich or plain extensions — `apps/web/src/components/settings/SettingsPanels.tsx:1072` ⟶ ✓ #composer
- **CO-22** Plain mode still keeps chips (mentions, skills, citations, context refs) but drops bold/strike/italic/code/blocks — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:815` ⟶ ✓ #composer
- **CO-23** Literal mode for free-text answers to agent questions: no chips, no triggers, no auto-pairing, no Markdown — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:956` ⟶ ✓ #composer
- **CO-24** Inline Markdown marks stored as Markdown: bold `**`, italic `*` (underscore rules disabled so `node_modules` is not italicized), strike `~~`, inline code `` ` ``; delimiters shown as faint markers around the caret's styled range — `apps/web/src/composer-rich-text.ts:8` ⟶ ✓ #composer
- **CO-25** Italic input/paste rules accept only `*text*` — `apps/web/src/composer-rich-text-doc.ts:148` ⟶ ✓ #composer
- **CO-26** Mod+B bolds only when text is selected; without a selection the chord is swallowed (avoids accidental bold) — `apps/web/src/composer-rich-text-doc.ts:162` ⟶ ✓ #composer
- **CO-27** Selection auto-wrap: typing `( [ { ' " “ ` < « *`(and other pairs) with a plain-text selection wraps it; skipped for chips, styled text, mention boundaries —`apps/web/src/components/ComposerPromptEditorTiptap.tsx:215` ⟶ ✓ #composer
- **CO-28** Block Markdown (rich mode): headings (`#` input rule), blockquote (`> `), horizontal rule, bullet (`*`/`+`/`- x`), ordered (`1.`/`1)`), task lists (`- [ ]`, bullet→task rule); Tiptap block chords Mod-Shift-7/8/9/B, Mod-Alt-C removed — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:868` ⟶ ✓ #composer
- **CO-29** Enter in a list item continues the list (next bullet/number), empty item exits/lifts; Enter on empty quote line lifts out of quote — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1289` ⟶ ✓ #composer
- **CO-30** Text-level list continuation/indent: Enter continues `- `/`1.` markers, Tab/Shift-Tab indents list lines (string-based, also in plain mode) — `apps/web/src/composer-list-continuation.ts:222` ⟶ ✓ #composer
- **CO-31** Backspace/Delete across list items merge without losing markers — `apps/web/src/composer-rich-text-doc.ts:283` ⟶ ✓ #composer
- **CO-32** Code fences: typing ` ```lang ` then Enter converts the top-level paragraph into a code block — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1271` ⟶ ✓ #composer
- **CO-33** In a code block: Enter inserts indented newline; closing fence or trailing blank lines exits; Tab/Shift-Tab indents/outdents; Backspace at block start unwraps it into paragraphs — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1240` ⟶ ✓ #composer
- **CO-34** Code block frame with syntax highlighting (Shiki diff theme follows light/dark) — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:862` ⟶ ✓ #composer
- **CO-35** Code block language picker in header: trigger "Code language: <Label>" with icon + chevron, searchable combobox "Search languages", 39 languages + "Plain text"; disabled when editor read-only — `apps/web/src/components/chat/ComposerCodeBlockLanguagePicker.tsx:73` ⟶ ✓ #composer
- **CO-36** Code language list (Plain text, Bash, C … YAML, Zig) — `apps/web/src/composer-code-languages.ts:1` ⟶ ✓ #composer
- **CO-37** Per-line automatic RTL/LTR direction; arrow keys respect visual direction — `apps/web/src/composer-text-direction.ts:72` ⟶ ✓ #composer
- **CO-38** macOS Cmd+Arrow / Home/End move by line/document boundary using native selection — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1124` ⟶ ✓ #composer
- **CO-39** Arrow keys step over chips atomically and visit both caret stops at styled edges — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1162` ⟶ ✓ #composer
- **CO-40** IME guard: Enter during composition (isComposing / keyCode 229) never sends — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1233` ⟶ ✓ #composer
- **CO-41** Undo/redo grouped by 1000 ms typing bursts; paste and cut are their own undo steps — `apps/web/src/composer-undo-grouping.ts:6` ⟶ ✓ #composer
- **CO-42** Paste plain text: Markdown parsed into paragraphs/blocks; verbatim inside code blocks; flat in nested lists/quotes; pasted `@path`/`$skill` become chips with auto-spacing — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1349` ⟶ ✓ #composer
- **CO-43** Copy/cut of a selection containing context chips writes plain text plus a custom MIME + HTML fragment so pasting into another composer restores the chips' records — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1735` ⟶ ✓ #composer
- **CO-44** Paste of composer-context clipboard fragments imports their records (threads, files, terminal, etc.) — `apps/web/src/components/composerInlineTokenPaste.ts:40` ⟶ ✓ #composer
- **CO-45** Long paste auto-folds into an attachment `pasted-text.txt` (`pasted-text-2.txt`…) at ≥32 KiB or when it would exceed the input limit — `packages/client-runtime/src/textPaste.ts:1` ⟶ ✓ #composer
- **CO-46** Paste as plain text shortcut Cmd/Ctrl+Shift+V (and desktop "Paste as text" menu) bypasses auto-fold and image inline chip — `packages/client-runtime/src/textPaste.ts:7` ⟶ ✓ #composer
- **CO-47** Fold errors (toasts): "Pasted text is too large for this message" / "Remove some text or an attachment, then paste again."; "Pasted text is too large to attach" / "Reduce the clipboard contents or save a smaller excerpt as a file." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:400` ⟶ ✓ #composer
- **CO-48** Paste with files/folders is routed to attachments instead of text — `apps/web/src/components/chat/ChatComposer.tsx:2507` ⟶ ✓ #composer
- **CO-49** Paste-to-focus: a paste while focus is in the timeline (not an input, terminal, palette, model picker, secret request) lands at the end of the composer — `apps/web/src/components/chat/usePasteToFocusComposer.ts:39` ⟶ ✓ #composer
- **CO-50** Type-to-focus: printable keys without modifiers typed anywhere in the chat are inserted at the composer end — `apps/web/src/components/chat/useChatShortcuts.ts:66` ⟶ ✓ #composer
- **CO-51** PageUp/PageDown in the composer scroll the timeline when the editor itself cannot scroll — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1789` ⟶ ✓ #composer
- **CO-52** Prompt history recall: ArrowUp/ArrowDown on an empty composer (caret on visual edge, no attachments/contexts, no pending question) cycles the user's previous prompts in this thread; chips stripped; agent/automation messages excluded — `apps/web/src/components/chat/composerCommandKey.ts:134` ⟶ ✓ #composer
- **CO-53** Inline file mention chip (`@path`): file-type icon + basename, LTR, tooltip with workspace entry details, click "Preview <path>" opens file — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:259` ⟶ ✓ #composer
- **CO-54** Inline skill chip (`$name`): popover with label, description or "No description is available for this skill.", button "View instructions"; label re-resolved after provider switch — `apps/web/src/components/chat/SkillInlineText.tsx:86` ⟶ ✓ #composer
- **CO-55** Inline citation chip (quoted assistant text): "View cited assistant text: <label>", comment button "Add comment to citation"/"Edit citation comment" with popup editor (save, save & send); Shift+Tab focuses comment button — `apps/web/src/components/chat/AssistantCitationChip.tsx:177` ⟶ ✓ #composer
- **CO-56** Inline context-reference chips by kind: terminal, image, file, review comment / pull request, preview annotation, thread, environment — `apps/web/src/components/composerContextPresentation.tsx:391` ⟶ ✓ #composer
- **CO-57** Unresolved context chip tooltip: "This context is no longer available. Remove it or attach it again." — `apps/web/src/components/composerContextPresentation.tsx:366` ⟶ ✓ #composer
- **CO-58** Terminal excerpt chip: "Terminal excerpt, <label>", popover with "Line N"/"Lines N–M" and "Captured terminal output"; expired state tooltip "Terminal context expired. Remove and re-add <label> to include it in your message." — `apps/web/src/components/chat/TerminalContextInlineChip.tsx:55` ⟶ ✓ #composer
- **CO-59** Character limit error (role=alert, under editor): "Prompt is N characters over the 120,000-character limit. Shorten or split it before sending." — `apps/web/src/components/chat/composerSubmission.ts:22` ⟶ ✓ #composer
- **CO-60** Draft persistence: per-thread/draft prompt, images, files, terminal/preview/review/thread/environment contexts, model selection, runtime & interaction mode saved to localStorage `t3code:composer-drafts:v1` (v9), 300 ms debounce, flushed on beforeunload — `apps/web/src/composerDraftStore.ts:108` ⟶ ✓ #composer
- **CO-61** Draft state shape (what survives reload per thread) — `apps/web/src/composerDraftStore.ts:359` ⟶ ✓ #composer
- **CO-62** Sticky model/options per provider instance carried to new drafts — `apps/web/src/composerDraftStore.ts:432` ⟶ ✓ #composer
- **CO-63** Multiline detection (prompt wraps) drives inline vs footer controls layout — `apps/web/src/components/chat/useComposerMultilinePrompt.ts:1` ⟶ ✓ #composer
- **CO-64** Typing guard: new approval requests arriving while the user typed within 1.5 s are held back so keystrokes don't hit them — `apps/web/src/components/chat/composerTypingGuard.ts:1` ⟶ ✓ #composer

## Mentions/skills/slash

Files: `apps/web/src/composer-logic.ts`, `apps/web/src/components/chat/useComposerMenuItems.ts`, `apps/web/src/components/chat/ComposerCommandMenu.tsx`, `apps/web/src/components/chat/ComposerCommandMenuLayer.tsx`, `apps/web/src/components/chat/composerSlashCommandSearch.ts`, `apps/web/src/components/chat/useComposerTriggerState.ts`, `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/chat/useComposerSend.ts`, `apps/web/src/components/chat/composerMentionDrag.ts`, `packages/client-runtime/src/composerThreadItems.ts`, `packages/shared/src/usageLimits.ts`.

- **CO-65** Four triggers on the token before the caret: `@` path/thread/machine, `/` commands (not when it looks like a path), `#` pull requests, `$` (any currency symbol, ignoring amounts like `$5`) skills — `apps/web/src/composer-logic.ts:251` ⟶ ✓ #composer
- **CO-66** Triggers suppressed in code blocks, next to chips, and in literal answer mode — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1059` ⟶ ✓ #composer
- **CO-67** Suggestion menu: drawer above the composer (banner surface), max-h-72 scroll, listbox labels "Files and folders" / "Pull requests" / "Commands" / "Skills"; row = icon + label + secondary description (+ skill source badge) — `apps/web/src/components/chat/ComposerCommandMenu.tsx:124` ⟶ ✓ #composer
- **CO-68** Hover highlights, mouse click selects; highlighted row scrolls into view; `aria-activedescendant` on editor — `apps/web/src/components/chat/ComposerCommandMenu.tsx:197` ⟶ ✓ #composer
- **CO-69** Loading copy: "Searching workspace files...", "Searching workspace skills...", "Finding pull request..." (also sr-only live region) — `apps/web/src/components/chat/ComposerCommandMenu.tsx:156` ⟶ ✓ #composer
- **CO-70** Empty states: "No matching files or folders.", "No matching command.", "No skills found. Try / to browse provider commands.", "Pull requests are not available for this project.", "Pull requests could not be read for this project.", "No pull request matches <q>.", "No pull requests found in this repository." — `apps/web/src/components/chat/useComposerMenuItems.ts:361` ⟶ ✓ #composer
- **CO-71** `@` results order: threads (max 5, by recency; desc "Thread" / "Thread on <machine>"), machines (desc "Machine"; only when linked environments offered and not answering a question), then workspace files/folders (basename + parent dir) — `apps/web/src/components/chat/useComposerMenuItems.ts:182` ⟶ ✓ #composer
- **CO-72** Select file/folder → inserts `@path ` mention chip; thread → inline thread context chip + record; machine → environment context chip — `apps/web/src/components/chat/ChatComposer.tsx:1843` ⟶ ✓ #composer
- **CO-73** Drag a file from the file tree (custom MIME) onto the composer inserts an `@` mention; PR drag payload supported; drop highlight ring — `apps/web/src/components/chat/composerMentionDrag.ts:5` ⟶ ✓ #composer
- **CO-74** `#` PR search: numeric query does exact lookup (debounced 180 ms), text query searches up to 99 PRs, shows max 12, linked PRs first; row "#123" + title (or "repo · title" for other repos), state icon — `apps/web/src/components/chat/useComposerMenuItems.ts:313` ⟶ ✓ #composer
- **CO-75** Select PR → inline pull-request context chip (review-comment record) — `apps/web/src/components/chat/ChatComposer.tsx:1922` ⟶ ✓ #composer
- **CO-76** Built-in slash commands: "/model" "Switch response model for this thread" (opens model picker), "/plan" "Switch this thread into plan mode", "/default" "Switch this thread back to normal build mode" (plan/default only when plan mode enabled) — `apps/web/src/components/chat/useComposerMenuItems.ts:213` ⟶ ✓ #composer
- **CO-77** Selecting /model clears token and opens the model picker; /plan, /default switch mode and clear token — `apps/web/src/components/chat/ChatComposer.tsx:1859` ⟶ ✓ #composer
- **CO-78** Typing just "/plan" or "/default" and sending switches mode instead of sending a message — `apps/web/src/components/chat/useComposerSend.ts:742` ⟶ ✓ #composer
- **CO-79** Provider slash commands listed as "/<name>" with provider description, else input hint, else "Run provider command"; selecting inserts `/<name> `; only offered at the start of the prompt — `apps/web/src/components/chat/useComposerMenuItems.ts:244` ⟶ ✓ #composer
- **CO-80** `/compact` only shown when provider supports manual compaction — `apps/web/src/components/chat/useComposerMenuItems.ts:268` ⟶ ✓ #composer
- **CO-81** "/usage-limits" "Show this provider's usage limits" injected for providers with usage limits; selecting opens usage limits UI instead of inserting text — `packages/shared/src/usageLimits.ts:665` ⟶ ✓ #composer
- **CO-82** Skills in slash menu as "/skill:<name>" (dimmed `/skill:` prefix) when setting "Show skills in slash menu" (default on; "Also include skills in the / command menu. Skills always appear when you type $.") — `apps/web/src/components/settings/SettingsPanels.tsx:1171` ⟶ ✓ #composer
- **CO-83** Slash search ranks built-ins, then provider commands, then skills; matches name and description, fuzzy — `apps/web/src/components/chat/composerSlashCommandSearch.ts:72` ⟶ ✓ #composer
- **CO-84** `$` skill search: provider skills (user-invocable) with display name, short description / description / "<scope> skill" / "Run provider skill"; select inserts `$name ` skill chip — `apps/web/src/components/chat/useComposerMenuItems.ts:276` ⟶ ✓ #composer
- **CO-85** Skill source badge: "App", "Repo", "Project", "Personal", "System", "Provider" (+ " Skill" suffix in `$` menu) with icons — `apps/web/src/components/chat/ComposerCommandMenu.tsx:277` ⟶ ✓ #composer
- **CO-86** Escape dismisses the menu; it stays dismissed for that same token until it changes — `apps/web/src/components/chat/useComposerTriggerState.ts:1` ⟶ ✓ #composer
- **CO-87** Per-provider: skills and slash commands come from the selected provider's snapshot resolved for the cwd (workspace-specific); Claude (init commands + /compact), Codex (skills list, slash), Antigravity (native commands + discovered skills), Grok (ACP commands, /compact fallback), Muse (/compact), Pi (commands + skills), OpenCode/Cursor/Fx (skills); others empty — `apps/web/src/components/chat/ChatComposer.tsx:928` ⟶ ✓ #composer

## Attachments

Files: `apps/web/src/components/chat/ComposerAttachmentStrip.tsx`, `ComposerImageThumbnail.tsx`, `SnapShotAttachmentDetails.tsx`, `composerAttachmentFiles.ts`, `useComposerAttachmentIntake.ts`, `useComposerContextImport.ts`, `composerThreadImport.ts`, `threadContextDrag.ts`, `composerMentionDrag.ts`, `ComposerPendingTerminalContexts.tsx`, `TerminalContextInlineChip.tsx`, `TimelineOverlays.tsx`, `ChatComposer.tsx`, `apps/web/src/components/ChatView.tsx`, `apps/web/src/lib/attachmentUploadState.ts`, `apps/web/src/lib/copiedComposerAttachments.ts`, `packages/contracts/src/chatAttachment.ts`.

- **CO-88** Attach button: ghost paperclip icon in the footer's left slot, tooltip/aria "Attach files"; opens a hidden multi-file `<input type="file">`; shown only when the server can stage files and, during a question, only if the question accepts custom answers and the server supports question attachments — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:671` ⟶ ✓ #composer
- **CO-89** Attach-button visibility rule (`showComposerAttachAction`: `fileStagingLimit !== null` and question allows attachments) — `apps/web/src/components/chat/ChatComposer.tsx:1168` ⟶ ✓ #composer
- **CO-90** Workspace drop overlay: dashed primary border over the whole chat pane with pill "Drop files to attach" (paperclip icon) while OS files are dragged over the workspace; files/folders routed to the composer — `apps/web/src/components/chat/TimelineOverlays.tsx:5` ⟶ ✓ #composer
- **CO-91** Workspace file-drop wiring (files -> `addDroppedFiles`, folders -> `addDroppedFolders`) — `apps/web/src/components/ChatView.tsx:3179` ⟶ ✓ #composer
- **CO-92** Sidebar file drop onto a thread row: files queued and handed to that thread's composer once it mounts — `apps/web/src/components/ChatView.tsx:3050` ⟶ ✓ #composer
- **CO-93** Composer drop highlight: surface tints `bg-accent/45` with inset primary ring while a mention/PR/thread drag is over it; cleared on window `dragend` (Esc cancels) — `apps/web/src/components/chat/ChatComposer.tsx:3194` ⟶ ✓ #composer
- **CO-94** Media row (images, SnapShots, videos, preparing placeholders): 64px rounded tiles, wraps; becomes a horizontally snapping scroll strip when SnapShots are present — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:111` ⟶ ✓ #composer
- **CO-95** Image tile: click to zoom/preview (aria "Preview {name}"); falls back to filename text or HEIC renderer if no thumbnail — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:196` ⟶ ✓ #composer
- **CO-96** Preparing (compressing) image placeholder: same tile, disabled, shows source thumbnail; swaps in place when compressed — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:165` ⟶ ✓ #composer
- **CO-97** Upload progress overlay on tile bottom: "{n}%" while uploading (0% shown for preparing images when uploads are supported) — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:260` ⟶ ✓ #composer
- **CO-98** Failed upload: overlay refresh button bottom-left, aria "Retry upload for {name}", tooltip shows failure reason; disabled without operate permission — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:267` ⟶ ✓ #composer
- **CO-99** Remove tile: media-close X top-right, aria "Remove {name}"; on SnapShots appears on hover/focus (always on coarse pointer) — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:294` ⟶ ✓ #composer
- **CO-100** Remove referenced image confirm (destructive): "Remove {name} from the message?\nIt is referenced in your text; removing it also removes every reference." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:346` ⟶ ✓ #composer
- **CO-101** Non-persisted draft image warning: alert icon top-left, aria "Draft attachment may not persist", tooltip "Draft attachment could not be saved locally and may be lost on navigation." — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:242` ⟶ ✓ #composer
- **CO-102** SnapShot tile: larger frame with arrival animation (setting `snapShotAnimations`), gradient footer with app icon (or initial), app name, window title or "Captured window" — `apps/web/src/components/chat/SnapShotAttachmentDetails.tsx:136` ⟶ ✓ #composer
- **CO-103** SnapShot accessibility button: tooltip "Accessibility data" / "No accessibility data", aria "View accessibility data"; popover titled "Accessibility data" with tree, or "Structured accessibility elements were included, but they have no readable names or values." / "The app or capture backend did not provide verified accessibility data." — `apps/web/src/components/chat/SnapShotAttachmentDetails.tsx:74` ⟶ ✓ #composer
- **CO-104** SnapShot in-flight placeholders (uncommitted captures) reserve invisible frames during fly-in animation — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:312` ⟶ ✓ #composer
- **CO-105** Video tile: black tile with frame thumbnail + play icon, aria "Play {name}"; opens preview or server file; own progress/retry/remove — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:327` ⟶ ✓ #composer
- **CO-106** Non-media file list under media row: file-type icon, name (click opens preview dialog), right meta = size / "{n}%" / "Attach again" / "Remove to send", retry + "Remove {name}" ghost buttons — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:407` ⟶ ✓ #composer
- **CO-107** Needs-reattach file marker (draft restored without bytes): name disabled, "Attach again" if within staging limit else "Remove to send"; re-picking a matching file replaces the marker without consuming a slot — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:455` ⟶ ✓ #composer
- **CO-108** File preview dialog: modal (max-w-4xl, 85vh) with `AttachmentFilePreview`, origin "Draft", remove + close — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:503` ⟶ ✓ #composer
- **CO-109** Collapsed/resting image previews: 28px thumbs beside single-line prompt, aria "Preview {name}", overflow chip "+N" (aria "Show N more image attachments") expands composer — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:553` ⟶ ✓ #composer
- **CO-110** Queued-message edit attachments row: already-uploaded tiles with "Remove {name}" — `apps/web/src/components/chat/ComposerAttachmentStrip.tsx:632` ⟶ ✓ #composer
- **CO-111** Inline chips for attachments: images get an inline context chip only when there is prompt text, a selection, a question, or project selection pending; files always insert an inline reference — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:138` ⟶ ✓ #composer
- **CO-112** Paste handling: pasting images/files (or folders) attaches them instead of inserting text; paste-as-text shortcut skips image chips — `apps/web/src/components/chat/ChatComposer.tsx:2507` ⟶ ✓ #composer
- **CO-113** Large text paste auto-folds into a `.txt` attachment; info toast "Large paste attached as {name}" / "{size} · Use ⌘⇧V (Ctrl+Shift+V) to keep a large paste inline." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:231` ⟶ ✓ #composer
- **CO-114** Paste-too-large toasts: "Pasted text is too large for this message" / "Remove some text or an attachment, then paste again."; "Pasted text is too large to attach" / "Reduce the clipboard contents or save a smaller excerpt as a file." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:398` ⟶ ✓ #composer
- **CO-115** Intake validation errors (thread error banner): "You can attach up to 100 files per message.", "'{name}' is not a supported image type. Attach GIF, HEIC, HEIF, JPEG, PNG, or WebP images.", "This server does not support file attachments.", "'{name}' is empty or could not be read.", "'{name}' exceeds the {size} attachment limit." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:179` ⟶ ✓ #composer
- **CO-116** Image compression to 10 MB; errors "'{name}' could not be read as an image." / "'{name}' is too large to attach, even after compression." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:262` ⟶ ✓ #composer
- **CO-117** Limits: 100 attachments, 10 MB image, 50 MB file staging (server may lower), 120,000 chars input — `packages/contracts/src/chatAttachment.ts:13` ⟶ ✓ #composer
- **CO-118** Question-attachment refusal toast "This question cannot accept attachments." — `apps/web/src/components/chat/useComposerAttachmentIntake.ts:130` ⟶ ✓ #composer
- **CO-119** Folder drop/paste: inserts `@path` file link (desktop local only); errors "Folders can only be referenced in the local desktop environment", "Couldn't get the path of \"{name}\"" / "Type the folder path with @ instead.", "Unable to add folder" / "The composer is busy; try again once it is ready." — `apps/web/src/components/chat/ChatComposer.tsx:2468` ⟶ ✓ #composer
- **CO-120** Mention drag from file tree / PR drag (custom MIME `application/x-t3code-composer-mention`, `…-pull-request`) inserts `@path` or PR review-context chip at end; reject toast "Unable to add to chat" / "The composer is busy; try again once it is ready." — `apps/web/src/components/chat/ChatComposer.tsx:2552` ⟶ ✓ #composer
- **CO-121** Thread drag (sidebar thread -> composer): same/linked machine inserts thread context chip; other machine imports transcript as file with loading toast "Loading thread context…" — `apps/web/src/components/chat/ChatComposer.tsx:2629` ⟶ ✓ #composer
- **CO-122** Thread import errors: "Unable to read the dropped thread" / "This thread exceeds the attachment size limit. Try a shorter thread." or "Check that its environment is connected and up to date, then try again."; during a question "Unable to add thread" — `apps/web/src/components/chat/ChatComposer.tsx:2617` ⟶ ✓ #composer
- **CO-123** Thread drag ghost (floating label with title/count while dragging) — `apps/web/src/components/chat/threadContextDrag.ts:73` ⟶ ✓ #composer
- **CO-124** Cross-environment copy/paste of attachment chips: bytes re-downloaded from source; toast "Couldn't bring {name} into this message" / "{reason} Remove the chip or attach the file again." with reasons "The environment it came from is not connected." / "…is not reachable right now." / "The original attachment is no longer available." / "Downloading it from the source failed." / "The attachment limit has been reached." — `apps/web/src/components/chat/useComposerContextImport.ts:158` ⟶ ✓ #composer
- **CO-125** Recently copied attachments kept alive for paste after source removal — `apps/web/src/lib/copiedComposerAttachments.ts:7` ⟶ ✓ #composer
- **CO-126** Terminal context chip (from terminal selection): inline chip, aria "Terminal excerpt, {label}"; expired state invalid with "Terminal context expired. Remove and re-add {label} to include it in your message."; popover "Captured terminal output" — `apps/web/src/components/chat/TerminalContextInlineChip.tsx:52` ⟶ ✓ #composer
- **CO-127** Background upload lifecycle: drafts start server uploads when capability known; released when capability lost (hydrated files kept) — `apps/web/src/components/chat/ChatComposer.tsx:815` ⟶ ✓ #composer

## Model & effort

Files: `components/chat/ComposerControlsBar.tsx`, `ComposerFooterControls.tsx`, `ProviderModelPicker.tsx`, `ModelPickerContent.tsx`, `ModelPickerSidebar.tsx`, `ModelListRow.tsx`, `modelPickerSearch.ts`, `modelPickerKeys.ts`, `ChatGptSharingControl.tsx`, `TraitsPicker.tsx`, `TraitsSpeed.tsx`, `EffortGlyph.tsx`, `composerProviderState.tsx`, `useComposerSelection.ts`, `useMultipleModelSend.ts`, `ContextWindowMeter.tsx`, `ContextWindowMeter.logic.ts`, `ProviderInstanceIcon.tsx`, `apps/web/src/modelPickerVisibility.ts`, `components/ChatView.logic.ts`.

- **CO-128** Footer order: model picker, then resting blocks [traits/effort, mode]; blocks that do not fit move into a "More composer controls" overflow (last block overflows first; overflow never exists empty) — `apps/web/src/components/chat/ComposerControlsBar.tsx:309` ⟶ ✓ #composer
- **CO-129** Model + effort render as text controls a word apart (hover/open brightens text, no box) — `apps/web/src/components/chat/ComposerControlsBar.tsx:38` ⟶ ✓ #composer
- **CO-130** No provider: picker replaced by alert control "Open provider settings" (navigates to `/settings/providers?instanceId`) or disabled "No provider available" — `apps/web/src/components/chat/ComposerControlsBar.tsx:293` ⟶ ✓ #composer
- **CO-131** Picker disabled while provider catalog pending or a send is busy; shows thread's last model meanwhile — `apps/web/src/components/chat/ComposerControlsBar.tsx:251` ⟶ ✓ #composer
- **CO-132** Model picker trigger: provider icon (instance initials badge when several instances of a driver) + model short name; tooltip "<full name> · <shortcut>"; aria-label full name — `apps/web/src/components/chat/ProviderModelPicker.tsx:186` ⟶ ✓ #composer
- **CO-133** Trigger fallback "Choose model" (no model / Antigravity default model); unavailable model gets " (Unavailable)" in label and an "Unavailable" badge — `apps/web/src/components/chat/ProviderModelPicker.tsx:114` ⟶ ✓ #composer
- **CO-134** Multi-model trigger: stacked icons (max 3, "+N"), label first two names ", N more", empty "Choose models" — `apps/web/src/components/chat/ProviderModelPicker.tsx:161` ⟶ ✓ #composer
- **CO-135** Shortcut `modelPicker.toggle` Mod+Shift+M (not in terminal) opens/closes picker — `packages/shared/src/keybindings.ts:206` ⟶ ✓ #composer
- **CO-136** Picker popover: left provider sidebar (aria "Providers"), Favorites star tab, search box "Search models...", virtualized list with scroll fades; touch backdrop; locks background scroll — `apps/web/src/components/chat/ModelPickerContent.tsx:827` ⟶ ✓ #composer
- **CO-137** Opens on Favorites tab if any favorites, else active provider (locked thread / unavailable / needs-setup always opens active provider) — `apps/web/src/components/chat/ModelPickerContent.tsx:428` ⟶ ✓ #composer
- **CO-138** Sidebar provider buttons: tooltips "<Name>: Disabled in settings." / "<Name>: Unavailable|Limited|Not ready. <message>" — `apps/web/src/components/chat/ModelPickerSidebar.tsx:14` ⟶ ✓ #composer
- **CO-139** Locked thread (started, no provider handoff): other providers disabled with tooltip "<Name> is unavailable in this thread. Start a new thread to switch providers." — `apps/web/src/components/chat/ModelPickerContent.tsx:852` ⟶ ✓ #composer
- **CO-140** Per-model disabled reason "<desc> Start a new thread to use this model." shown as left tooltip on row — `apps/web/src/components/ChatView.logic.ts:1345` ⟶ ✓ #composer
- **CO-141** Selecting a blocked model toasts warning "Start a new chat to switch providers" / "This thread does not support switching providers after it has started." — `apps/web/src/components/ChatView.logic.ts:938` ⟶ ✓ #composer
- **CO-142** Model row: name, "New" badge (aria "New model"), "Unavailable" badge, provider sub-line when mixing providers/sub-provider, jump-key Kbd, check mark when selected — `apps/web/src/components/chat/ModelListRow.tsx:53` ⟶ ✓ #composer
- **CO-143** Row star toggle "Add to favorites" / "Remove from favorites" (per environment) — `apps/web/src/components/chat/ModelListRow.tsx:106` ⟶ ✓ #composer
- **CO-144** "Legacy models" collapsible row "<n> models" per provider (auto-expanded if current model is legacy) — `apps/web/src/components/chat/ModelPickerContent.tsx:981` ⟶ ✓ #composer
- **CO-145** Search ranks across name, short name, sub-provider, driver, provider name; favorites boosted; exact name wins — `apps/web/src/components/chat/modelPickerSearch.ts:12` ⟶ ✓ #composer
- **CO-146** Empty states "No favorites yet" / "No models found" — `apps/web/src/components/chat/ModelPickerContent.tsx:1035` ⟶ ✓ #composer
- **CO-147** Provider needs setup: status message + "Open provider setup" (or "Set up <Name>" when several) — `apps/web/src/components/chat/ModelPickerContent.tsx:226` ⟶ ✓ #composer
- **CO-148** Provider update-required notice + "Provider settings" link — `apps/web/src/components/chat/ModelPickerContent.tsx:246` ⟶ ✓ #composer
- **CO-149** Picker keys: Enter selects highlighted; Shift+Enter/Shift+click adds model (multi); Escape closes; ArrowLeft (empty query) or Shift+Tab focuses sidebar — `apps/web/src/components/chat/ModelPickerContent.tsx:914` ⟶ ✓ #composer
- **CO-150** Mod+Shift+ArrowUp/Down switch provider tab (announced "Favorites"/provider name) — `packages/shared/src/keybindings.ts:214` ⟶ ✓ #composer
- **CO-151** Mod+1..9 jump to the Nth enabled visible model while picker open (desktop only); announces "Model: <name>" — `packages/shared/src/keybindings.ts:228` ⟶ ✓ #composer
- **CO-152** Disabled picker reason "Model picker is disabled" — `apps/web/src/components/chat/ProviderModelPicker.tsx:307` ⟶ ✓ #composer
- **CO-153** Codex/ChatGPT plan footer in picker: "Using ChatGPT plan" + usage button (single-model mode only) — `apps/web/src/components/chat/ChatGptSharingControl.tsx:13` ⟶ ✓ #composer
- **CO-154** Model pick remembers per-model sticky options and becomes the sticky default for new drafts — `apps/web/src/components/chat/useComposerSelection.ts:186` ⟶ ✓ #composer
- **CO-155** Multiple models (draft route only, server capability `requiredWorktreeBootstrap`): Shift-pick toggles models; picking normally resets to one — `apps/web/src/components/chat/ComposerFooterControls.tsx:358` ⟶ ✓ #composer
- **CO-156** Multi-model send block "Select at least one model." — `apps/web/src/components/chat/ChatComposer.tsx:919` ⟶ ✓ #composer
- **CO-157** Multi-model send toasts "Started N thread(s) in background"; failure "A background prompt could not be sent" / "Your newer draft is unchanged. Restore the failed prompt when this composer is empty." + "Restore prompt" — `apps/web/src/components/chat/useMultipleModelSend.ts:219` ⟶ ✓ #composer
- **CO-158** Effort/traits chip (composer-owned): effort bars glyph (one bar per level, filled to current) or word per Settings `effortDisplay`; Max/Ultracode/Ultrathink always named — `apps/web/src/components/chat/TraitsPicker.tsx:603` ⟶ ✓ #composer
- **CO-159** Effort chip tooltip/aria "Effort: <level> · <speed> · Permissions: <mode> · <shortcut>" — `apps/web/src/components/chat/TraitsPicker.tsx:601` ⟶ ✓ #composer
- **CO-160** Speed indicator: bolt for "Fast", double bolt for "Ultrafast" next to effort — `apps/web/src/components/chat/TraitsPicker.tsx:685` ⟶ ✓ #composer
- **CO-161** Secondary traits (e.g. context window, agent) shown as small "a · b" label, dropped first when narrow — `apps/web/src/components/chat/TraitsPicker.tsx:687` ⟶ ✓ #composer
- **CO-162** Non-glyph fallback: gauge icon + label (Codex style truncates) — `apps/web/src/components/chat/TraitsPicker.tsx:698` ⟶ ✓ #composer
- **CO-163** Effort menu: one radio group per select descriptor (Effort / Reasoning effort / Reasoning / Agent / Context window…), option description, "Default" badge — `apps/web/src/components/chat/TraitsPicker.tsx:430` ⟶ ✓ #composer
- **CO-164** Boolean traits (Fast mode, Thinking) as "On"/"Off" radio pair — `apps/web/src/components/chat/TraitsPicker.tsx:480` ⟶ ✓ #composer
- **CO-165** Effort menu always ends with the Permissions section — `apps/web/src/components/chat/ComposerControlsBar.tsx:171` ⟶ ✓ #composer
- **CO-166** Claude Ultrathink: picking it prefixes prompt "Ultrathink:"; typing "ultrathink" in body locks option with "Your prompt contains "ultrathink" in the text. Remove it to change this option." — `apps/web/src/components/chat/TraitsPicker.tsx:444` ⟶ ✓ #composer
- **CO-167** Ultrathink active: rainbow composer frame (`ultrathink-frame`) and chroma model icon — `apps/web/src/components/chat/composerProviderState.tsx:158` ⟶ ✓ #composer
- **CO-168** Unavailable OpenCode model: traits menu shows saved options read-only (label + value) — `apps/web/src/components/chat/TraitsPicker.tsx:404` ⟶ ✓ #composer
- **CO-169** `composer.effort` Mod+Shift+E opens effort menu; `composer.increaseEffort`/`decreaseEffort` step level (no default keys; blocked with no provider, pending question, or editing queued message; skips Ultrathink on slash commands) — `apps/web/src/components/chat/ChatComposer.tsx:2816` ⟶ ✓ #composer
- **CO-170** Speed labels: fastMode boolean → "Fast"/"Normal"; Codex `serviceTier` → "Fast"/"Ultrafast"/"Normal"; sr-only "Fast mode on"/"Ultrafast mode on"; Claude bolt tinted orange — `apps/web/src/components/chat/TraitsSpeed.tsx:8` ⟶ ✓ #composer
- **CO-171** Context window meter: 20px ring (red over 90%), aria "Context window N% used" / "Context window N tokens used"; hover-opens popover — `apps/web/src/components/chat/ContextWindowMeter.tsx:42` ⟶ ✓ #composer
- **CO-172** Meter popover: "Context Window", "N% · used/max", progress bar, "Total processed", "Cost", auto-compaction note — `apps/web/src/components/chat/ContextWindowMeter.tsx:100` ⟶ ✓ #composer
- **CO-173** Auto-compaction copy: "Compacts automatically at about N tokens." / "Context for <model> compacts automatically when needed." — `apps/web/src/components/chat/ContextWindowMeter.logic.ts:107` ⟶ ✓ #composer
- **CO-174** "Compact context" button in popover (providers exposing `/compact`), disabled with reason e.g. "Compacting is unavailable right now" — `apps/web/src/components/chat/ContextWindowMeter.tsx:156` ⟶ ✓ #composer
- **CO-175** Meter placeholder reserves 28px while loading/started when provider reports context; meter toggleable in Settings (`contextWindowMeterEnabled`) — `apps/web/src/components/chat/ComposerFooterControls.tsx:294` ⟶ ✓ #composer

## Mode & permissions

Files: `components/chat/ComposerFooterControls.tsx`, `runtimeModeConfig.ts`, `CompactComposerControlsMenu.tsx`, `ComposerControl.tsx`, `composerControlsOwnership.ts`, `useComposerSelection.ts`, `components/ComposerContextPermissions.tsx`, `components/ChatView.logic.ts`.

- **CO-176** Interaction mode toggle (pressed state): BotIcon "Build" / PencilRuler "Plan"; label hidden on xs/mobile — `apps/web/src/components/chat/ComposerFooterControls.tsx:57` ⟶ ✓ #composer
- **CO-177** Toggle tooltip "Plan mode. Click to return to normal build mode" / "Default mode. Click to enter plan mode" — `apps/web/src/components/chat/ComposerFooterControls.tsx:52` ⟶ ✓ #composer
- **CO-178** Plan toggle shown only if Settings plan mode on and provider `showInteractionModeToggle` ≠ false; otherwise mode forced to default — `apps/web/src/components/ChatView.logic.ts:542` ⟶ ✓ #composer
- **CO-179** Overflow menu "Mode" radio "Chat" / "Plan" (note: inline toggle says "Build") — `apps/web/src/components/chat/CompactComposerControlsMenu.tsx:72` ⟶ ✓ #composer
- **CO-180** No default keybinding for plan toggle; `composer.mode` opens Permissions — `packages/shared/src/keybindings.ts:209` ⟶ ✓ #composer
- **CO-181** Permission modes: "Supervised" (Ask before commands and file changes.), "Auto-accept edits" (Auto-approve edits, ask before other actions.), "Auto" (Supported providers approve routine actions; others still ask.), "Full access" (Allow commands and edits without prompts.) — `apps/web/src/components/chat/runtimeModeConfig.ts:4` ⟶ ✓ #composer
- **CO-182** Modes filtered by provider `supportedRuntimeModes`; unsupported current mode falls back to first supported — `apps/web/src/components/chat/runtimeModeConfig.ts:33` ⟶ ✓ #composer
- **CO-183** Permissions chip: icon + label; tooltip "Permissions: <label>. <description>"; aria "Permissions: <label>"; opens menu — `apps/web/src/components/chat/ComposerFooterControls.tsx:97` ⟶ ✓ #composer
- **CO-184** Chip hidden while mode equals project default (or new-thread strip names it); icon-only when collapsed; emphasized color when non-default — `apps/web/src/components/chat/composerControlsOwnership.ts:16` ⟶ ✓ #composer
- **CO-185** Permissions section: "Permissions" header, segmented icon row of radio items (Left/Right arrows move), hover/focus previews name + description below — `apps/web/src/components/chat/ComposerFooterControls.tsx:162` ⟶ ✓ #composer
- **CO-186** Permissions has exactly one visible home: chip, effort menu, or overflow menu; `composer.mode` targets whichever owns it — `apps/web/src/components/chat/composerControlsOwnership.ts:1` ⟶ ✓ #composer
- **CO-187** `composer.mode` Mod+Shift+A focuses + clicks owning trigger and focuses Permissions — `apps/web/src/components/chat/ChatComposer.tsx:2872` ⟶ ✓ #composer
- **CO-188** Overflow trigger "More composer controls" (ellipsis) holds traits, Mode, Permissions as needed — `apps/web/src/components/chat/CompactComposerControlsMenu.tsx:47` ⟶ ✓ #composer
- **CO-189** New-thread strip trailing chip: mode icon + label, tooltip "Permissions · <shortcut>", opens permissions (drafts only) — `apps/web/src/components/ComposerContextPermissions.tsx:12` ⟶ ✓ #composer
- **CO-190** Mode/permission changes persist to draft (and local draft thread context), then refocus composer — `apps/web/src/components/chat/useComposerSelection.ts:93` ⟶ ✓ #composer

## Workspace/branch/environment

Files: `components/BranchToolbar.tsx`, `BranchToolbarBranchSelector.tsx`, `BranchToolbarEnvironmentSelector.tsx`, `BranchToolbarEnvModeSelector.tsx`, `BranchToolbar.logic.ts`, `BranchPicker.tsx`, `PreviousWorktreeItemContent.tsx`, `ComposerContextLabel.tsx`, `ContextChip.tsx`, `contextChipParts.tsx`, `composerContextPresentation.tsx`, `EnvironmentContextChip.tsx`, `ThreadContextChip.tsx`, `composerFooterLayout.ts`, `components/chat/composerShortcuts.ts`.

- **CO-191** Context strip below composer: shown for new threads always (with project), for active threads only if Settings "persist strip" and git repo or env indicator — `apps/web/src/components/BranchToolbar.logic.ts:63` ⟶ ✓ #composer
- **CO-192** Strip labels collapse to icons when overflowing (16px hysteresis, animated width) — `apps/web/src/components/BranchToolbar.logic.ts:81` ⟶ ✓ #composer
- **CO-193** Narrow strip (<@3xl): single "Run context" menu combining "Run on" machines and "Workspace" — `apps/web/src/components/BranchToolbar.tsx:299` ⟶ ✓ #composer
- **CO-194** Wide strip: separate Environment select, vertical separator, Workspace select, branch picker right-aligned, trailing permissions — `apps/web/src/components/BranchToolbar.tsx:747` ⟶ ✓ #composer
- **CO-195** Environment select "Run on": "Auto balance" (load-balancing drafts), machines with machine icons, "Add to another machine"; aria "Run on" — `apps/web/src/components/BranchToolbarEnvironmentSelector.tsx:104` ⟶ ✓ #composer
- **CO-196** Environment indicator shown when picking possible or active env is non-primary; locked env = static label + tooltip — `apps/web/src/components/BranchToolbar.logic.ts:55` ⟶ ✓ #composer
- **CO-197** Local machine label fallback "This device" — `apps/web/src/components/BranchToolbar.logic.ts:49` ⟶ ✓ #composer
- **CO-198** `composer.host` Mod+Shift+H opens Run on; `composer.cycleHost` (no default key) cycles machines — `apps/web/src/components/ChatView.tsx:2664` ⟶ ✓ #composer
- **CO-199** Workspace select (aria "Workspace"): "Current checkout"/"Current worktree", "New worktree", "Previous worktree (<branch>)" — `apps/web/src/components/BranchToolbarEnvModeSelector.tsx:119` ⟶ ✓ #composer
- **CO-200** Locked workspace (started thread in worktree / env locked): static "Worktree" / "Local checkout" / "New worktree" — `apps/web/src/components/BranchToolbar.logic.ts:105` ⟶ ✓ #composer
- **CO-201** Multi-model send forces new worktree; tooltip "Each model starts in its own worktree."; workspace changes ignored — `apps/web/src/components/BranchToolbarEnvModeSelector.tsx:99` ⟶ ✓ #composer
- **CO-202** `composer.workspace` Mod+Shift+X; `composer.previousWorktree` Mod+Shift+L reuses previous worktree (drafts) — `packages/shared/src/keybindings.ts:210` ⟶ ✓ #composer
- **CO-203** Branch picker trigger (git icon + middle-truncated label): branch name, "From <branch>" / "From <branch> (remote)" for new worktree, "Select ref"; disabled while loading/acting — `apps/web/src/components/BranchToolbar.logic.ts:199` ⟶ ✓ #composer
- **CO-204** Branch picker popover: "Search refs...", status "Loading refs..." / "Loading more refs..." / "Showing N of M refs", infinite load — `apps/web/src/components/BranchToolbarBranchSelector.tsx:319` ⟶ ✓ #composer
- **CO-205** Picker extra items: "Checkout <PR term>" (paste a PR ref) and "Create new ref "<name>"" — `apps/web/src/components/BranchToolbarBranchSelector.tsx:599` ⟶ ✓ #composer
- **CO-206** "Start from remote" switch (aria "Start worktree from remote") with long tooltip, when choosing a new-worktree base — `apps/web/src/components/BranchPicker.tsx:216` ⟶ ✓ #composer
- **CO-207** Branch context menu "Copy branch name" → toasts "Branch name copied" / "Failed to copy branch name" — `apps/web/src/components/BranchToolbarBranchSelector.tsx:355` ⟶ ✓ #composer
- **CO-208** Branch errors: "Action unavailable" (This connection cannot change the thread's branch.), "Failed to switch ref.", "Failed to create and switch ref." — `apps/web/src/components/BranchToolbarBranchSelector.tsx:370` ⟶ ✓ #composer
- **CO-209** PR badge control left of branch (opens PR link or right-panel PR list) — `apps/web/src/components/BranchToolbarBranchSelector.tsx:689` ⟶ ✓ #composer
- **CO-210** `composer.branch` Mod+Shift+G opens branch picker — `apps/web/src/components/chat/composerShortcuts.ts:31` ⟶ ✓ #composer
- **CO-211** Workspace right-click (panel layout, desktop) "Copy full path" → "Path copied" / "Failed to copy path" — `apps/web/src/components/BranchToolbar.tsx:112` ⟶ ✓ #composer
- **CO-212** Same toolbar renders as thread details panel rows (`layout="panel"`, aria "Run context: …") — `apps/web/src/components/BranchToolbar.tsx:654` ⟶ ✓ #composer
- **CO-213** Inline machine mention chip: machine icon + label, aria "Machine, <label>", tooltip "T3 Code environment" / "Machine not in this app" — `apps/web/src/components/EnvironmentContextChip.tsx:12` ⟶ ✓ #composer
- **CO-214** Inline thread chip: project favicon + title (links to thread), tooltip "Open thread" / "Thread no longer available" / unreadable "On another machine, so this machine's agent can't read it. Remove it or switch back to send." — `apps/web/src/components/ThreadContextChip.tsx:11` ⟶ ✓ #composer
- **CO-215** ContextChip kinds/accents (image, video, file, mention, terminal, PR states, skill, thread, environment, citation, docs) and states unresolved/invalid — `apps/web/src/components/ContextChip.tsx:8` ⟶ ✓ #composer
- **CO-216** Footer compacts below 620px (780px with wide actions) — `apps/web/src/components/composerFooterLayout.ts:1` ⟶ ✓ #composer

## Send/stop/queue/stash

Files: `apps/web/src/components/chat/ComposerPrimaryActions.tsx`, `apps/web/src/components/chat/ComposerFooterControls.tsx`, `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/chat/useComposerSend.ts`, `apps/web/src/components/chat/composerSend.logic.ts`, `apps/web/src/components/chat/useComposerResume.ts`, `apps/web/src/components/chat/useMultipleModelSend.ts`, `apps/web/src/components/chat/useProposedPlanSend.ts`, `apps/web/src/components/chat/QueuedRunsControl.tsx`, `apps/web/src/components/chat/useQueuedRunEdit.ts`, `packages/client-runtime/src/queuedRunEdit.ts`, `apps/web/src/components/chat/ComposerStashBadge.tsx`, `apps/web/src/components/chat/ComposerStashMenu.tsx`, `apps/web/src/components/chat/useComposerStash.ts`, `packages/contracts/src/settings.ts`.

- **CO-217** Send button: round, 36px (32px at sm and up), up-arrow icon, aria-label and tooltip "Submit message". Disabled with no sendable content, while busy, when blocked, or when the environment is unavailable. Shows a spinner while busy and scales to 1.05 on hover — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:303` ⟶ ✓ #composer
- **CO-218** Send button status labels (these replace the label and tooltip): "Environment disconnected", any send-disabled reason, "Preparing worktree", "Submitting message", "Updating queued message" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:285` ⟶ ✓ #composer
- **CO-219** Send-disabled reasons passed in by the host: "This connection cannot change threads.", "Preparing machine", "Rewinding conversation", "Sending feedback", "Messages loading", "Preparing worktree", the project-clone reason — `apps/web/src/components/ChatView.tsx:3510` ⟶ ✓ #composer
- **CO-220** Stage-backdrop variant: the send button paints the sidebar stage art (environment identification mode) instead of a solid fill — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:308` ⟶ ✓ #composer
- **CO-221** Stop button: red round button with a square glyph, aria-label "Stop generation", tooltip "Interrupt". Shown while running when there is nothing to send — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:127` ⟶ ✓ #composer
- **CO-222** Running with text typed: steer or queue. Label "Steer message" (CornerUpRight icon) or "Queue message" (ListPlus icon), and the icons morph. Holding ⌘/Ctrl switches to the alternate action live — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:115` ⟶ ✓ #composer
- **CO-223** Tooltip while running: "Click to <steer|queue>, ⌘-click (Ctrl-click) or <composer.sendAlternate shortcut> to <queue|steer>" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:300` ⟶ ✓ #composer
- **CO-224** Follow-up default comes from setting `followUpBehavior`, "queue" or "steer" (default "steer"). It is forced to "steer" while an approval is shown, because sending declines and redirects. Steering is disabled while compacting — `apps/web/src/components/chat/ChatComposer.tsx:1154` ⟶ ✓ #composer
- **CO-225** Resume: Play icon button "Resume thread" when the run was interrupted or queued turns are held, and the draft is empty. It sends "Continue where you left off." and/or releases the held queue — `apps/web/src/components/chat/useComposerResume.ts:130` ⟶ ✓ #composer
- **CO-226** Compact-and-send: when resuming would exceed the context window, a "Compact <N>" / "Keep <N>" toggle pill (Minimize2 icon, `aria-pressed`) sits left of send. Aria: "Compact <N> tokens of history before sending" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:357` ⟶ ✓ #composer
- **CO-227** Compact toggle tooltip: "Next send compacts <N> tokens first." / "Next send keeps all <N> tokens.", plus "Click to keep full history" / "Click to compact first". The send label becomes "Compact and send" with tooltip "Summarize <N> tokens of history, then send" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:377` ⟶ ✓ #composer
- **CO-228** Manual compact (context meter or command) does nothing when an approval or question is pending, a turn is running, the composer is busy, there is no provider, or the operate scope is missing. With no provider: "Compacting is unavailable right now" — `apps/web/src/components/chat/ChatComposer.tsx:2138` ⟶ ✓ #composer
- **CO-229** Plan follow-up primary: "Implement" split button with a chevron menu (aria "Implementation actions") holding "Implement in a new thread". With text typed it becomes "Refine". Shows "Sending..." while busy — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:204` ⟶ ✓ #composer
- **CO-230** Pending question primary: "Previous" (outline; compact form is a chevron icon, "Previous question"), then "Next question" / "Submit answer" / "Submit answers" (compact "Next" / "Submit"), "Submitting...". The stop button stays beside it when the turn is interruptible — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:154` ⟶ ✓ #composer
- **CO-231** Editing a queued message: the send button shows a Check icon and the label "Update queued message" — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:276` ⟶ ✓ #composer
- **CO-232** Background send (new draft): starts the thread in the background and opens a fresh composer. Toast "Started in background" with an "Open" action (5s). Errors: "Could not open a fresh composer", "Background task failed" / "Could not start thread" — `apps/web/src/components/chat/useComposerSend.ts:1351` ⟶ ✓ #composer
- **CO-233** Send toast: "Not connected: message not sent" — "Reconnecting to the environment. Try again once it is connected." (rotating toast slots) — `apps/web/src/components/chat/useComposerSend.ts:467` ⟶ ✓ #composer
- **CO-234** Send toast: "Annotation attached to draft" — "Sending is unavailable right now. Finish the current action, then send." — `apps/web/src/components/chat/useComposerSend.ts:427` ⟶ ✓ #composer
- **CO-235** Send toasts: "Still compressing a pasted image." / "Still bringing attached context into this message.", with "Send again once its thumbnail appears." / "Send again once its chip resolves." — `apps/web/src/components/chat/ChatComposer.tsx:2063` ⟶ ✓ #composer
- **CO-236** Load-balancing send warning: "Checking machine resources" / "Choose a machine to continue", with "No machine can read every attached thread…" / "No eligible machine has available resources…" — `apps/web/src/components/chat/composerSend.logic.ts:22` ⟶ ✓ #composer
- **CO-237** Cross-machine block: "Attached thread is on another machine" — "This machine's agent can't read "<title>". Remove it, or switch back to <owner> to send." — `apps/web/src/components/chat/useComposerSend.ts:562` ⟶ ✓ #composer
- **CO-238** Approval redirect: if the decline did not land cleanly, an info toast shows the notice plus "Send again when it's ready." — `apps/web/src/components/chat/useComposerSend.ts:1079` ⟶ ✓ #composer
- **CO-239** Missing project: "Choose a project first" — "This draft no longer points to an available project." — `apps/web/src/components/chat/useComposerSend.ts:771` ⟶ ✓ #composer
- **CO-240** Codex feedback submitted before a thread exists: "Start a Codex thread first" — "Send a message before you submit feedback." (Codex only) — `apps/web/src/components/chat/useComposerSend.ts:617` ⟶ ✓ #composer
- **CO-241** Multiple models (drafts only, on servers with worktree bootstrap). Blocks: "Select at least one model."; "Choose models and a base branch" — "Multiple models need a new thread in a Git project. Each gets its own worktree."; "Update this server before starting multiple models." — `apps/web/src/components/chat/useComposerSend.ts:512` ⟶ ✓ #composer
- **CO-242** Multiple-model results: "Started <n> thread(s) in background". On failure: "A background prompt could not be sent" with a persistent "Restore prompt" action — `apps/web/src/components/chat/useMultipleModelSend.ts:219` ⟶ ✓ #composer
- **CO-243** Implement-plan-in-new-thread failure: "Could not start implementation thread" — `apps/web/src/components/chat/useProposedPlanSend.ts:385` ⟶ ✓ #composer
- **CO-244** On send, an optimistic user message is added with intent `queued_turn` or `steer`. The send waits behind worktree setup when needed — `apps/web/src/components/chat/useComposerSend.ts:1138` ⟶ ✓ #composer
- **CO-245** Queue list above the composer (server threads): dashed bubbles for unsent turns, aria "<n> queued message(s)", items "Queued message <i> of <n>, not sent". Also "Sent by T3 Code", folded automation/agent rows, guest name — `apps/web/src/components/chat/QueuedRunsControl.tsx:228` ⟶ ✓ #composer
- **CO-246** Queue item "Send now" (ArrowUp). Tooltip: "Start a turn with this message" / "Skip compaction and send this message" / "Send into the current turn", plus the thread.steerQueuedMessage shortcut on the first item — `apps/web/src/components/chat/QueuedRunsControl.tsx:266` ⟶ ✓ #composer
- **CO-247** Queue item edit: pencil, "Edit queued message", tooltip "Edit in the composer (<thread.editQueuedMessage>)". Blocked reason: "Answer the question to edit queued messages". While editing: "Editing in the composer" and "Cancel" — `apps/web/src/components/chat/QueuedRunsControl.tsx:310` ⟶ ✓ #composer
- **CO-248** Queue item remove: X, "Remove queued message", tooltip "Remove from queue". A "Saving" clock shows while pending. Collapse toggle: "Show all <n> queued" / "Show fewer" — `apps/web/src/components/chat/QueuedRunsControl.tsx:340` ⟶ ✓ #composer
- **CO-249** Queued edit lost: "Queued message is no longer queued" — "Your unsaved edit… was kept in the composer." / "…was discarded." — `apps/web/src/components/chat/useQueuedRunEdit.ts:273` ⟶ ✓ #composer
- **CO-250** Stash badge (shoulder tab above the card, right side): Bookmark icon, "Stash", count. Aria: "Stashed prompts: <n>. Open stash.". Pulses once on each stash — `apps/web/src/components/chat/ComposerStashBadge.tsx:30` ⟶ ✓ #composer
- **CO-251** Stash menu (banner-styled list): header "Stash" ("Close stash"). Rows: "Restore stashed prompt: <snippet>" ("(empty)" when there is no text), attachment count, up to 3 image thumbnails, file count, relative time (hidden on mobile), delete X "Delete stashed prompt" — `apps/web/src/components/chat/ComposerStashMenu.tsx:130` ⟶ ✓ #composer
- **CO-252** Stash menu states: "Nothing stashed yet. Press <composer.stash> with a prompt in the composer to stash it."; "saving <n> image(s)…"; "<n> image(s) dropped" (warning) — `apps/web/src/components/chat/ComposerStashMenu.tsx:146` ⟶ ✓ #composer
- **CO-253** Stash menu keys: ↑/↓ highlight, Enter restores, ⌘/Ctrl+Backspace deletes, Escape closes (window capture listener) — `apps/web/src/components/chat/ComposerStashMenu.tsx:72` ⟶ ✓ #composer
- **CO-254** Stash shortcut on an empty composer restores the only entry, or toggles the menu if there are several. With content, it saves the draft (text, images, files, thread/terminal/review/preview contexts) and clears the composer — `apps/web/src/components/chat/useComposerStash.ts:446` ⟶ ✓ #composer
- **CO-255** Stash toasts: "Could not stash this prompt", "Stashed prompt will not survive a reload", "Attach dropped files again or remove them before stashing", "Wait for file uploads before stashing this prompt", "Still bringing attached context into this message." with "Stash again once its chip resolves." — `apps/web/src/components/chat/useComposerStash.ts:543` ⟶ ✓ #composer
- **CO-256** Restore/delete toasts: "Stashed files belong to another environment", "Restored prompt may reappear in the stash", "Some attachments were not restored" (stash size limit, or files kept for 24 hours), "Stash entry may come back" — `apps/web/src/components/chat/useComposerStash.ts:162` ⟶ ✓ #composer

## Banners

Files: `apps/web/src/components/chat/ComposerBanner.tsx`, `ComposerBannerStack.tsx`, `useSystemComposerBanners.tsx`, `useAutoBalanceUpdateBanner.tsx`, `ComposerUsageLimits.tsx`, `UsageLimitRecoveryBanner.tsx`, `ComposerFeedback.tsx`, `useProjectCloneBanner.tsx`, `ThreadActivityBanners.tsx`, `ComposerPendingUserInputPanel.tsx`, `ComposerPlanFollowUpBanner.tsx`, `ComposerServerUpdateStatus.tsx`, `ComposerPendingApprovalActions.tsx`, `ProviderStatusBanner.tsx`, `ThreadErrorBanner.tsx`, `ChatBannerLane.tsx`, `apps/web/src/components/ChatView.tsx`, `packages/client-runtime/src/state/threadFeedback.ts`.

- **CO-257** Banner dock: column of attached cards above the composer plus stash badge at the dock's side; cards join edge-to-edge and the last joins the composer — `apps/web/src/components/chat/ChatComposer.tsx:3141` ⟶ ✓ #composer
- **CO-258** Banner variants: default, error, info, success, warning; densities; parts Row/Icon/Content/Separator/Actions/Count/ToggleIcon/Dismiss/Scroll — `apps/web/src/components/chat/ComposerBanner.tsx:10` ⟶ ✓ #composer
- **CO-259** Fixed group order: "environment" cards first, then "attention"; fade-in 150ms (`starting:opacity-0`, reduced-motion off) — `apps/web/src/components/chat/ComposerBannerStack.tsx:28` ⟶ ✓ #composer
- **CO-260** Notice card: icon column, truncated title + muted description (description hidden under 400px container), actions, dismiss X (default aria "Dismiss warning"); error/warning get `role="alert"` — `apps/web/src/components/chat/ComposerBannerStack.tsx:126` ⟶ ✓ #composer
- **CO-261** Overflow details: info button appears when title/description truncate (aria "Show full title: {title}" / "Show details: {title}"), hover popover "Notice details" with full text — `apps/web/src/components/chat/ComposerBannerStack.tsx:52` ⟶ ✓ #composer
- **CO-262** Order assembled in ChatView: feedback, model fallback, limit recovery, usage limits, project clone, system (environment), branch mismatch — `apps/web/src/components/ChatView.tsx:2517` ⟶ ✓ #composer
- **CO-263** While a question is open only environment error/warning cards stay above the composer — `apps/web/src/components/chat/ChatComposer.tsx:2345` ⟶ ✓ #composer
- **CO-264** Environment offline/reconnecting card (environment group, wifi-off icon): "{label} is offline" / "{label} is reconnecting", diagnosis headline, actions "Reconnect" and "Disconnect server" (title "Hide this server's threads. Switch it on again in Environments."); suppressed during reconnect grace or running update — `apps/web/src/components/chat/useSystemComposerBanners.tsx:182` ⟶ ✓ #composer
- **CO-265** Reconnect/disconnect failure toasts "Could not reconnect environment" / "Could not disconnect server" — `apps/web/src/components/chat/useSystemComposerBanners.tsx:93` ⟶ ✓ #composer
- **CO-266** Server update card (running/failed only): "Updating {server}" / "Could not update {server}", stage label or failure message, action "Retry" (failed), dismiss "Dismiss update notice"; static download/alert icon (no spinner) — `apps/web/src/components/chat/useSystemComposerBanners.tsx:214` ⟶ ✓ #composer
- **CO-267** Auto-balance machines update card: "Update available for / Updating / Could not update N machine(s)" as popover trigger (aria "{title}. View machines") listing machines ("Manual update required", "Ready to update to {v}", "Reconnect this machine to update"); description "N need(s) a manual update"; action "Update all" / "Update N machines" / "Retry" — `apps/web/src/components/chat/useAutoBalanceUpdateBanner.tsx:83` ⟶ ✓ #composer
- **CO-268** Usage limits card (info, gauge icon): "Usage limits", account summary or "N accounts", expandable body with limit windows, "Manage usage" link, reset credits, notices; dismiss "Dismiss usage limits"; opened by usage-limits command — `apps/web/src/components/chat/ComposerUsageLimits.tsx:47` ⟶ ✓ #composer
- **CO-269** Account label reveal toggle (aria "Toggle account label visibility", "Click to reveal account" / "Click to hide account") — `apps/web/src/components/chat/ComposerUsageLimits.tsx:34` ⟶ ✓ #composer
- **CO-270** Model fallback card (draft only): "Using {fallback}" / "{provider} is out of usage · resets {time}", action "Use {default}", dismiss "Dismiss fallback model notice" — `apps/web/src/components/chat/ComposerUsageLimits.tsx:72` ⟶ ✓ #composer
- **CO-271** Usage limit recovery card (warning): "Usage limit reached", "Resets {time}" or "Reset time unavailable; retry manually"; actions "Resume at reset" / "Cancel auto-resume", "Snooze until reset" / "Wake now", "Saving..."; toasts "Could not snooze thread", "Could not change auto-resume" — `apps/web/src/components/chat/UsageLimitRecoveryBanner.tsx:26` ⟶ ✓ #composer
- **CO-272** Codex feedback card: "Sending feedback to OpenAI...", "Feedback sent to OpenAI" (success, "Thread ID: {id}", action "Copy ID"), "Could not send feedback to OpenAI" (error); dismiss "Dismiss feedback notice" (not while uploading) — Codex only — `apps/web/src/components/chat/ComposerFeedback.tsx:12` ⟶ ✓ #composer
- **CO-273** Project clone card: "Cloning {name}" + progress + "Cancel"; "Cancelled cloning {name}" ("Retry to bring in the repository.") / "Failed to clone {name}" with "Remove project" + "Retry"; file-copy failure card with failures list — `apps/web/src/components/chat/useProjectCloneBanner.tsx:60` ⟶ ✓ #composer
- **CO-274** Branch mismatch card (info, git-branch icon): "Branch changed from {branch}" with tooltip "This thread last ran on {a}. Sending will continue on {b}.", action "Restore branch" / "Restoring...", dismiss "Dismiss branch change notice" (session) — `apps/web/src/components/chat/ThreadActivityBanners.tsx:187` ⟶ ✓ #composer
- **CO-275** Pending user-input (question) drawer attached above composer: header row toggles collapse (title "Show/Hide the question and its options"), "i/N" count, dismiss "Dismiss question without answering"; markdown question; radio/checkbox options with label, description, Kbd 1–9 — `apps/web/src/components/chat/ComposerPendingUserInputPanel.tsx:186` ⟶ ✓ #composer
- **CO-276** Question digit shortcuts 1–9 select option (not while typing in an editable); single-select auto-advances after 200ms — `apps/web/src/components/chat/ComposerPendingUserInputPanel.tsx:155` ⟶ ✓ #composer
- **CO-277** Plan ready drawer: "Plan ready" + plan title when a plan follow-up is offered (hidden on collapsed mobile) — `apps/web/src/components/chat/ComposerPlanFollowUpBanner.tsx:13` ⟶ ✓ #composer
- **CO-278** Pending approvals: options "Approve", "Decline", "Cancel", "Always allow this session" (overflow "More approval options"); rendered in the timeline row, while the composer switches placeholder and steers to decline/redirect — `apps/web/src/components/chat/ComposerPendingApprovalActions.tsx:27` ⟶ ✓ #composer
- **CO-279** Provider status banner (top banner lane, not attached to composer): "{provider} is unauthenticated" / "{provider} {version} is known to be broken|unsupported" / "{provider} provider status"; messages "Open provider setup to sign in." (Antigravity: "…sign in with Google."), "Sign in via the CLI to authenticate again.", "Open provider setup to install {driver} on this environment.", "No models are available for this provider.", "{provider} provider is unavailable.", "…has limited availability."; dismiss "Dismiss {provider} provider {status}" — `apps/web/src/components/chat/ProviderStatusBanner.tsx:60` ⟶ ✓ #composer
- **CO-280** Thread error banner (top lane): expandable error text, dismiss "Dismiss error"; usage_limit class = warning; ChatGPT limit variant "ChatGPT usage limit reached" with "Copy request for admin" (toast "Request copied" / "Send it to your workspace admin.") or ChatGPT usage button — Codex/ChatGPT only — `apps/web/src/components/chat/ThreadErrorBanner.tsx:72` ⟶ ✓ #composer

## Disabled & error states

Files: `apps/web/src/components/chat/ChatComposer.tsx`, `ComposerPrimaryActions.tsx`, `ComposerControlsBar.tsx`, `ComposerPromptLengthValidation.tsx`, `composerSubmission.ts`, `composerAttachmentFiles.ts`, `composerProviderState.tsx`, `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/ChatView.logic.ts`, `apps/web/src/lib/attachmentUploadState.ts`, `apps/web/src/composerPlaceholder.ts`.

- **CO-281** Default placeholder "Ask anything. @ files, $ skills, / commands" — `apps/web/src/composerPlaceholder.ts:1` ⟶ ✓ #composer
- **CO-282** Placeholder ladder: approval "Send feedback to decline this request" / "Send a message to decline and redirect the agent"; question "Choose an option above" / "Type your own answer, or leave this blank to use the selected option"; plan "Add feedback to refine the plan, or leave this blank to implement it"; "Choose a project above to start a thread"; "Enable a provider in Settings to send a message" — `apps/web/src/components/chat/ChatComposer.tsx:3363` ⟶ ✓ #composer
- **CO-283** Editor disabled when project selection required, choice-only question, or answer submitting — `apps/web/src/components/chat/ChatComposer.tsx:3380` ⟶ ✓ #composer
- **CO-284** No project (local draft without project): surface at 75% opacity, placeholder asks to choose project, send disabled — `apps/web/src/components/chat/ChatComposer.tsx:3195` ⟶ ✓ #composer
- **CO-285** No provider available: model picker replaced by control "Open provider settings" (opens setup for first installable/unauthenticated instance) or disabled "No provider available", alert icon — `apps/web/src/components/chat/ComposerControlsBar.tsx:293` ⟶ ✓ #composer
- **CO-286** Provider catalog pending (server config not loaded): model picker disabled, shows thread's last model instead of "unavailable" — `apps/web/src/components/chat/ComposerControlsBar.tsx:251` ⟶ ✓ #composer
- **CO-287** Collapsed mobile prompt text with no provider: "Enable a provider in Settings" — `apps/web/src/components/chat/ChatComposer.tsx:3213` ⟶ ✓ #composer
- **CO-288** Compact unavailable with no provider: "Compacting is unavailable right now" — `apps/web/src/components/chat/ChatComposer.tsx:903` ⟶ ✓ #composer
- **CO-289** External send-disabled reasons (shown as send button aria/tooltip): "This connection cannot change threads.", "Preparing machine", "Rewinding conversation", "Sending feedback", "Messages loading", "Preparing worktree", "Cloning repository", "Repository not cloned", "Copying files" — `apps/web/src/components/ChatView.tsx:3503` ⟶ ✓ #composer
- **CO-290** Permission missing: `canOperateThread` from `AuthOrchestrationOperateScope`; send/stop/question submit/retry-upload disabled and submit guard re-checks scope — `apps/web/src/components/ChatView.tsx:417` ⟶ ✓ #composer
- **CO-291** Submit guard: blocks when no provider, send disabled, or operate scope missing — `apps/web/src/components/chat/ChatComposer.tsx:2048` ⟶ ✓ #composer
- **CO-292** Composite send-disabled reason: external, "Select at least one model." (multi-model with none), attachment block, Antigravity block — `apps/web/src/components/chat/ChatComposer.tsx:917` ⟶ ✓ #composer
- **CO-293** Attachment block reasons: "Update this server to send files with question answers", "Waiting for the server before file attachments can send", "This server does not accept file attachments right now. Remove the files to send.", "'{name}' exceeds the {size} attachment limit.", "Attach the interrupted file(s) again or remove it/them", "Attachment(s) still uploading" — `apps/web/src/components/chat/ChatComposer.tsx:771` ⟶ ✓ #composer
- **CO-294** File capability block helper — `apps/web/src/components/chat/composerAttachmentFiles.ts:135` ⟶ ✓ #composer
- **CO-295** Upload-pending block ("Attachment still uploading" / "Attachments still uploading"; failed uploads do not block, send retries) — `apps/web/src/lib/attachmentUploadState.ts:26` ⟶ ✓ #composer
- **CO-296** Send while compressing toast "Still compressing a pasted image." / "Send again once its thumbnail appears." — `apps/web/src/components/chat/ChatComposer.tsx:2059` ⟶ ✓ #composer
- **CO-297** Send while importing context toast "Still bringing attached context into this message." / "Send again once its chip resolves." — `apps/web/src/components/chat/ChatComposer.tsx:2068` ⟶ ✓ #composer
- **CO-298** Antigravity-only send blocks: "Install Antigravity in provider settings before sending.", "Sign in to Antigravity in provider settings before sending.", "Choose an Antigravity model before sending.", "Refresh Antigravity models in provider settings before sending.", "That Antigravity model is no longer available. Choose another model." — `apps/web/src/components/ChatView.logic.ts:557` ⟶ ✓ #composer
- **CO-299** Environment unavailable: send shows aria/tooltip "Environment disconnected" and is disabled (also used when no provider / project required); offline banner explains — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:285` ⟶ ✓ #composer
- **CO-300** Busy statuses on send button: "Preparing worktree", "Submitting message", "Updating queued message" with spinner — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:288` ⟶ ✓ #composer
- **CO-301** Plan "Refine"/"Implement"/"Implement in a new thread" disabled on busy, send-disabled or environment unavailable; "Sending..." label — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:204` ⟶ ✓ #composer
- **CO-302** Question submit disabled until answer complete/advanceable, attachment block, or images preparing — `apps/web/src/components/chat/ChatComposer.tsx:1212` ⟶ ✓ #composer
- **CO-303** Collapsed mobile send disabled when running, busy, send-disabled, no provider, no project, environment unavailable, or empty — `apps/web/src/components/chat/ChatComposer.tsx:1222` ⟶ ✓ #composer
- **CO-304** Prompt length validation: red `role="alert"` line under editor "Prompt is {n} character(s) over the 120,000-character limit. Shorten or split it before sending." (counts expanded citations) — `apps/web/src/components/chat/composerSubmission.ts:12` ⟶ ✓ #composer
- **CO-305** Validation line component (also shows provider-input rejection) — `apps/web/src/components/chat/ComposerPromptLengthValidation.tsx:1` ⟶ ✓ #composer
- **CO-306** Per-provider composer state: OpenCode with a model not in catalog drops effort and preserves raw options; Claude "ultrathink" prompt adds chromatic frame/icon classes — `apps/web/src/components/chat/composerProviderState.tsx:118` ⟶ ✓ #composer
- **CO-307** Insert rejection (busy composer): text/chip insertion refused while answer submitting, question without active question, or project selection required — `apps/web/src/components/chat/ChatComposer.tsx:2352` ⟶ ✓ #composer

## Keyboard

Files: `packages/contracts/src/keybindings.ts`, `packages/shared/src/keybindings.ts`, `apps/web/src/keybindings.ts`, `apps/web/src/composer-logic.ts`, `apps/web/src/components/chat/composerCommandKey.ts`, `apps/web/src/components/chat/composerShortcuts.ts`, `apps/web/src/components/chat/useChatShortcuts.ts`, `apps/web/src/components/ChatView.tsx`, `apps/web/src/components/settings/KeybindingsSettings.logic.ts`, `apps/web/src/components/settings/SettingsPanels.tsx`.

- **CO-308** Send shortcut setting "Send shortcut" ("Choose when Enter sends a prompt or inserts a new line"): "Enter" (default) / "⌘|Ctrl + Enter for multiline prompts" / "⌘|Ctrl + Enter always" — `apps/web/src/components/settings/SettingsPanels.tsx:1060` ⟶ ✓ #composer
- **CO-309** Enter sends (foreground); Shift+Enter / Alt+Enter newline; when modifier required, plain Enter inserts newline; key repeat and IME ignored — `apps/web/src/composer-logic.ts:58` ⟶ ✓ #composer
- **CO-310** On touch with software keyboard open, plain Enter never sends (newline); Cmd/Ctrl+Enter still sends — `apps/web/src/composer-logic.ts:71` ⟶ ✓ #composer
- **CO-311** composer.sendAlternate Mod+Enter (while a turn runs): opposite of follow-up behavior (queue↔steer); auto-shifts to Mod+Shift+Enter when send shortcut requires modifier. Label "Composer: Opposite Queue or Steer Action" — `packages/shared/src/keybindings.ts:185` ⟶ ✓ #composer
- **CO-312** composer.sendBackground Mod+Enter and Mod+Alt+Enter on a draft route: "Composer: Start in Background" (create thread without navigating) — `packages/shared/src/keybindings.ts:186` ⟶ ✓ #composer
- **CO-313** composer.sendAndNewThread Mod+Alt+Enter on an existing thread: "Composer: Send and Start New Thread" — `packages/shared/src/keybindings.ts:196` ⟶ ✓ #composer
- **CO-314** composer.stash Mod+S (not in terminal): stash draft / open stash — `packages/shared/src/keybindings.ts:182` ⟶ ✓ #composer
- **CO-315** thread.steerQueuedMessage Mod+Shift+Enter: "Queue: Send First Queued Message" — `packages/shared/src/keybindings.ts:183` ⟶ ✓ #composer
- **CO-316** thread.editQueuedMessage Alt+ArrowUp with caret at composer start: "Queue: Edit Last Queued Message" — `apps/web/src/components/ChatView.tsx:2676` ⟶ ✓ #composer
- **CO-317** modelPicker.toggle Mod+Shift+M; in picker Mod+Shift+ArrowUp/Down previous/next provider; Mod+1…9 jump to model (desktop) — `packages/shared/src/keybindings.ts:206` ⟶ ✓ #composer
- **CO-318** composer.host Mod+Shift+H opens environment/host picker — `packages/shared/src/keybindings.ts:207` ⟶ ✓ #composer
- **CO-319** composer.effort Mod+Shift+E opens traits/effort picker — `packages/shared/src/keybindings.ts:208` ⟶ ✓ #composer
- **CO-320** composer.mode Mod+Shift+A opens mode/permissions control (focuses permissions section) — `packages/shared/src/keybindings.ts:209` ⟶ ✓ #composer
- **CO-321** composer.workspace Mod+Shift+X opens local/worktree selector — `packages/shared/src/keybindings.ts:210` ⟶ ✓ #composer
- **CO-322** composer.branch Mod+Shift+G opens branch picker — `packages/shared/src/keybindings.ts:211` ⟶ ✓ #composer
- **CO-323** composer.previousWorktree Mod+Shift+L switches to previous worktree — `packages/shared/src/keybindings.ts:212` ⟶ ✓ #composer
- **CO-324** Unbound by default (assignable in Settings › Keybindings): composer.increaseEffort / composer.decreaseEffort (step effort, disabled with no provider, pending question, or editing a queued message), composer.cycleHost (cycle environments), thread.stop — `apps/web/src/components/chat/composerShortcuts.ts:21` ⟶ ✓ #composer
- **CO-325** Control chords target buttons via `data-composer-shortcut`, skipping hidden/inert ones; held keys don't repeat — `apps/web/src/components/chat/ChatComposer.tsx:2864` ⟶ ✓ #composer
- **CO-326** Shift+Tab toggles chat/plan mode (when plan mode enabled) — `apps/web/src/components/chat/composerCommandKey.ts:185` ⟶ ✓ #composer
- **CO-327** Menu open: ArrowUp/ArrowDown move highlight (wraps), Enter or Tab selects (first item if none highlighted), Escape closes — `apps/web/src/components/chat/composerCommandKey.ts:193` ⟶ ✓ #composer
- **CO-328** ArrowUp/ArrowDown on empty composer recall prompt history — `apps/web/src/components/chat/composerCommandKey.ts:215` ⟶ ✓ #composer
- **CO-329** Tab / Shift+Tab inside code block indent/outdent; Tab in text list indents — `apps/web/src/components/ComposerPromptEditorTiptap.tsx:1243` ⟶ ✓ #composer
- **CO-330** Mod+B bold (selection only); Mod+I italic, Mod+Shift+S strike (Tiptap defaults, rich mode; Mod+Shift+S also bound to thread.settle globally) — `apps/web/src/composer-rich-text-doc.ts:162` ⟶ ✓ #composer
- **CO-331** Mod+Shift+V paste as plain text — `packages/client-runtime/src/textPaste.ts:7` ⟶ ✓ #composer
- **CO-332** Shortcut hints rendered in tooltips via `shortcutLabelForCommand` (e.g. stash, sendAlternate, mode) — `apps/web/src/components/chat/ChatComposer.tsx:3269` ⟶ ✓ #composer

## Mobile/narrow

Files: `apps/web/src/components/chat/ChatComposer.tsx`, `apps/web/src/components/chat/useComposerRestingTransition.ts`, `apps/web/src/components/chat/useRestingComposerControlsLayout.ts`, `apps/web/src/components/composerFooterLayout.ts`, `apps/web/src/components/chat/ComposerPrimaryActions.tsx`.

- **CO-333** Collapsed mobile composer (max-sm): applies when the composer is unfocused, the prompt is a single line, no question is open, and it is not force-expanded — `apps/web/src/components/chat/ChatComposer.tsx:1022` ⟶ ✓ #composer
- **CO-334** Collapsed prompt row: tappable truncated prompt, or placeholder "Ask anything..." / "Enable a provider in Settings". Aria "Expand composer". A tap focuses the editor at the end — `apps/web/src/components/chat/ChatComposer.tsx:3201` ⟶ ✓ #composer
- **CO-335** Collapsed-row primary button (32px): up-arrow send or Play resume. Aria: "Send message" / "Resume thread" / "Open composer to compact and send" (expands instead of sending). Disabled while running, busy or blocked, with no provider or project, or when the environment is unavailable — `apps/web/src/components/chat/ChatComposer.tsx:3216` ⟶ ✓ #composer
- **CO-336** Collapsed image previews: up to 3 thumbnails plus an overflow count. "Show more" expands the composer — `apps/web/src/components/chat/ChatComposer.tsx:2262` ⟶ ✓ #composer
- **CO-337** Inline resting controls: a second row inside the collapsed card with muted xs composer controls (model and others). Hidden and inert until laid out. The model picker closes if the controls hide — `apps/web/src/components/chat/ChatComposer.tsx:3517` ⟶ ✓ #composer
- **CO-338** Animated height transition on collapse/expand (respects panel animation settings). The overlay height is published to the timeline — `apps/web/src/components/chat/ChatComposer.tsx:2274` ⟶ ✓ #composer
- **CO-339** Collapse on blur waits one frame. Focus inside the resting controls or their menus does not collapse — `apps/web/src/components/chat/ChatComposer.tsx:2710` ⟶ ✓ #composer
- **CO-340** The plan follow-up banner is hidden while collapsed. Pending questions keep the composer expanded — `apps/web/src/components/chat/ChatComposer.tsx:1164` ⟶ ✓ #composer
- **CO-341** Mobile pending-answer actions float bottom-right inside the editor (compact Previous/Next/Submit), and the footer is hidden on mobile — `apps/web/src/components/chat/ChatComposer.tsx:3384` ⟶ ✓ #composer
- **CO-342** On mobile, primary and compact buttons keep editor focus on pointer down, so the keyboard stays up — `apps/web/src/components/chat/ComposerPrimaryActions.tsx:110` ⟶ ✓ #composer
- **CO-343** Software-keyboard-open state feeds Enter handling (`isSoftwareKeyboardOpen`) — `apps/web/src/components/chat/ChatComposer.tsx:1011` ⟶ ✓ #composer
- **CO-344** Compact primary actions (narrow form with wide actions): shorter labels and an icon-only Previous — `apps/web/src/components/chat/ChatComposer.tsx:1494` ⟶ ✓ #composer

## Guest

Files: `apps/web/src/components/guest/GuestPage.tsx`, `apps/web/src/components/chat/GuestShareControls.tsx`, `apps/web/src/components/ChatView.tsx`.

- **CO-345** Guest join form: "Join a shared thread", "Your name" input (autofocus, max length), "Join" button, "The owner sees your name and approves each message before the agent gets it." — `apps/web/src/components/guest/GuestPage.tsx:318` ⟶ ✓ #composer
- **CO-346** Ended-link notices: "This link has ended or is not valid" / "Ask the owner for a new link. Each link works in one browser."; "This link has ended" / "The owner stopped sharing this thread." — `apps/web/src/components/guest/GuestPage.tsx:225` ⟶ ✓ #composer
- **CO-347** Guest composer: plain textarea (aria-label and placeholder "Message", 2 rows, grows to max-h-60, max length) in a rounded-3xl card — `apps/web/src/components/guest/GuestPage.tsx:723` ⟶ ✓ #composer
- **CO-348** Guest keys: Enter sends, Shift+Enter adds a line, IME composition is respected — `apps/web/src/components/guest/GuestPage.tsx:655` ⟶ ✓ #composer
- **CO-349** Guest attachments: paperclip "Attach files" (hidden multi-file input "Files to attach"), pasted images (other pasted files only when no text came along), drag & drop. Staged list "Attached files" shows image thumbnails or file icon/name/size, each with "Remove <name>" — `apps/web/src/components/guest/GuestPage.tsx:687` ⟶ ✓ #composer
- **CO-350** Read-only model label for guests (provider icon and model name, aria "Model: <full name>") — `apps/web/src/components/guest/GuestPage.tsx:566` ⟶ ✓ #composer
- **CO-351** Guest hint "The owner approves each message", or an inline error (role alert): file problems, "Something went wrong. Try again.", "Could not reach the server." — `apps/web/src/components/guest/GuestPage.tsx:750` ⟶ ✓ #composer
- **CO-352** Guest send button (round up-arrow, aria "Send"), disabled while sending or when empty. Text typed during the request is kept — `apps/web/src/components/guest/GuestPage.tsx:760` ⟶ ✓ #composer
- **CO-353** Guest message status under each bubble: "Waiting for approval" / "Sent" / "Not sent"; the guest's own name shows as "You" — `apps/web/src/components/guest/GuestPage.tsx:162` ⟶ ✓ #composer
- **CO-354** Owner side: pending guest messages listed above the composer ("<n> guest message(s) waiting"), each with "Dismiss" / "Send" ("Dismiss message from <name>", "Send message from <name>") — `apps/web/src/components/chat/GuestShareControls.tsx:272` ⟶ ✓ #composer
- **CO-355** Owner share dialog: "Share with guest", "Guest link" field, "Guest link expired" — `apps/web/src/components/chat/GuestShareControls.tsx:113` ⟶ ✓ #composer

## Observations

### Cross-cutting

- The composer is one 3.5k-line component (`ChatComposer.tsx`) holding every mode: normal send, steer/queue, approvals, agent questions, plan follow-up, queued-message editing, collapsed mobile. In the redesign, treat the primary action as a state machine with about 9 states (send, steer, queue, stop, resume, compact+send, implement/refine, question next/submit, update queued).
- Send-disabled reasons come from three layers: ChatView (connection, machine, rewind, loading, worktree), ChatComposer (attachments, multiple models, Antigravity) and PrimaryActions (environment disconnected, preparing, submitting). The user only sees them as the send button's tooltip or aria-label. There is no visible inline explanation.
- Messages for blocked or failed actions are split between toasts (send, stash, multiple models, load balancing) and inline text (length validation, guest error). Expect the redesign to need a rule for which goes where.
- The guest composer is a separate plain textarea. It shares only `ComposerControl` and the Enter/paste conventions: no rich text, mentions, model choice or stash.
- The stash and the queue look alike (banner-styled rows, dashed bubbles) but live in different places: stash above the card as a shoulder tab, the queue in the timeline above the composer.

### Editor, menus, keyboard

- Slash commands from the provider only appear at prompt start, but skills via `/skill:` appear anywhere; `$` trigger accepts any currency symbol (`€`, `£`), which may surprise.
- Four separate triggers (`@ / # $`) share one menu but only `@ $ /` are advertised in the placeholder; `#` PR mentions are undiscoverable.
- Effort step, cycle host and thread.stop have commands but no default bindings — dead discovery unless the user opens Keybindings.
- Mod+Enter has three meanings by context (alternate while running, background on drafts, send when modifier required) and auto-shifts to Mod+Shift+Enter; hard to communicate in UI.
- Rich vs plain mode remounts the editor; plain mode still has chips, so "plain" is really "no Markdown styling".
- Draft persistence is localStorage only (per browser/device); no cross-device draft sync.
- Prompt history recall is blocked by any attachment/context, silently.

### Attachments, banners, disabled states

- Pending approval buttons live in the timeline row (`TimelinePendingApprovalRow`), not the composer; the composer only changes its placeholder and steers instead of queueing. A redesign may want them in the composer drawer like questions.
- Provider status and thread error banners sit in the top `ChatBannerLane`, separate from the composer-attached stack, so problems show up in two places.
- Most disabled reasons only reach the user as the send button's aria-label/tooltip, with no visible text. Only prompt length gets an inline message, and attachment errors go to the thread error banner or toasts. The feedback is inconsistent.
- "Environment disconnected" is reused for no provider and no project because `isEnvironmentUnavailable` is OR-ed, so the label is wrong in those cases (`ChatComposer.tsx:3484`).
- Per-provider: Codex has the feedback and ChatGPT limit UI, Antigravity has send blocks and Google sign-in copy, OpenCode has the off-catalog model state, Claude has the ultrathink frame. Cursor, Grok and the rest have no special composer handling in these areas.

### Model, mode, workspace

- Per-provider: plan toggle on Claude, Codex, Cursor (OpenCode varies by presentation); off for Antigravity, Grok, others. Grok modes are Supervised/Auto/Full access only. OpenCode gets all four. Pi skips Auto. Providers that report no list get all modes.
- Effort is descriptor-driven, so there is no per-provider UI code. The provider-specific cases: Claude Ultrathink (a prompt prefix plus the frame), Codex serviceTier Fast/Ultrafast and the gauge style, Cursor's implicit `fastMode=false`, the OpenCode "agent" select (its plan agent is hidden when plan mode is off), and Antigravity send blocks ("Install Antigravity…", "Sign in to Antigravity…", "Choose an Antigravity model…", `ChatView.logic.ts:557`).
- The context meter only appears where the provider sets `reportsContextWindow` (Claude, Codex, Muse, Pi). Compact needs a `/compact` slash command.
- Copy is inconsistent: the inline toggle says "Build" and its tooltip "Default mode", while the overflow menu says "Chat". The mode shortcut opens Permissions, and the plan toggle has no shortcut.
- Permissions can live in 4 places (chip, effort menu, overflow, strip). The ownership rules are intricate and worth simplifying in the redesign.
- `increaseEffort`, `decreaseEffort` and `cycleHost` exist as commands but have no default bindings.
- Multi-model selection is discoverable only through Shift+click or Shift+Enter. There is no visible affordance.

Scope: `apps/web/src` (web and desktop renderer). Paths are relative to `apps/web/src/` unless they start with `packages/`. Status column (after ⟶) is left empty on purpose.

## Panel shell & tabs

Files: `components/RightPanelTabs.tsx`, `components/RightPanelSheet.tsx`, `components/chat/ChatRightPanel.tsx`, `components/chat/PanelLayoutControls.tsx`, `components/chat/RightPanelSurfaceContent.tsx`, `components/preview/PreviewPanelShell.tsx`, `components/preview/RightPanelResizeHandle.tsx`, `rightPanelStore.ts`, `closedViewStore.ts`, `components/ReopenClosedViewShortcut.tsx`, `hooks/useProactivePanels.ts`, `hooks/usePreviewPanelInlineSize.ts`.

- **RP-01** Title-bar toggle "Toggle right panel" (PanelRight icon); tooltip shows the shortcut; when disabled the copy is "Right panel is unavailable" — `components/chat/PanelLayoutControls.tsx:115` ⟶ ✓ #panel
- **RP-02** Title-bar toggle "Toggle terminal drawer" (PanelBottom icon); tooltip "Toggle terminal drawer (⌘J)" or "Terminal drawer is unavailable" — `components/chat/PanelLayoutControls.tsx:93` ⟶ ✓ #panel
- **RP-03** Title-bar toggle "Toggle thread details panel" (inline toggle or popover depending on layout) — `components/chat/PanelLayoutControls.tsx:57` ⟶ ✓ #panel
- **RP-04** Maximize toggle, labels "Maximize panel" / "Restore panel size" (Maximize2/Minimize2 morph icon); shown only when the panel is open and inline (not sheet) — `components/chat/PanelLayoutControls.tsx:142` ⟶ ✓ #panel
- **RP-05** Tab kinds and titles: Diff ("Diff"), Files ("Files"), single file (basename), terminal (terminal label), pull request ("#123"), linked PRs ("Pull requests"), device (custom title / device name / "Device"), browser (page host, or "Browser" while idle/invalid) — `components/RightPanelTabs.tsx:533` ⟶ ✓ #panel
- **RP-06** Per-kind tab icons: favicon for browser (falls back to captured favicon), file-type icon, Apple/Android glyph for device, live PR state icon (open/draft/merged/closed colour) — `components/RightPanelTabs.tsx:604` ⟶ ✓ #panel
- **RP-07** PR tab icon resolves state from linked snapshot, then detail, then a seed (draft and state) — `components/RightPanelTabs.tsx:687` ⟶ ✓ #panel
- **RP-08** Unsaved-file dot on a tab (small filled dot at the icon's corner) driven by pending file saves — `components/RightPanelTabs.tsx:840` ⟶ ✓ #panel
- **RP-09** Close button sits on the tab icon (hover swaps to ×), aria "Close {title}" — `components/RightPanelTabs.tsx:831` ⟶ ✓ #panel
- **RP-10** Audio indicator on browser tabs: button "Mute {title}" / "Unmute {title}", tooltip "Mute tab" / "Unmute tab" — `components/RightPanelTabs.tsx:854` ⟶ ✓ #panel
- **RP-11** Middle-click on a tab closes it — `components/RightPanelTabs.tsx:1162` ⟶ ✓ #panel
- **RP-12** Drag to reorder tabs (sortable list; turned off while renaming a device) — `components/RightPanelTabs.tsx:751` ⟶ ✓ #panel
- **RP-13** Tab context menu (native): "Rename" (device), "Copy path" (workspace file), "Mute tab"/"Unmute tab" (browser), "Close", "Close others", "Close to the right", "Close all" — `components/RightPanelTabs.tsx:1079` ⟶ ✓ #panel
- **RP-14** Inline device-tab rename: double-click the title, input aria "Device tab name", Enter commits, Escape cancels — `components/RightPanelTabs.tsx:871` ⟶ ✓ #panel
- **RP-15** Device tab tooltip: "{host label or 'Device host'} · {version or iOS/Android}" — `components/RightPanelTabs.tsx:1458` ⟶ ✓ #panel
- **RP-16** "+" add button (aria "Add panel surface") opens a menu: Browser (B), Terminal (T), Files (F), Diff (D), Pull request (P), Linked pull requests (L), Device (M); letters work as accelerators while the menu is open; Browser opens a submenu of profiles when more than one exists — `components/RightPanelTabs.tsx:1305` ⟶ ✓ #panel
- **RP-17** Menu entries for unavailable kinds are disabled and explain why: "Browser previews are only available in the T3 Code desktop app.", "Terminal surfaces are only available from a project thread.", "Files are only available when a project is open.", "Diff is only available for server threads in Git repositories.", "This thread's branch has no pull request yet.", "No linked pull requests are available for this thread.", "Devices are only available from a thread." — `components/RightPanelTabs.tsx:156` ⟶ ✓ #panel
- **RP-18** Empty panel (no tab) launcher: heading "Open a surface", grid of the same 7 kinds with Kbd letters, short hints for unavailable ones ("Only available in the desktop app.", "Available when a project is open.", "Available for Git repositories.", "No pull request on this branch yet.", "No linked pull requests available.", "Available from a thread."); Device description "Watch an iOS Simulator or Android Emulator."; Enter activates the item — `components/RightPanelTabs.tsx:296` ⟶ ✓ #panel
- **RP-19** Profile picker inside the launcher Browser tile (aria "Open browser in a profile") — `components/RightPanelTabs.tsx:488` ⟶ ✓ #panel
- **RP-20** Tab strip overflow: horizontal wheel scroll, scroll-fade edges, arrow buttons "Scroll tabs left" / "Scroll tabs right", the active tab scrolls into view — `components/RightPanelTabs.tsx:1379` ⟶ ✓ #panel
- **RP-21** Tab bar acts as the desktop title-bar drag region when the inline panel owns the title bar; reserves space for native window controls (WCO) — `components/RightPanelTabs.tsx:1238` ⟶ ✓ #panel
- **RP-22** Workspace focus area labelled "Workspace panel: {tab title}" (used by workspace.focusNext/Previous) — `components/RightPanelTabs.tsx:1227` ⟶ ✓ #panel
- **RP-23** Resize by dragging the left edge (col-resize separator, line highlights on hover/active); width saved per storage key; default 540px, min 360px — `components/preview/RightPanelResizeHandle.tsx:9` ⟶ ✓ #panel
- **RP-24** Panel body switches on kind; heavy surfaces lazy-load with no fallback (blank while loading) — `components/chat/RightPanelSurfaceContent.tsx:82` ⟶ ✓ #panel
- **RP-25** PR surface on an old server: "Pull requests unavailable" / "Update this environment's T3 Code server to browse pull requests." — `components/chat/RightPanelSurfaceContent.tsx:122` ⟶ ✓ #panel
- **RP-26** Proactive panels: opens Diff when a turn completes (scope set to branch), opens the PR or linked-PRs tab when a PR is linked; a manual open or close by the user wins; setting `proactivePanelsEnabled`; off in sheet mode — `hooks/useProactivePanels.ts:72` ⟶ ✓ #panel
- **RP-27** Reopen closed view (⌘⇧T): restores the last closed panel tab or browser tab, and navigates to its thread, draft, or the global PR page; the stack holds 20 entries; terminals and incognito browser tabs are not saved — `components/ReopenClosedViewShortcut.tsx:166` ⟶ ✓ #panel
- **RP-28** Reopen failure toast "Could not reopen view" + error message — `components/ReopenClosedViewShortcut.tsx:143` ⟶ ✓ #panel
- **RP-29** Reopen also reachable from the desktop app menu (`view.reopenClosed` menu action) — `components/ReopenClosedViewShortcut.tsx:176` ⟶ ✓ #panel
- **RP-30** Closed history excludes terminal surfaces by type; incognito-profile browser entries are dropped — `closedViewStore.ts:20` ⟶ ✓ #panel
- **RP-31** Store actions behind the UI: open/openDevice/openBrowser/openFile/openPullRequest/openTerminal/splitTerminal, close/closeOthers/closeToRight/closeAll, moveSurface, setMaximized, toggleVisibility, requestMaximize — `rightPanelStore.ts:106` ⟶ ✓ #panel
- **RP-32** The same tab system also powers the global Pull requests page (rightPanel.* shortcuts are wired there too) — `components/pullRequest/PullRequestsPage.tsx:1441` ⟶ ✓ #panel

## Diff

Files: `components/DiffPanel.tsx`, `components/DiffPanelShell.tsx`, `components/DiffFilePathCopyButton.tsx`, `diffFileActions.ts`, `diffPanelStore.ts`, `fileContextMenu.ts`, `components/diffs/*`.

- **DF-01** Scope dropdown (aria "Diff scope: {label}"): "Changes" (branch vs base), "Uncommitted", "Latest turn", submenu "Turn" → "Turn N" + short timestamp; a tool-call selection shows "Tool call" — `components/DiffPanel.tsx:716` ⟶ ✓ #panel (дифф)
- **DF-02** Opening a specific turn with a file path reveals that file inside the whole diff (no single-file mode) — `diffPanelStore.ts:89` ⟶ ✓ #panel (дифф)
- **DF-03** Branch comparison shows "{head} → {base}" (tooltip); collapses to "vs" when narrow (container query) — `components/DiffPanel.tsx:766` ⟶ ✓ #panel (дифф)
- **DF-04** Base ref combobox (aria "Change comparison target. Currently {base}"): search "Search refs...", columns "Branch" / "Remote", "Automatic" entry, empty state "No matching refs.", per-ref "Use remote version of {ref}", "Remote only" badge — `components/DiffPanel.tsx:812` ⟶ ✓ #panel (дифф)
- **DF-05** Refresh button: "Refresh diff" / "Refreshing diff…" — `components/DiffPanel.tsx:914` ⟶ ✓ #panel (дифф)
- **DF-06** Collapse/expand all: "Collapse all files" / "Expand all files" — `components/DiffPanel.tsx:934` ⟶ ✓ #panel (дифф)
- **DF-07** Layout toggle group "Diff layout": "Stacked diff view" (unified) / "Split diff view"; the setting is global (`settings.diffLayout`) — `components/DiffPanel.tsx:950` ⟶ ✓ #panel (дифф)
- **DF-08** Line wrap toggle: "Enable line wrapping" / "Disable line wrapping"; defaults from the setting, local state — `components/DiffPanel.tsx:972` ⟶ ✓ #panel (дифф)
- **DF-09** Whitespace toggle: "Hide whitespace changes" / "Show whitespace changes"; defaults from the setting, local state — `components/DiffPanel.tsx:992` ⟶ ✓ #panel (дифф)
- **DF-10** Hide test files toggle; tooltip "Hide test files" / "Show N hidden test file(s)"; saved in localStorage `t3code.diffHideTestFiles` — `components/DiffPanel.tsx:1015` ⟶ ✓ #panel (дифф)
- **DF-11** File tree toggle "Show file tree" / "Hide file tree" (saved in localStorage); right-side aside 16rem / 40% max — `components/DiffPanel.tsx:1037` ⟶ ✓ #panel (дифф)
- **DF-12** File tree: header "Files", "Collapse all folders" / "Expand all folders"; clicking a file reveals it in the diff — `components/diffs/DiffFileTree.tsx:189` ⟶ ✓ #panel (дифф)
- **DF-13** Per-file collapse chevron: "Collapse {path}" / "Expand {path}", tooltip "Collapse diff" / "Expand diff"; clicking the header toggles; collapse state saved per scope — `components/DiffPanel.tsx:150` ⟶ ✓ #panel (дифф)
- **DF-14** Clicking a file name opens it in a Files tab (falls back to the editor when there is no thread) — `diffFileActions.ts:80` ⟶ ✓ #panel (дифф)
- **DF-15** Copy path button in the file header: "Copy file path", tooltip "Copy path" → "Copied" — `components/DiffFilePathCopyButton.tsx:30` ⟶ ✓ #panel (дифф)
- **DF-16** File header right-click: "Open", "Reveal in Finder/Explorer" (label depends on OS/server), "Open with ›" editors; failure toasts "Could not open file" / "Unable to reveal file" — `fileContextMenu.ts:59` ⟶ ✓ #panel (дифф)
- **DF-17** Per-file status in the header: "Retry loading diff" (error) or partial preview "This file is too large to show in full. Counts include all changes." — `components/diffs/DiffFileStatus.tsx:22` ⟶ ✓ #panel (дифф)
- **DF-18** Lazy per-file loading boundary (role status "Loading diff…"), +/− stats shown from summary — `components/diffs/DiffFileLoadingBoundary.tsx:26` ⟶ ✓ #panel (дифф)
- **DF-19** Line comments: gutter "+" / line selection opens the comment box ("Add a comment…", aria "Comment on lines {range}", "Cancel", "Comment", hint "⌘/Ctrl Enter to send", Escape cancels); saved comments can be deleted ("Delete comment") — `components/diffs/DiffCommentAnnotation.tsx:39` ⟶ ✓ #panel (дифф)
- **DF-20** Comments go into the composer draft as review comments (sent with the next prompt), so comments reach the prompt — `components/diffs/AnnotatableCodeView.tsx:218` ⟶ ✓ #panel (дифф)
- **DF-21** ⌘/Ctrl+Enter submits a comment — `components/diffs/commentSubmitShortcut.ts:13` ⟶ ✓ #panel (дифф)
- **DF-22** In-diff search (from the @pierre/diffs CodeView); a match unfolds a collapsed file — `components/diffs/AnnotatableCodeView.tsx:271` ⟶ ✓ #panel (дифф)
- **DF-23** Sticky file headers, syntax highlighting by theme — `components/DiffPanel.tsx:1240` ⟶ ✓ #panel (дифф)
- **DF-24** Empty/gated states: "Select a thread to inspect turn diffs.", "Turn diffs are unavailable because this project is not a git repository.", "No completed turns yet." — `components/DiffPanel.tsx:1058` ⟶ ✓ #panel (дифф)
- **DF-25** Remote/permission: "Checking file access..." then "This connection cannot read local diffs." (or server error) — `components/DiffPanel.tsx:1071` ⟶ ✓ #panel (дифф)
- **DF-26** Loading labels: "Loading tool call diff...", "Loading checkpoint diff...", "Loading uncommitted changes...", "Loading changes..." — `components/DiffPanel.tsx:1118` ⟶ ✓ #panel (дифф)
- **DF-27** No-content: "No net changes in this selection." / "No patch available for this selection." — `components/DiffPanel.tsx:1131` ⟶ ✓ #panel (дифф)
- **DF-28** Big diff banner: "This preview exceeds the size limit. Changes shown are incomplete." (+ " Totals include all changes.") — `components/DiffPanel.tsx:1081` ⟶ ✓ #panel (дифф)
- **DF-29** Tool-call partial: "This tool call changed N files. The recorded patch omits M of them." — `components/DiffPanel.tsx:1087` ⟶ ✓ #panel (дифф)
- **DF-30** Tool call without a diff: "The provider recorded file content without a diff." with labelled raw content ("Empty content.") — `components/DiffPanel.tsx:1100` ⟶ ✓ #panel (дифф)
- **DF-31** Patch error text (red) and raw-text fallback when the patch can't be parsed (reason + pre block) — `components/DiffPanel.tsx:1092` ⟶ ✓ #panel (дифф)
- **DF-32** Shell loading spinner component with aria label — `components/DiffPanelShell.tsx:92` ⟶ ✓ #panel (дифф)

## Terminal

Files: `components/ThreadTerminalDrawer.tsx`, `components/PersistentThreadTerminals.tsx`, `components/chat/useChatTerminalActions.ts`, `lib/terminalCloseConfirm.ts`, `keybindings.ts`, `types.ts`.

- **TM-01** Bottom drawer under the chat; can also be a right-panel Terminal tab (same component, `data-terminal-owner` drawer/right-panel) — `components/ThreadTerminalDrawer.tsx:1777` ⟶ ✓ #terminal
- **TM-02** Drawer resize by dragging the top edge (row-resize); min 180px, max limited by column height; persisted height — `components/ThreadTerminalDrawer.tsx:1634` ⟶ ✓ #terminal
- **TM-03** Empty state "No terminal sessions for this thread yet." + "New Terminal" button — `components/ThreadTerminalDrawer.tsx:1750` ⟶ ✓ #terminal
- **TM-04** Single terminal: floating toolbar top right: split horizontal, split vertical, new (+), close (trash) — `components/ThreadTerminalDrawer.tsx:1789` ⟶ ✓ #terminal
- **TM-05** Action labels: "Split Terminal Horizontally (⌘D)", "Split Terminal Vertically (⌘⇧D)", "New Terminal (⌘N)", "Close Terminal (⌘W)"; at limit "… (max 4 per group)" — `components/ThreadTerminalDrawer.tsx:1597` ⟶ ✓ #terminal
- **TM-06** Split panes, up to 4 per group, horizontal or vertical — `types.ts:35` ⟶ ✓ #terminal
- **TM-07** With more than one terminal: a sidebar listing groups ("Single" / "Side by side" / "Stacked" + count) and terminals (TerminalSquare icon, label, close on icon hover "Close {label} (⌘W)") — `components/ThreadTerminalDrawer.tsx:1337` ⟶ ✓ #terminal
- **TM-08** Close confirm dialog: "Close terminal \"{label}\"?" / "This stops the running process and clears its history." (several: "Close N terminals?") — `lib/terminalCloseConfirm.ts:19` ⟶ ✓ #terminal
- **TM-09** In-terminal system lines: "Process exited" / "Terminal closed" — `components/ThreadTerminalDrawer.tsx:605` ⟶ ✓ #terminal
- **TM-10** Context menu: "Add to chat", "Copy" (need a selection), "Paste" (off when read-only), "Select all", "Jump to latest" — `components/ThreadTerminalDrawer.tsx:390` ⟶ ✓ #terminal
- **TM-11** Links: click opens in the browser preview; ⌘/Ctrl-click forces the system browser; paths open as files; "Opening links is unavailable in this browser."; toast "Unable to open link" — `components/ThreadTerminalDrawer.tsx:984` ⟶ ✓ #terminal
- **TM-12** Editing chords: Ctrl+L / ⌘K clear, ⌥←/→ word move, ⌘←/→ line start/end, ⌘/⌥ Backspace delete — `keybindings.ts:393` ⟶ ✓ #terminal
- **TM-13** Read-only when the client lacks the terminal-operate scope (input readOnly, actions disabled) — `components/ThreadTerminalDrawer.tsx:511` ⟶ ✓ #terminal
- **TM-14** Error toasts/messages: "Unable to copy terminal selection", "Unable to read the clipboard", "Unable to open the terminal context menu", "Terminal write failed", "Unable to initialize libghostty-vt" — `components/ThreadTerminalDrawer.tsx:817` ⟶ ✓ #terminal
- **TM-15** Terminals stay mounted across thread switches (persistent drawer + panel hosts) — `components/PersistentThreadTerminals.tsx:90` ⟶ ✓ #terminal
- **TM-16** Shortcut handlers (toggle/split/splitVertical/new/close) with terminal focus ownership — `components/chat/useChatTerminalActions.ts:405` ⟶ ✓ #terminal
- **TM-17** No running-process indicator in the tab strip or sidebar, and no signal/interrupt button (only typing Ctrl+C into the PTY) — `components/ThreadTerminalDrawer.tsx:1370` ⟶ ✓ #terminal

## Preview/browser

Files: `components/preview/*`, `browser/BrowserDeviceToolbar.tsx`, `browser/ServerBrowserSurface.tsx`, `packages/shared/src/previewViewport.ts`.

- **PV-01** Navigation group: "Back", "Forward", "Refresh" / "Stop" (tooltip "Loading…") — `components/preview/PreviewChromeRow.tsx:97` ⟶ ✓ #preview
- **PV-02** URL bar "Search or enter URL"; Enter navigates, Escape reverts — `components/preview/PreviewChromeRow.tsx:170` ⟶ ✓ #preview
- **PV-03** "Open in system browser" — `components/preview/PreviewChromeRow.tsx:199` ⟶ ✓ #preview
- **PV-04** Annotate: "Annotate preview" / "Cancel annotation", tooltip "Annotate elements, regions, and drawings" / "Cancel annotation (Esc)"; disabled message "Page didn't load. Pick is unavailable until the page renders" — `components/preview/PreviewChromeRow.tsx:222` ⟶ ✓ #preview
- **PV-05** Picked element capture failure: "Could not capture the picked element" / "The annotation was kept without the screenshot." — `components/preview/PreviewView.tsx:764` ⟶ ✓ #preview
- **PV-06** Screenshot / record button: "Capture screenshot" / "Stop recording", tooltip "Screenshot · Shift-click to record" — `components/preview/PreviewChromeRow.tsx:247` ⟶ ✓ #preview
- **PV-07** Screenshot toast "Screenshot saved" with "Copy image" / "Copy path" ("Copied!"); errors "Unable to capture screenshot", "Unable to copy screenshot", "Unable to copy screenshot path" — `components/preview/PreviewView.tsx:587` ⟶ ✓ #preview
- **PV-08** Recording toasts: "Recording saved" + "Copy path"; "Unable to start recording", "Unable to stop recording", "Unable to copy recording path" — `components/preview/PreviewView.tsx:524` ⟶ ✓ #preview
- **PV-09** Float toggle: "Float preview over chat" / "Close floating preview" — `components/preview/PreviewChromeRow.tsx:272` ⟶ ✓ #preview
- **PV-10** Profile badge (outline badge with name, tooltip); a deleted profile shows "Removed profile" — `components/preview/PreviewView.tsx:881` ⟶ ✓ #preview
- **PV-11** More menu ("Preview menu", tooltip "More"): "Hard reload", "Open DevTools" (desktop), "Open/Close separate preview window", "Show/Hide device toolbar", "Appearance ›" System/Light/Dark, "Zoom" row (out / % / in / reset), "Profile: {name}", "Clear cookies", "Clear cache" — `components/preview/PreviewMoreMenu.tsx:69` ⟶ ✓ #preview
- **PV-12** Move tab between machines: "Open in {environment}'s browser" / "Open on this computer"; toast "Unable to move the browser tab" — `components/preview/PreviewView.tsx:370` ⟶ ✓ #preview
- **PV-13** Zoom indicator overlay showing a percentage after a zoom change — `components/preview/ZoomIndicator.tsx:35` ⟶ ✓ #preview
- **PV-14** Device toolbar ("Browser device toolbar"): preset select "Responsive" + Standard group (iPhone SE … Nest Hub Max), width/height inputs, "Lock aspect ratio" / "Unlock aspect ratio", "Rotate viewport", "Close device toolbar" — `browser/BrowserDeviceToolbar.tsx:158` ⟶ ✓ #preview
- **PV-15** Viewport preset list (17 devices) — `packages/shared/src/previewViewport.ts:22` ⟶ ✓ #preview
- **PV-16** Empty state "No preview yet" / "Type a URL above, or run a dev script. Browser-ready localhost servers will show up here automatically."; sections "Recently used" and "Local servers" — `components/preview/PreviewEmptyState.tsx:41` ⟶ ✓ #preview
- **PV-17** Local server card (favicon, URL, "Listening") auto-discovered from ports — `components/preview/PreviewLocalServerCard.tsx:27` ⟶ ✓ #preview
- **PV-18** Recent URL card with remove "Remove {label} from history" — `components/preview/PreviewRecentUrlCard.tsx:43` ⟶ ✓ #preview
- **PV-19** Unreachable page: "This site can't be reached", "{host}: {friendly error}.", "Try:" list (connection, dev server, environment's browser, proxy/firewall), "Details"/"Hide details", reload and move actions — `components/preview/PreviewUnreachable.tsx:50` ⟶ ✓ #preview
- **PV-20** Friendly error codes (DNS, refused, …), fallback "Network error" — `components/preview/errorCodeMessages.ts:3` ⟶ ✓ #preview
- **PV-21** Download instead of page: "This file can't be shown here", "{file} from {host} was downloaded instead.", "Open in browser", "Download" — `components/preview/PreviewUnreachable.tsx:31` ⟶ ✓ #preview
- **PV-22** Remote (server-hosted) browser stream: control chip + "Take control" / "Release control"; page aria "Browser page", "Press Shift+Escape to leave the browser page." — `browser/ServerBrowserSurface.tsx:714` ⟶ ✓ #preview
- **PV-23** Remote browser JS dialogs: "Browser dialog", "Dialog response" input, "Dismiss" / "Accept", "Take control to respond."; file chooser "Choose files for the page"; toasts "The page copied text", "Could not send the files to the page" — `browser/ServerBrowserSurface.tsx:788` ⟶ ✓ #preview
- **PV-24** Gate: "Preview is only available in the T3 Code desktop app." / "Pair this client again with preview access to control browser previews." — `components/preview/PreviewPanel.tsx:42` ⟶ ✓ #preview
- **PV-25** Floating mini player ("Floating browser preview"): drag to move, resize corner (min 240×150), recording indicator, "Open in right panel", "Close floating preview", "Pop into separate window" / "Close separate window" — `components/preview/ThreadPreviewMiniPlayer.tsx:275` ⟶ ✓ #preview
- **PV-26** Floating device preview ("Floating device preview") using the same player chrome — `components/preview/ThreadPreviewMiniPlayer.tsx:389` ⟶ ✓ #preview
- **PV-27** Pop-out errors: "Unable to pop out preview" / "Unable to update popped-out preview" — `components/preview/ThreadPreviewMiniPlayer.tsx:254` ⟶ ✓ #preview
- **PV-28** Agent cursor overlay shows where the agent is clicking/typing in the page — `components/preview/AgentBrowserCursor.tsx:1` ⟶ ✓ #preview
- **PV-29** Agent-opened previews open tabs automatically — `components/preview/agentOpenedPreviews.ts:1` ⟶ ✓ #preview
- **PV-30** Toasts: "Unable to open browser", "Unable to change the browser tab" — `components/preview/PreviewView.tsx:248` ⟶ ✓ #preview

## Files

Files: `components/files/FileBrowserPanel.tsx`, `FilePreviewPanel.tsx`, `FileBreadcrumbs.tsx`, `fileSurfaceChrome.tsx`, `ProjectFilePicker.tsx`, `AttachmentFilePreview.tsx`, `PdfViewer.tsx`, `BinaryViewer.tsx`, `LargeTextViewer.tsx`, `fileSaveSessions.ts`.

- **FL-01** Files tab: tree with search "Search files" (aria "Search {project} files"; Escape clears), "Refresh files" / "Refreshing…", "Collapse all folders" / "Expand all folders" — `components/files/FileBrowserPanel.tsx:65` ⟶ ✓ #panel (файлы)
- **FL-02** Tree row context menu: "Copy mention", "Add to chat"; toasts "Mention copied", "Failed to copy mention", "Unable to add to chat" ("Open a chat for this project and try again." / "The chat isn't ready to accept input right now.") — `components/files/FileBrowserPanel.tsx:199` ⟶ ✓ #panel (файлы)
- **FL-03** Drag a tree item into the composer adds a mention — `components/files/fileTreeDragMention.ts:1` ⟶ ✓ #panel (файлы)
- **FL-04** Folder loading row "Loading…" — `components/files/FileBrowserPanel.tsx:292` ⟶ ✓ #panel (файлы)
- **FL-05** File tab breadcrumbs (nav "File path"): each crumb opens a folder menu ("Browse {name}"), "Retry loading folder", "This folder is no longer available.", "This folder is empty.", "Some workspace entries are not shown."; ArrowLeft goes to the parent — `components/files/FileBreadcrumbs.tsx:111` ⟶ ✓ #panel (файлы)
- **FL-06** File header actions: Open in editor picker, rendered/source toggle ("Show rendered markdown"/"Show markdown source", "Show rendered diagram"/"Show Mermaid source", "Show table"/"Show source", "Show rendered page"/"Show HTML source"), "Enable/Disable word wrap", "Open file in preview browser", "Show/Hide file explorer" — `components/files/FilePreviewPanel.tsx:1274` ⟶ ✓ #panel (файлы)
- **FL-07** Editable text file with autosave sessions; read-only banner "Read-only connection. Unsaved edits are kept until write access returns." — `components/files/FilePreviewPanel.tsx:1319` ⟶ ✓ #panel (файлы)
- **FL-08** Line comments in files go to the composer like diff comments — `components/files/FilePreviewPanel.tsx:71` ⟶ ✓ #panel (файлы)
- **FL-09** Markdown task checkboxes can be toggled in rendered view — `components/files/filePreviewMode.ts:43` ⟶ ✓ #panel (файлы)
- **FL-10** Viewers: image, video, audio ("Unable to load audio."), HTML/document frame, Mermaid, CSV/TSV table, Markdown, large text, PDF, office, fonts, notebooks, archives/SQLite — `components/files/FilePreviewPanel.tsx:1337` ⟶ ✓ #panel (файлы)
- **FL-11** Large text: "Full file", "Copy contents"/"Copied", "Save file"/"Preparing file…", "Loading the rest of the file…" — `components/files/FilePreviewPanel.tsx:1616` ⟶ ✓ #panel (файлы)
- **FL-12** PDF toolbar: "Previous page", "Next page", "Zoom out", "Zoom in", "Fit width", "Find in PDF", "Next matching page" — `components/files/PdfViewer.tsx:277` ⟶ ✓ #panel (файлы)
- **FL-13** Archive/DB viewer: "Back to archive"/"Parent folder", "Table" select, "Previous rows"/"Next rows", "Preview limited to the first 1 MB.", "This folder is empty.", "This table is empty.", "This database has no readable tables.", "Only UTF-8 text and images can be opened inside an archive." — `components/files/BinaryViewer.tsx:66` ⟶ ✓ #panel (файлы)
- **FL-14** Attachment preview (composer attachments): "No preview for this file", "Copy preview"/"Copy contents", "Save file", "Remove from draft", "Close" — `components/files/AttachmentFilePreview.tsx:352` ⟶ ✓ #panel (файлы)
- **FL-15** Errors: "This connection cannot read host files.", "Unable to load file preview.", toast "Could not read file", "Unable to open file in browser", "Loading…" — `components/files/FilePreviewPanel.tsx:1229` ⟶ ✓ #panel (файлы)
- **FL-16** File picker (⌘P, in the command palette): "Search files…", "Indexing workspace files…"/"Searching workspace files…", "No matching files."/"No files found.", footer "Open file" — `components/files/ProjectFilePicker.tsx:49` ⟶ ✓ #panel (файлы)

## Pull request

Files: `components/pullRequest/ThreadPullRequestsPanel.tsx`, `PullRequestDetailPanel.tsx`, `PullRequestDetailActions.tsx`, `PullRequestActionsMenu.tsx`, `PullRequestChecksPopover.tsx`, `PullRequestSummaryTab.tsx`, `PullRequestCodeTab.tsx`, `PullRequestGuideTab.tsx`, `PullRequestReviewForm.tsx`, `LinkPullRequestDialog.tsx`, `components/PullRequestContextDetails.tsx`.

- **PR-01** Linked PRs list: rows show state, number, repo, source icon ("Linked by you", "Created from this thread", "Linked by the agent", "Found in the stack", "Dismissed"), "Watching" eye, "Waiting for host state" — `components/pullRequest/ThreadPullRequestsPanel.tsx:61` ⟶ ✓ #pr
- **PR-02** Row menu "Actions for #N": "Watch for changes"/"Stop watching", "Unlink from thread"/"Dismiss from thread" — `components/pullRequest/ThreadPullRequestsPanel.tsx:312` ⟶ ✓ #pr
- **PR-03** Empty: "No linked pull requests", "Pull requests the agent opens from this thread land here. Link one yourself from a URL or a number.", "Link pull request" — `components/pullRequest/ThreadPullRequestsPanel.tsx:428` ⟶ ✓ #pr
- **PR-04** Unsupported: "Linked pull requests unavailable" / "This environment does not support multiple linked pull requests." — `components/pullRequest/ThreadPullRequestsPanel.tsx:369` ⟶ ✓ #pr
- **PR-05** Link dialog "Link pull request": "Pull request URL or #42", hints "Paste a pull request URL or enter 123 / #123.", "Link"/"Linking...", error "Could not link the pull request." — `components/pullRequest/LinkPullRequestDialog.tsx:115` ⟶ ✓ #pr
- **PR-06** Detail tabs: "Summary", "Guide", "Timeline", "Code" — `components/pullRequest/PullRequestDetailPanel.tsx:199` ⟶ ✓ #pr
- **PR-07** Header: author avatar + updated time, base ← head branch with update-branch action, files changed count, "Copy checkout command", "Copy {term} branch"; the header condenses on scroll; "Collapse {term} panel" — `components/pullRequest/PullRequestDetailPanel.tsx:1398` ⟶ ✓ #pr
- **PR-08** Checks chip ("Checks: {summary}") → popover with check list, "Show all"/"Show less", "Loading checks…", "No checks reported", "Unable to open check details" — `components/pullRequest/PullRequestChecksPopover.tsx:48` ⟶ ✓ #pr
- **PR-09** Comment/commit counts ("Comments unavailable", "Commits unavailable"), approval icon, timeline order "Newest first"/"Oldest first" — `components/pullRequest/PullRequestDetailPanel.tsx:1619` ⟶ ✓ #pr
- **PR-10** Primary actions: "Check out" ("In a separate worktree" / "In this repository"), "Resolve conflicts", "Ready for review", auto-merge (two-step "Confirm auto-merge?"), "Merge" (two-step "Confirm merge?"/"Merging..."), "Approve workflows to run" — `components/pullRequest/PullRequestDetailActions.tsx:108` ⟶ ✓ #pr
- **PR-11** More menu: "Ask a question", "Explain this {term}", fix findings, "Write guide"/"Rewrite guide", "Allow edits from maintainers", "Ready for review"/"Convert to draft", "Merge now", "Enable auto-merge", copy link/number (⌘⇧K), "Close {term}", "Revert changes", "Delete branch" ("Reconnect to delete this branch") — `components/pullRequest/PullRequestActionsMenu.tsx:250` ⟶ ✓ #pr
- **PR-12** Delete branch confirm: "Delete branch {name}?" / "This deletes {name} from {repo}. Local branches and worktrees are not changed." — `components/pullRequest/PullRequestDetailPanel.tsx:1187` ⟶ ✓ #pr
- **PR-13** Action failure titles and explanations ("Could not merge this …", "The host refused the merge. Check that …") — `components/pullRequest/PullRequestDetailPanel.tsx:162` ⟶ ✓ #pr
- **PR-14** Handoff toasts: "Added to the composer", "Asked in a thread", "Preparing the … checkout...", "Checked out here"/"Checked out", "Checkout ready", "Checked out, but the thread stayed where it was" — `components/pullRequest/PullRequestDetailPanel.tsx:806` ⟶ ✓ #pr
- **PR-15** Summary: "Reviewers", "Labels" ("None"), "Description" (editable, "Describe this {term}"), "Checks" ("Check details are out of date.", "No checks reported."), "Comments (N)" with "Filter"/"N hidden", order toggle, "No comments yet." — `components/pullRequest/PullRequestSummaryTab.tsx:658` ⟶ ✓ #pr
- **PR-16** Code tab: commit scope ("All commits"/commit headline), per-file "Viewed" ticks (kept locally, "These ticks are kept here, not on the host"), "Diff options", whitespace, layout, wrap, collapse all, test files, file tree, "Load more files", "Conversations not on the current diff" — `components/pullRequest/PullRequestCodeTab.tsx:1030` ⟶ ✓ #pr
- **PR-17** Code tab line comments: "Add to review" (pending review) or "Add to agent"; "Fix in a thread" — `components/pullRequest/PullRequestCodeTab.tsx:988` ⟶ ✓ #pr
- **PR-18** Review form: summary ("Summarize your review…"), verdict select "Comment"/"Approve"/"Request changes", "Submit review"/"Submitting..." — `components/pullRequest/PullRequestReviewForm.tsx:27` ⟶ ✓ #pr
- **PR-19** Guide: "No review guide yet"/"Writing a review guide", explanation, "Write guide"/"Try again" — `components/pullRequest/PullRequestGuideTab.tsx:94` ⟶ ✓ #pr
- **PR-20** Not found: "{Term} #N not found" / "It may be an issue rather than a …, or this account can't see it." — `components/pullRequest/PullRequestDetailPanel.tsx:1714` ⟶ ✓ #pr
- **PR-21** PR hover card (state, title, branches) used by chips — `components/PullRequestContextDetails.tsx:12` ⟶ ✓ #pr

## Devices

Files: `components/device/*`, `components/RightPanelTabs.tsx`.

- **DV-01** Device list grouped as "iOS Simulators" / "Android Emulators"; row "{host} · {version} · Running/Stopped" + "Open"/"Start" — `components/device/DevicePanel.tsx:293` ⟶ ✓ #preview (устройства)
- **DV-02** Loading: "Opening device…", "Starting device…", "Installing device support…", "Finding devices…"; two-step progress "Step 1 of 2: open device" / "Step 2 of 2: connect video" — `components/device/DevicePanel.tsx:262` ⟶ ✓ #preview (устройства)
- **DV-03** Empty/failed: "No simulators or emulators were found on this environment." / "The device hub failed to start." — `components/device/DevicePanel.tsx:285` ⟶ ✓ #preview (устройства)
- **DV-04** Dismissible warnings/errors ("Dismiss device warning"/"Dismiss device error") — `components/device/DevicePanel.tsx:391` ⟶ ✓ #preview (устройства)
- **DV-05** Setup dialog "Set up devices": steps "Device hub", "Simulators", "Agent access"; toggles "Enable device hub", "Allow agents to control devices"; "Check again", "Cancel", "Done" — `components/device/DeviceSetup.tsx:161` ⟶ ✓ #preview (устройства)
- **DV-06** Controls rail: "Home", "Back", "Recents", "Rotate device", appearance switch, "Device text size", "Device tools", "Save screenshot", "More device actions" ("Power off device"/"Return device to the pool"), "3D view"/"Flat view", Magic Keyboard, "Restore 3D view" — `components/device/DeviceControlsRail.tsx:59` ⟶ ✓ #preview (устройства)
- **DV-07** Tools panel: foreground app (Terminate/Relaunch), open URL, launch app, Simulator/Emulator settings (Appearance, Text size, Liquid Glass, Color filter, Orientation), accessibility toggles, Network, overlay frames, permissions, location presets, push notification — `components/device/DeviceToolsPanel.tsx:99` ⟶ ✓ #preview (устройства)
- **DV-08** Stream view: "{iOS Simulator|Android Emulator} screen", "Connecting video…", "Stream failed.", "Show 3D phone" — `components/device/DeviceStreamView.tsx:310` ⟶ ✓ #preview (устройства)
- **DV-09** Fold/Duo posture controls ("Fold device"/"Unfold device", "Laptop stand"/"Tent stand") — `components/device/DeviceAndroidFoldControls.tsx:74` ⟶ ✓ #preview (устройства)
- **DV-10** Host updates: "Installing device tools…", "Device support could not start.", "Retry" — `components/device/DeviceHostUpdates.tsx:34` ⟶ ✓ #preview (устройства)
- **DV-11** Screenshot failure "Screenshot capture failed. Try again." — `components/device/DeviceWorkspace.tsx:60` ⟶ ✓ #preview (устройства)

## Project search & scripts

Files: `components/search/ProjectContentSearchDialog.tsx`, `components/ProjectScriptsControl.tsx`, `components/CommandPalette.tsx`.

- **SS-01** Content search (⌘⇧F, "Search project contents" palette entry): "Search in {project}", toggles "Match case", "Match whole word", "Use regular expression"; ↑/↓/Enter; "Invalid regular expression", "No results found.", "Type to search across your project.", "Checking file access…" — `components/search/ProjectContentSearchDialog.tsx:166` ⟶ ✓ #panel
- **SS-02** Results open in a Files tab at the matched line, highlighted — `components/search/HighlightedSearchLine.tsx:1` ⟶ ✓ #panel
- **SS-03** Scripts control (in the thread details panel): "Run {script}", "Script actions", "Project actions", "Add project script"/"Add action", "From t3.json" import group, "Edit {name}"; gated "Pair this client again with permission to run terminal commands." — `components/ProjectScriptsControl.tsx:280` ⟶ ✓ #panel
- **SS-04** Per-script keybindings `script.<id>.run` shown in the menu — `packages/contracts/src/keybindings.ts:119` ⟶ ✓ #panel

## Keyboard

Files: `packages/shared/src/keybindings.ts`, `components/chat/useRightPanelActions.ts`, `shortcuts/chatRouteCommands.ts`.

- **KB-01** ⌘J terminal.toggle — `packages/shared/src/keybindings.ts:156` ⟶ ✓ #panel (клавиши)
- **KB-02** ⌘⌥B rightPanel.toggle; ⌘⇧B threadPanel.toggle — `packages/shared/src/keybindings.ts:157` ⟶ ✓ #panel (клавиши)
- **KB-03** ⌘T rightPanel.new (opens the add menu) when the panel is open — `packages/shared/src/keybindings.ts:159` ⟶ ✓ #panel (клавиши)
- **KB-04** ⌘D / ⌘⇧D / ⌘N / ⌘W split, split vertical, new, close terminal (terminal focus) — `packages/shared/src/keybindings.ts:160` ⟶ ✓ #panel (клавиши)
- **KB-05** ⌘W rightPanel.close outside a terminal; ⌘⇧T view.reopenClosed — `packages/shared/src/keybindings.ts:164` ⟶ ✓ #panel (клавиши)
- **KB-06** ⌘D diff.toggle (outside a terminal) — `packages/shared/src/keybindings.ts:166` ⟶ ✓ #panel (клавиши)
- **KB-07** ⌘⇧J preview.toggle; ⌘R refresh, ⌘L focus URL, ⌘=/⌘+/⌘−/⌘0 zoom (preview focus) — `packages/shared/src/keybindings.ts:167` ⟶ ✓ #panel (клавиши)
- **KB-08** ⌘P filePicker, ⌘⇧F projectSearch, ⌘⇧K pullRequest.copyNumber — `packages/shared/src/keybindings.ts:175` ⟶ ✓ #panel (клавиши)
- **KB-09** rightPanel.toggleMaximized has no default binding — `components/chat/useRightPanelActions.ts:327` ⟶ ✓ #panel (клавиши)
- **KB-10** Accelerators B/T/F/D/P/L/M in the add menu and launcher — `components/RightPanelTabs.tsx:318` ⟶ ✓ #panel (клавиши)
- **KB-11** Shortcuts still work while focus is inside a browser page or document frame (forwarded) — `components/files/BrowserDocumentFrame.tsx:54` ⟶ ✓ #panel (клавиши)

## Responsive

Files: `rightPanelLayout.ts`, `components/RightPanelSheet.tsx`, `components/ChatView.tsx`.

- **RPR-01** Below 980px the panel becomes a right sheet — `rightPanelLayout.ts:1` ⟶ ✓ #narrow
- **RPR-02** Sheet width min(42vw, 28rem), min 20rem; under 760px min(88vw, 24rem); no close button — `components/RightPanelSheet.tsx:24` ⟶ ✓ #narrow
- **RPR-03** Maximized overrides the sheet; maximize hidden in sheet mode; proactive panels off in sheet — `components/ChatView.tsx:1020` ⟶ ✓ #narrow
- **RPR-04** Narrow-width container queries in the diff header and PR header — `components/DiffPanel.tsx:774` ⟶ ✓ #narrow

## Observations

- The terminal has no running-process indicator and no signal/interrupt control (TM-17).
- Browser preview is desktop-only per copy (RP-17, PV-24), yet a server-hosted browser stream exists (PV-22). The copy and the capability disagree.
- rightPanel.toggleMaximized has no default shortcut (KB-09).
- Diff and the PR Code tab duplicate the same toolbar (DF-05..11 vs PR-16). Good candidate to unify.
- Lazy surfaces have no loading fallback (RP-24).
- Whitespace and wrap toggles in Diff are local state, while layout is a global setting (DF-07..09). Inconsistent persistence.

## Новое (нет в продукте)

- **NEW-01** Git-действия, ветка, Open in и +N −M всегда в шапке треда ⟶ ＋ новое: #working
- **NEW-02** Пилюля статуса агента в шапке (5 семейств, точные слова, время работы) ⟶ ＋ новое: #working
- **NEW-03** Разделитель «Checkpoint» после хода: N files changed · View diff · Restore ⟶ ＋ новое: #done
- **NEW-04** Вопрос агента — карточка в ленте с вариантами и «Other…», а не только в композере ⟶ ＋ новое: #question
- **NEW-05** «Implement plan» на карточке плана ⟶ ＋ новое: #plan
- **NEW-06** Видимая причина, почему нельзя отправить (строка над композером), а не только тултип ⟶ ＋ новое: #composer
- **NEW-07** Индикатор живого процесса на вкладке терминала и кнопка Stop (SIGINT) ⟶ ＋ новое: #terminal
- **NEW-08** Скелетоны у ленивых панелей (дифф, браузер, файлы, устройства) ⟶ ＋ новое: #panel
- **NEW-09** Сочетание для «Maximize panel» ⟶ ＋ новое: #panel
- **NEW-10** Ошибки провайдера: человеческий заголовок + исходный текст свёрнуто + Retry turn ⟶ ＋ новое: #failed
- **NEW-11** Подтверждения MCP-приложений — окно Marp вместо browser confirm() с JSON ⟶ ＋ новое: #dialogs
