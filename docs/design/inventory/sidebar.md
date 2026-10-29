# Сайдбар — инвентаризация

Источник правды для эталона `docs/design/sidebar.html` (новый раздел; «было» — текущий код). Собрано по коду 29 окт 2026.

**Что это за раздел.** Навигация по тредам: проекты, треды со статусами агента, секции Pinned / Working / Snoozed / Settled, действия над тредами, поиск, переход в настройки, PR и usage. Это то, на что пользователь смотрит весь день, чтобы понять, где он нужен.

**Как читать строку.** `- **ID** что есть в продукте — `файл:строка` ⟶ статус`. Статус: `✓ #экран` (в скобках — что поменяли), `＋ новое: что`, `✗ убрано: почему и как сделать то же самое`. Пути — от `apps/web/src/`, если не указано иное.

Scope: `apps/web/src` web/desktop sidebar. All paths are relative to `apps/web/src/components/` unless they start with another root. UI strings are quoted verbatim.

## 1. Shell & layout

Files: `AppSidebarLayout.tsx`, `ui/sidebar.tsx`, `threadSidebarWidth.ts`.

- **SB-01** Left sidebar is `role="navigation"` `aria-label="Threads"`, variant `inset`, collapses offcanvas (slides fully out, becomes `inert`) — `AppSidebarLayout.tsx:453-471`, `ui/sidebar.tsx:343-347` ⟶ ✓ #default
- **SB-02** Always open on launch (`defaultOpen`). Open state is written to a `sidebar_state` cookie on every toggle but never read back, so collapse does not survive a reload — `AppSidebarLayout.tsx:449`, `ui/sidebar.tsx:26,107-114` ⟶ ✓ #default
- **SB-03** Floating sidebar toggle fixed at top-left over the workspace (outside the sidebar). Tooltip "Toggle main sidebar (⌘B)", aria "Toggle main sidebar". Uses the `media-navigation` variant over the stage artwork. Hidden while the mobile sheet is open — `AppSidebarLayout.tsx:314-401` ⟶ ✗ убрано: дублировал кнопку в шапке сайдбара; осталась одна кнопка в шапке + ⌘B, в свёрнутом виде — кнопка на рейке #collapsed
- **SB-04** Second toggle inside the sidebar header, also labelled "Toggle main sidebar" — `sidebar/SidebarChrome.tsx:59-63` ⟶ ✓ #default (единственная кнопка сворачивания)
- **SB-05** `sidebar.toggle` shortcut (default `mod+b`), captured on window. Skipped when the rich-text composer claims Mod+B for bold, and inside keybinding capture fields. Also fired by the Electron app menu action — `AppSidebarLayout.tsx:326-364`, `packages/shared/src/keybindings.ts:148` ⟶ ✓ #default
- **SB-06** Collapsing moves focus out of the sidebar to the outside trigger, and a screen-reader announcement reports visibility (desktop widths only) — `ui/sidebar.tsx:116-127,143-153` ⟶ ✓ #default
- **SB-07** Rail on the sidebar edge: drag to resize while open (tooltip/title "Drag to resize sidebar", aria "Resize Sidebar"). Click toggles when the sidebar is collapsed ("Toggle Sidebar"). Double-click resets to the default width — `ui/sidebar.tsx:430-560`, `AppSidebarLayout.tsx:421-428,473` ⟶ ✓ #default
- **SB-08** Width is persisted in localStorage `chat_thread_sidebar_width`. Default 256px, min max(208px, measured brand width), max = viewport − 640px. Main content keeps ≥640px, and a resize that would squeeze it is rejected — `threadSidebarWidth.ts:1-40`, `AppSidebarLayout.tsx:115-125,415-442,461-469` ⟶ ✓ #default
- **SB-09** Hidden brand-width probe measures the "Marp" wordmark so the minimum width never clips it — `sidebar/SidebarChrome.tsx:79-101`, `AppSidebarLayout.tsx:452` ⟶ ✓ #default
- **SB-10** Content is a scroll area with a fixed (non-scrolling) header slot and scroll fades — `ui/sidebar.tsx:640-670` ⟶ ✓ #default
- **SB-11** Panel animation duration CSS var, plus suppression of panel animations during navigation — `AppSidebarLayout.tsx:409-413,440-448` ⟶ ✓ #default
- **SB-12** F6 / Shift+F6 (also mod+F6) move focus between workspace areas, with the sidebar as area 0 "Threads" — `AppSidebarLayout.tsx:173-198,404`, `packages/shared/src/keybindings.ts:149-153` ⟶ ✓ #default
- **SB-13** Settings and Usage open as modals over the last main view, and the thread sidebar's undo commands are off while they are open. `/projects/*` and `/pull-requests` count as "utility pages" — `sidebar/mainAppLocation.ts:4-12`, `AppSidebarLayout.tsx:235` ⟶ ✓ #default
- **SB-14** Escape on `/pull-requests` goes back, or to `/` if there is no history, when no other scope consumed the key — `AppSidebarLayout.tsx:200-220` ⟶ ✓ #default
- **SB-15** BackgroundThreadAnnouncer speaks status changes for threads other than the open one. Row labels are deliberately not live regions — `BackgroundThreadAnnouncer.tsx:31`, `sidebar/SidebarThreadRow.tsx:1486-1488` ⟶ ✓ #default

## 2. Header: brand, environment artwork, search, filter, create

Files: `sidebar/SidebarChrome.tsx`, `SidebarStageBackdrop.tsx`, `sidebar/SidebarThreadHeader.tsx`, `Sidebar.tsx`.

- **SB-16** Brand link "Marp" (Marp wordmark + muted "Code"), aria "Go to threads", navigates to `/`. White when over artwork — `sidebar/SidebarChrome.tsx:103-132` ⟶ ✓ #default
- **SB-17** Electron: the header is a window drag region. On macOS the controls shift right by the traffic-light inset (90px), except in fullscreen, which is tracked through the desktop bridge — `sidebar/SidebarChrome.tsx:54`, `AppSidebarLayout.tsx:67,78-113,429-437` ⟶ ✓ #default
- **SB-18** Environment identification artwork: an 80px backdrop behind the header with "nightly" (night sky, stars, clouds) or "dev" (blueprint grid, rulers) SVG art — `SidebarStageBackdrop.tsx:52-65,100-393` ⟶ ✓ #default
- **SB-19** Identification modes: `artwork` (follows the running channel; nothing on Latest), `nightly-artwork`, `dev-artwork`, `pill`, `none`. Palette themes can block the artwork. Set in Settings › Appearance — `packages/contracts/src/settings.ts:185-195`, `SidebarStageBackdrop.tsx:14-25`, `hooks/useSettings.ts:410-416`, `settings/AppearanceSettingsPanel.tsx:408-421` ⟶ ✓ #default
- **SB-20** Pill mode: a small secondary badge "Dev" or "Nightly" beside the brand — `sidebar/SidebarChrome.tsx:45-48,67-73`, `SidebarStageBackdrop.tsx:27-34` ⟶ ✓ #default
- **SB-21** Stage label comes from the primary server version, falling back to the app's own stage — `SidebarStageBackdrop.tsx:36-44` ⟶ ✓ #default
- **SB-22** Search field (search icon, placeholder "Search", aria "Search threads"). It is a combobox controlling the results listbox — `sidebar/SidebarThreadHeader.tsx:63-87` ⟶ ✓ #default
- **SB-23** Clear-search ✕ button "Clear thread search" appears while there is a query and refocuses the input — `sidebar/SidebarThreadHeader.tsx:88-102` ⟶ ✓ #default
- **SB-24** Project filter button (only when projects exist). The icon is ListFilter, one project favicon, or two stacked favicons. aria/tooltip "Filter threads by project" or "Filter threads by project: A, B" — `Sidebar.tsx:2940-2968`, `sidebar/SidebarThreadHeader.tsx:105-107` ⟶ ✓ #default
- **SB-25** Filter popup anchored to the search row: "Search projects..." input, "No matching projects.", first item "All projects" (folder icon), then each project group with favicon, check badge when selected, and environment badge when projects span environments ("On X" / "Also on X") — `Sidebar.tsx:2969-3067`, `ProjectEnvironmentBadge.tsx:14-36` ⟶ ✓ #default
- **SB-26** Filter interactions: click = single scope, Shift+click / Shift+Enter = toggle multi-select, "All projects" clears. The scope is persisted in the UI store and changing it clears the thread selection — `Sidebar.tsx:1046-1050,1102-1107,2920-2938,2991-2996`, `Sidebar.tsx:986-987` ⟶ ✓ #default
- **SB-27** Per-project gear in the filter row (title "Project settings for {name}"). Right-click, ContextMenu key or Shift+F10 on a row also opens project settings (`/projects/$projectKey`) — `Sidebar.tsx:3027-3061,2997-3003,1175-1204` ⟶ ✓ #default
- **SB-28** A stored scope whose project disappears reads as All projects once every snapshot has loaded. Keys are kept, so the scope comes back with the project — `Sidebar.tsx:1051-1058` ⟶ ✓ #default
- **SB-29** Route reveal: opening a thread hidden by the scope (via history, palette or link) widens the scope to All and persists that, then scrolls the row into view once per mount/route — `Sidebar.tsx:1088-1118`, `sidebar/routeReveal.ts:1-69` ⟶ ✓ #default
- **SB-30** "Add project" button (FolderPlus icon, only when projects exist) opens the command palette in add-project mode — `sidebar/SidebarThreadHeader.tsx:108-110`, `Sidebar.tsx:1042` ⟶ ✓ #default
- **SB-31** "New thread" button (SquarePen). Tooltip "New thread (⌘N)", plus a second line "New thread in current project: Shift+click (⌘⇧N)" when there is more than one project and boring mode is off. Disabled when there are zero projects — `sidebar/SidebarThreadHeader.tsx:57-59,113-132`, `Sidebar.tsx:3069-3074,2888-2891` ⟶ ✓ #default
- **SB-32** New-thread behavior: with one project, Shift, or boring mode, it starts in the current/default project context. Otherwise it opens the palette "new-thread-in" project picker. Closes the mobile sheet — `Sidebar.tsx:2870-2886`, `Sidebar.logic.ts:731-736` ⟶ ✓ #default

## 3. Search results

Files: `Sidebar.tsx`, `sidebar/SidebarThreadRow.tsx`, `Sidebar.logic.ts`.

- **SB-33** A query replaces the whole list with a flat listbox "Thread search results". It searches title/branch/PR matches first, then threads that matched by message content (server search across connected environments, scoped to the filter) — `Sidebar.tsx:1147-1153,1292-1346,3091-3150`, `Sidebar.logic.ts:984-1022` ⟶ ✓ #search (результаты группами: Threads / Messages)
- **SB-34** Result row: project favicon, title, PR number match, relative time, and a message-match excerpt when it was found by content. Settled threads are dimmed. The same hover card as rows — `sidebar/SidebarThreadRow.tsx:1598-1773` ⟶ ✓ #default
- **SB-35** ↑/↓ moves the highlight (wraps), Enter opens, Escape clears the query. The highlight follows its thread as late results arrive. Mouse-move highlights — `Sidebar.tsx:1348-1363,1441-1465` ⟶ ✓ #default
- **SB-36** Opening a content match also opens in-thread Find on that message — `Sidebar.tsx:1430-1440` ⟶ ✓ #default
- **SB-37** No results: "Searching thread messages…" while pending, otherwise "No threads found" — `Sidebar.tsx:3151-3157` ⟶ ✓ #default
- **SB-38** Files can be dropped onto a search result, the same as onto a row (SB-137) — `sidebar/SidebarThreadRow.tsx:1664-1672` ⟶ ✓ #default

## 4. Sections & list structure

Files: `Sidebar.tsx`, `Sidebar.logic.ts`, `sidebar/SidebarListMarkers.tsx`, `sidebar/SidebarDraftBlock.tsx`, `state/olderSettledShelf.ts`.

- **SB-39** Order top to bottom: unsent drafts → Pinned → Active (inbox) → Working shelf → Snoozed shelf → Settled shelf. Shelves are pushed to the bottom with `mt-auto` — `Sidebar.tsx:1851-1892,3308-3462` ⟶ ✓ #default
- **SB-40** Section resolution precedence: snoozed > settled > pinned > active. Snooze/settle only apply when the environment's config is loaded — `Sidebar.logic.ts:169-178`, `Sidebar.tsx:644-656` ⟶ ✓ #default
- **SB-41** Hidden rows: archived threads, subagent threads (shown via their nearest parent; an open subagent highlights the ancestor row) and delegated tasks under a parent — `Sidebar.logic.ts:544-592`, `Sidebar.tsx:1073-1085` ⟶ ✓ #default
- **SB-42** Pinned: no visible header normally. The "Pinned" label and "Active" divider appear only while dragging. Sorted by manual pin order — `Sidebar.tsx:3352-3373`, `sidebar/SidebarListMarkers.tsx:75-108`, `Sidebar.tsx:660` ⟶ ✓ #default (у Pinned всегда виден заголовок, если есть закреплённые)
- **SB-43** Active/inbox: sorted by "return to inbox" time when the Working shelf is on, by manual active order when it is off, and by latest user message in boring mode — `Sidebar.tsx:661-665` ⟶ ✓ #default
- **SB-44** Working shelf: collapsible header "Working" + count, collapsed by default (persisted `marp:sidebar:working-expanded`). Holds threads the agent is working or monitoring on; they return to the inbox when they need you. Sorted by send time. Not present in boring mode. Toggle: Settings › Sidebar "Working section" — `Sidebar.tsx:321,422-424,442-446,3392-3406`, `settings/SettingsPanels.tsx:865-885` ⟶ ✓ #sections (Working — полка внизу, но треды, которым нужен пользователь, поднимаются в «Needs you»)
- **SB-45** Snoozed shelf: "Snoozed" + count, collapsed by default (`marp:sidebar:snoozed-expanded`), sorted by wake time. Row time slot shows the clock and the remaining wake label ("45m", "3h", "2d", "now") — `Sidebar.tsx:320,686-690,3407-3421,3248-3254`, `packages/client-runtime/src/state/threadSettled.ts:326-335` ⟶ ✓ #default
- **SB-46** Settled shelf: "Settled" + total count (including unloaded older ones), collapsed by default (`marp:sidebar:settled-expanded`). Rows are muted "slim" with the settle time — `Sidebar.tsx:319,3422-3440,1313-1315` ⟶ ✓ #default
- **SB-47** Settled paging: the first 10, then a "Show 25 more" (or fewer) treeitem with a chevron. Older settled threads lazy-load from the server: "Loading", or "Could not load older threads. Retry" on failure — `Sidebar.tsx:317-318,473-495,3463-3487` ⟶ ✓ #default
- **SB-48** A collapsed shelf/folder still shows the currently open thread's row — `Sidebar.tsx:388-395,496-504,517-519` ⟶ ✓ #default
- **SB-49** Row "shape" by section: active/pinned/working = two-line "card"; snoozed/settled = one-line "slim"; boring folders = "folder" or "folder-multiline" — `Sidebar.tsx:3196-3204` ⟶ ✓ #default
- **SB-50** Drafts block at the top: unsent new-thread drafts with content, newest first, scoped by the filter, followed by a divider. Row: pen icon, project favicon + name, "Discard draft" ✕, first prompt line or "N attachments". Enter/Space opens, ContextMenu/Shift+F10 opens the menu. The active draft row freezes while you type — `sidebar/SidebarDraftBlock.tsx:24-223`, `Sidebar.tsx:3309-3317` ⟶ ✓ #default
- **SB-51** List motion: a 150ms ease-out FLIP for reorders, entries and fading removals, off under reduced motion and during drag — `Sidebar.motion.ts:1-246`, `Sidebar.tsx:1915-1931` ⟶ ✓ #default

## 5. Project groups (boring sidebar / Labs) & project settings

Files: `sidebar/SidebarProjectFolderHeader.tsx`, `Sidebar.tsx`, `Sidebar.logic.ts`, `hooks/useSidebarProjectGroups.ts`, `settings/LabsSettingsPanel.tsx`, `settings/SettingsPanels.tsx`.

- **SB-52** Default sidebar is an inbox: there are no project groups, and each row carries its project favicon/name — `Sidebar.tsx:1284-1288` ⟶ ✓ #default
- **SB-53** Labs "Boring sidebar (group by project)": active threads fold into project folders; Pinned stays on top; Snoozed/Settled stay below; no Working shelf. Legacy-sidebar users are migrated here — `settings/LabsSettingsPanel.tsx:30-45`, `hooks/useSettings.ts:418-423`, `Sidebar.tsx:422-424` ⟶ ✓ #default
- **SB-54** Labs "Two-line folder rows": folder rows add the branch/PR/agent meta line — `settings/LabsSettingsPanel.tsx:55-62`, `Sidebar.tsx:970,3198-3201` ⟶ ✓ #default
- **SB-55** Folder header: favicon, project display name, chevron (rotates when closed). When closed: hidden-thread count plus a status dot (attention = warning, failed = error, unread = success, working = info) with sr text ", needs you"/", failed"/", done"/", working" — `sidebar/SidebarProjectFolderHeader.tsx:13-25,37-115`, `Sidebar.logic.ts:879-904` ⟶ ✓ #default
- **SB-56** Folder click toggles collapse. Open state is shared with the old per-project sidebar's keys (legacy compatible) and lives in the UI store — `Sidebar.tsx:447-449,505-524,571-574`, `Sidebar.logic.ts:906-918` ⟶ ✓ #default
- **SB-57** Hover / touch-visible "New thread in {project}" pen button on the folder — `sidebar/SidebarProjectFolderHeader.tsx:101-112`, `Sidebar.tsx:1205-1208` ⟶ ✓ #default
- **SB-58** Folder context menu: "New thread", "Copy path", "Project settings" — `Sidebar.tsx:1209-1238` ⟶ ✓ #default
- **SB-59** Empty folders are hidden unless the user filtered to that project (so they can start a thread there) — `Sidebar.tsx:1289,1860-1871`, `Sidebar.logic.ts:925-949` ⟶ ✓ #default
- **SB-60** Folder rows are not draggable (sortable disabled in folder mode) — `Sidebar.tsx:3210-3215` ⟶ ✓ #default
- **SB-61** Project grouping mode setting: `repository` (default) / `repository_path` / `separate`, plus per-project overrides. Settings › Sidebar "Project grouping": "Combine matching repositories across environments." — `packages/contracts/src/settings.ts:68-74,491-497`, `settings/SettingsPanels.tsx:787-820` ⟶ ✓ #default
- **SB-62** Project order setting `updated_at` / `created_at` / `manual` ("Order of projects in the sidebar project picker and command palette.") — `packages/contracts/src/settings.ts:60-62`, `settings/SettingsPanels.tsx:825-850`, `hooks/useSidebarProjectGroups.ts:19-42` ⟶ ✓ #default
- **SB-63** Project favicon resolution: custom monogram (text + colour tile) → emoji → lucide icon → workspace favicon file → FolderCode fallback — `ProjectFavicon.tsx:35-110`, `ProjectMonogram.tsx:7-49` ⟶ ✓ #default
- **SB-64** Project environment badge in the filter when groups span environments — `ProjectEnvironmentBadge.tsx:14-36`, `Sidebar.tsx:1119,3039-3045` ⟶ ✓ #default

## 6. Thread rows: anatomy

Files: `sidebar/SidebarThreadRow.tsx`, `ThreadStatusIndicators.tsx`.

- **SB-65** Card row (active/pinned/working). Line 1: draft pen, project favicon, pin, project name, status slot or time, then hover controls. Line 2: title + regenerating flag (+ provider stack when the meta line is empty). Line 3: meta line — `sidebar/SidebarThreadRow.tsx:1383-1581` ⟶ ✓ #default
- **SB-66** Slim row (snoozed/settled): one line with favicon (grey/40% until hover), title, pin, terminal, time/wake/status slot, action button — `sidebar/SidebarThreadRow.tsx:1192-1381` ⟶ ✓ #default
- **SB-67** Folder row: one line indented under the folder, no favicon. The status label replaces the time. Multiline variant adds the meta line — `sidebar/SidebarThreadRow.tsx:1193-1194,1221-1225,1298-1308,1374` ⟶ ✓ #default
- **SB-68** Title: `dir=auto` (RTL aware), medium weight unless receded, dimmed to 55% while regenerating, with "Regenerating title" text and `aria-busy` — `sidebar/SidebarThreadRow.tsx:1005-1043,1255-1259,1567-1571` ⟶ ✓ #default
- **SB-69** Receding: working/waiting rows and read ready/approval rows render muted. Active, selected, input and request rows never recede — `Sidebar.logic.ts:814-844`, `sidebar/SidebarThreadRow.tsx:716-722,955-960` ⟶ ✓ #default
- **SB-70** Row surfaces: active (route) highlight, selected/sweep highlight, amber "unsent draft" tint, hover, file-drag ring, dragging lift — `sidebar/SidebarThreadRow.tsx:944-965` ⟶ ✓ #default
- **SB-71** Relative time: compact ("now", "5m", "3h"), based on latest user message or else updatedAt. Settled rows use the settle time. It ticks each minute in isolation — `sidebar/SidebarThreadRow.tsx:131-149,1309-1318,1502` ⟶ ✓ #default
- **SB-72** Meta line: worktree icon + middle-truncated branch, or scratch machine icon + machine label when projects span environments and the thread has no branch — `sidebar/SidebarThreadRow.tsx:1134-1154`, `Sidebar.tsx:1120-1132` ⟶ ✓ #default
- **SB-73** Worktree indicator icon, tooltip "Worktree: {path} ({branch})" — `ThreadStatusIndicators.tsx:572-603` ⟶ ✓ #default
- **SB-74** Terminal-running indicator: a teal, continuously pulsing terminal icon. aria/tooltip "1 terminal process running. Open terminal" / "N terminal processes running. Open terminal". Click opens that terminal and activates the thread — `ThreadStatusIndicators.tsx:500-570`, `sidebar/SidebarThreadRow.tsx:1066-1072,1155,1254` ⟶ ✓ #default
- **SB-75** PR badge: single PR (#number, state-coloured icon) opens the PR, in the right panel when a thread is open. Multiple PRs show "+N" and a stack shows the layer count; these open the right-panel "pull-requests" list. Glass tooltip with a mini PR list. aria like "Stack of 3 pull requests, open" / "PR #12, status pending" — `ThreadStatusIndicators.tsx:157-320`, `sidebar/SidebarThreadRow.tsx:934-942,1046-1065` ⟶ ✓ #default
- **SB-76** PR/git status is fetched live only while the row is visible or active (subscription lease), and kept between fetches — `Sidebar.logic.ts:72-103`, `sidebar/SidebarThreadRow.tsx:658,683-701` ⟶ ✓ #default
- **SB-77** Diff counts (+N −M) slot exists in the meta line but `latestRunDiff` always returns null (dead) — `sidebar/SidebarThreadRow.tsx:1125,1157-1162,1584-1589` ⟶ ✗ убрано: слот +N −M никогда не показывался (latestRunDiff всегда null); дифф виден в карточке треда и в шапке треда
- **SB-78** Remote-environment marker: a machine-kind icon (server/laptop…) at the end of the meta line when the thread's environment is not the primary one — `sidebar/SidebarThreadRow.tsx:801,1163-1180` ⟶ ✓ #default
- **SB-79** Provider stack: the current provider icon (instance badge when several instances share a driver). Earlier handed-off providers show as small greyscale icons — `sidebar/SidebarThreadRow.tsx:181-227,1176-1190` ⟶ ✓ #default
- **SB-80** Meta line is dropped entirely when it would hold only the provider icon. The provider then moves to the title line — `sidebar/SidebarThreadRow.tsx:1126-1133,1183-1190` ⟶ ✓ #default
- **SB-81** Pin indicator: a pin icon that turns into PinOff on hover as an "Unpin thread" button (operate + config loaded). Otherwise a static "Pinned" icon — `sidebar/SidebarThreadRow.tsx:1090-1123` ⟶ ✓ #default
- **SB-82** Unsent-draft indicator on a thread row (amber pen, tooltip "Unsent draft"), hidden for the open thread — `sidebar/SidebarThreadRow.tsx:675,1073-1089` ⟶ ✓ #default
- **SB-83** Jump hint badge (e.g. "⌘1") floats on the first 9 rows after the jump modifier has been held for 200ms — `sidebar/SidebarThreadRow.tsx:151-160,1375,1576`, `Sidebar.tsx:1371-1380,2854-2868`, `Sidebar.logic.ts:55,667-676` ⟶ ✓ #default
- **SB-84** Accessibility label: "title, status, project". `aria-current=page` on the open thread — `Sidebar.logic.ts:57-70`, `sidebar/SidebarThreadRow.tsx:998-1003` ⟶ ✓ #default
- **SB-85** Rows read a live per-thread shell, so streaming re-renders only that row. List order comes from "quiet" shells — `sidebar/SidebarThreadRow.tsx:476-482`, `Sidebar.tsx:1072` ⟶ ✓ #default

## 7. Statuses

Files: `sidebar/SidebarThreadRow.tsx`, `Sidebar.logic.ts`, `ThreadStatusIndicators.tsx`.

- **SB-86** Sidebar status vocabulary (card status slot / folder time slot) in priority order — `Sidebar.logic.ts:846-877`, `sidebar/SidebarThreadRow.tsx:723-779` ⟶ ✓ #default
- **SB-87** "Approval" (ShieldQuestion, warning): pending approvals or a subagent approval request ⟶ ✓ #default
- **SB-88** "Input" (MessageCircleQuestion, indigo): pending user input or a subagent question ⟶ ✓ #default
- **SB-89** "Request" (UserRound, guest colour): a guest message is waiting on the owner ⟶ ✓ #default
- **SB-90** "Waiting" (CircleDotDashed, muted) + an elapsed counter since the run completed: blocked on another thread, or the runtime is idle — `sidebar/SidebarThreadRow.tsx:1494-1497` ⟶ ✓ #default
- **SB-91** "Working" / "Goal" (when a goal is active) (CircleDashed, info) + a per-second elapsed counter: preparing/queued/starting/running/waiting — `sidebar/SidebarThreadRow.tsx:162-175,1490-1493` ⟶ ✓ #default
- **SB-92** "Limited" (CircleAlert, warning): runtime failed with a usage limit ⟶ ✓ #statuses (семейство failed, слово «Usage limit»)
- **SB-93** "Failed" (CircleAlert, error): runtime failed ⟶ ✓ #default
- **SB-94** "Woke" (AlarmClock, warning): a snooze expired and the thread has not been visited since. Clicking it ("Dismiss Woke notification") acknowledges — `sidebar/SidebarThreadRow.tsx:711-715,825-830,1281-1297,1458-1477` ⟶ ✓ #default
- **SB-95** "Done" (CircleCheck, success) = unread completion (completed after last visit). Otherwise the slot shows the relative time — `Sidebar.logic.ts:688-698`, `sidebar/SidebarThreadRow.tsx:772-778` ⟶ ✓ #default
- **SB-96** Command-palette pill vocabulary (not used in sidebar rows): "Pending Approval", "Awaiting Input", "Guest Request", "Working", "Connecting", "Waiting", "Failed", "Plan Ready", "Completed", with coloured, pulsing dots — `Sidebar.logic.ts:619-645,1073-1175`, `ThreadStatusIndicators.tsx:605-747`, `CommandPaletteThreadItems.tsx:123-131` ⟶ ✓ #statuses (одна лексика статусов для сайдбара и палитры: 5 семейств, точные слова)
- **SB-97** Last-visited merges the server watermark with the local one (local only for older servers). "Mark unread" rewinds it — `Sidebar.logic.ts:678-686`, `sidebar/SidebarThreadRow.tsx:665-666` ⟶ ✓ #default

## 8. Hover card

Files: `ThreadHoverCard.tsx`, `sidebar/SidebarThreadRow.tsx`.

- **SB-98** Glass hover card to the right of the row after 150ms (close 0ms), max 320px. Disabled while dragging or with the snooze menu open — `ThreadHoverCard.tsx:5-33`, `Sidebar.tsx:3161-3166`, `sidebar/SidebarThreadRow.tsx:1206,1394` ⟶ ✓ #default
- **SB-99** Contents: title; project (favicon + name); environment (machine icon + label); branch (middle-truncated); warning "You're currently checked out on another branch."; model label (· provider instance); "Handed off from {providers}"; "N terminal processes running"; "Usage limit reached" / "Error occurred"; footer PR mini list (multi-PR servers) — `sidebar/SidebarThreadRow.tsx:229-366` ⟶ ✓ #default

## 9. Row inline actions

Files: `sidebar/SidebarThreadRow.tsx`, `CustomSnoozeDialog.tsx`, `Sidebar.snooze.ts`.

- **SB-100** Click opens the thread (clears any selection, sets the anchor, closes the mobile sheet). Clicks on nested links are ignored, and a trailing double-click does not re-navigate — `Sidebar.tsx:1382-1394,1500-1519` ⟶ ✓ #default
- **SB-101** Card hover controls replace the status slot (also shown on focus-visible) — `sidebar/SidebarThreadRow.tsx:1505-1559` ⟶ ✓ #default
- **SB-102** "Discard draft" ✕ (when the thread has an unsent draft) — `sidebar/SidebarThreadRow.tsx:1514-1530` ⟶ ✓ #default
- **SB-103** Snooze clock button "Snooze thread" opens a menu of presets "{label}" + shortcut-column time, then "Custom…". Hidden when the thread cannot be snoozed (e.g. a queued turn is starting; it reopens after the grace period) — `sidebar/SidebarThreadRow.tsx:368-429,903-933,1531-1539` ⟶ ✓ #default
- **SB-104** Default snooze presets: In 1 hour, In 3 hours, This evening (18:00), Tomorrow (09:00), Next week (Mon 09:00). Labels adapt ("This morning/afternoon/evening", "Next {Day}"). Duplicates are removed. Presets are configurable per environment — `packages/contracts/src/settings.ts:116-122`, `packages/client-runtime/src/state/threadSettled.ts:235-245,285-304`, `Sidebar.snooze.ts:50-57` ⟶ ✓ #default
- **SB-105** Custom snooze dialog "Custom snooze" / "Choose when snoozed threads return to your inbox.": "Date and time" (Date, Time) or "Duration" ("Snooze for", Minutes/Hours/Days). Errors: "Choose a valid date and time in the future." / "Enter a positive duration." — `CustomSnoozeDialog.tsx:97-215` ⟶ ✓ #default
- **SB-106** Stale preset warning toast "Could not snooze thread" / "That snooze time has passed. Choose another time." — `Sidebar.snooze.ts:39-46` ⟶ ✓ #default
- **SB-107** "Settle" (check + text) on cards, ✓ icon on slim rows: "Settle thread" — `sidebar/SidebarThreadRow.tsx:1356-1368,1540-1558` ⟶ ✓ #default
- **SB-108** Settled rows: "Un-settle thread" (Undo2). Snoozed rows: "Wake thread now" (AlarmClockOff) — `sidebar/SidebarThreadRow.tsx:1321-1355` ⟶ ✓ #default
- **SB-109** Action sweep: press on Settle/Un-settle/Wake and drag vertically to apply it to a range of rows in the same section. Rows show a "Settle"/"Un-settle"/"Wake" badge while swept — `Sidebar.tsx:1727-1779`, `Sidebar.logic.ts:289-310`, `sidebar/SidebarThreadRow.tsx:880-884,983-996` ⟶ ✓ #default
- **SB-110** Settle/snooze of the open thread advances to the next inbox row. With none left it opens a new thread in that project, else goes to `/`. Also exposed to `thread.settle` (`mod+shift+s`) via the settle-and-advance registry — `Sidebar.tsx:1521-1584,2141-2172`, `chat/useThreadLifecycle.tsx:569-585` ⟶ ✓ #default
- **SB-111** Inline rename: double-click the row or press F2 → input "Thread title" (selects all). Enter commits, Escape cancels, blur commits. Empty → toast "Thread title cannot be empty". Needs operate scope — `sidebar/SidebarThreadRow.tsx:590-629,835-864`, `Sidebar.tsx:1467-1498` ⟶ ✓ #default

## 10. Context menus

Files: `threadActionMenu.logic.ts`, `Sidebar.tsx`, `localApi.ts`, `contextMenuFallback.ts`.

- **SB-112** Single-thread menu items in order: "New thread on {branch}"; "Pin thread"/"Unpin thread"; "Settle thread"/"Un-settle thread"; "Snooze" › presets "{label} ({time})" + "Custom…" (disabled when it cannot snooze) / "Wake thread"; — "Rename thread"; "Regenerate title" ("Regenerating…" disabled); "Mark unread"; "Share with guest"; "Filter by {project}"/"Show all projects"; "Turn into project" (disabled while running); "Auto-settle behavior" › "Enabled"/"Disabled" (checkmarks); — "Copy" › "Path", "Branch", "Thread", "Thread ID"; "Project settings"; — "Archive thread" (disabled while running); "Delete" (destructive) — `threadActionMenu.logic.ts:113-262`, `Sidebar.tsx:2504-2796` ⟶ ✓ #default
- **SB-113** Read-only connections: items needing operate are shown disabled. Navigation, mark unread, share, copy and project settings stay enabled — `threadActionMenu.logic.ts:98-111,249-261` ⟶ ✓ #default
- **SB-114** Confirms: archive asks `Archive thread "{title}"?` only if enabled (default off). Delete asks `Delete thread "{title}"?` / "This permanently clears conversation history for this thread." (default on). Settings › Confirmations — `Sidebar.tsx:2736-2790`, `packages/contracts/src/settings.ts:416-417` ⟶ ✓ #default
- **SB-115** Multi-select menu (right-click within the selection): "Unpin (N)"; "Settle (N)"; "Snooze (N)" › presets + "Custom…"; "Regenerate titles (N)" / "Regenerating… (N)"; "Mark unread (N)"; "Delete (N)" with confirm "Delete N threads?" / "This permanently clears conversation history for these threads." — `Sidebar.tsx:2194-2451`, `Sidebar.logic.ts:594-617` ⟶ ✓ #default
- **SB-116** Draft menu: "Copy" › "Path"/"Branch"; "Project settings"; "Discard draft" (destructive) — `threadActionMenu.logic.ts:38-67`, `Sidebar.tsx:2453-2502` ⟶ ✓ #default
- **SB-117** Desktop shows native OS menus/confirms through the bridge. Web uses a DOM fallback menu that is dismissed when its state disappears — `localApi.ts:42-58`, `contextMenuFallback.ts:235` ⟶ ✓ #default
- **SB-118** Copy feedback toasts: "Path copied" / "Branch copied" / "Thread ID copied" (value as description); "Path unavailable" — "This thread does not have a workspace path to copy." — `Sidebar.tsx:914-968,2712-2735` ⟶ ✓ #default

## 11. Multi-select

Files: `Sidebar.tsx`, `threadSelectionStore.ts`, `shortcuts/chatRouteCommands.ts`.

- **SB-119** ⌘/Ctrl+click toggles a row, Shift+click selects a range from the anchor (in visible order). Selected rows get a selected surface — `Sidebar.tsx:1500-1514`, `sidebar/SidebarThreadRow.tsx:667,951-952` ⟶ ✓ #default
- **SB-120** Escape clears the selection (on chat routes). Plain navigation, scope change and route widen also clear it — `shortcuts/chatRouteCommands.ts:171-177`, `Sidebar.tsx:1046-1050,1382-1386` ⟶ ✓ #default
- **SB-121** Dragging a selected row out to chat carries the whole selection as context — `Sidebar.tsx:1672-1681` ⟶ ✓ #default

## 12. Keyboard

Files: `lib/sidebarTree.ts`, `Sidebar.tsx`, `AppSidebarLayout.tsx`, `packages/shared/src/keybindings.ts`.

- **SB-122** The list is an ARIA tree "Threads" with roving focus: ↑/↓ rows, Home/End, → expand a shelf/folder or go to its first child, ← collapse or go to the parent. Enter/Space open the row — `lib/sidebarTree.ts:13-30,140-200`, `sidebar/SidebarThreadRow.tsx:846-848` ⟶ ✓ #default
- **SB-123** ContextMenu key / Shift+F10 opens the row menu on key release (VS Code style) — `lib/sidebarTree.ts:146-215` ⟶ ✓ #default
- **SB-124** `thread.previous` / `thread.next` = mod+shift+[ / mod+shift+], through visible order (pinned → active → open shelves) — `packages/shared/src/keybindings.ts:217-218`, `Sidebar.tsx:2803-2852` ⟶ ✓ #default
- **SB-125** `thread.jump.1-9` = mod+1…9, desktop only (`isDesktop`), not while the model picker is open — `packages/shared/src/keybindings.ts:223-227`, `Sidebar.tsx:2839-2841` ⟶ ✓ #default
- **SB-126** `chat.new` mod+n / mod+shift+o; `chat.newLocal` mod+shift+n (shown in the New thread tooltip) — `packages/shared/src/keybindings.ts:201-204` ⟶ ✓ #default
- **SB-127** `thread.undo` mod+z (captured before the composer's own undo while the undo notice is live, one undo per key hold) — `AppSidebarLayout.tsx:222-290`, `packages/shared/src/keybindings.ts:222` ⟶ ✓ #default
- **SB-128** `thread.settle` mod+shift+s, `thread.pin` mod+shift+p, `thread.copyReference` mod+shift+c act on the open thread (chat-level) — `packages/shared/src/keybindings.ts:219-221` ⟶ ✓ #default
- **SB-129** Search keys: Escape clears, ↑/↓/Enter navigate results (IME-safe) — `Sidebar.tsx:1441-1465` ⟶ ✓ #default

## 13. Drag & drop

Files: `Sidebar.tsx`, `Sidebar.drag.ts`, `Sidebar.pointer.ts`, `Sidebar.logic.ts`, `sidebar/SidebarListMarkers.tsx`, `chat/threadContextDrag.ts`.

- **SB-130** Pointer drag after 6px (primary button), vertical axis only, clamped below the Pinned label and inside the scroll area. Escape, blur, resize or a hidden page cancel. Text selection and the native context menu are suppressed during drag — `Sidebar.tsx:858-860,1623-1629,1708-1716`, `Sidebar.pointer.ts:15-143` ⟶ ✓ #default
- **SB-131** Drop plans: into Pinned = pin/reorder pins; into Active = move/reorder (unpin / un-settle / wake as needed); onto Settled = settle. Snoozed is never a target, and Working rows only drag out as chat context — `Sidebar.logic.ts:164-178,222-275,312-420`, `Sidebar.tsx:2001-2140` ⟶ ✓ #default
- **SB-132** Dragged row shows a destination badge: "Pin", "Unpin", "Settle", "Un-settle", "Wake" — `sidebar/SidebarThreadRow.tsx:485-516,983-996`, `Sidebar.logic.ts:275-287` ⟶ ✓ #default
- **SB-133** During a drag the labels "Pinned" / "Active" appear, dashed "Active"/"Settled" placeholders appear when empty, and the "Settled" header highlights as a drop target — `sidebar/SidebarListMarkers.tsx:48-146`, `Sidebar.tsx:3351-3458` ⟶ ✓ #default
- **SB-134** Optimistic drop: the row holds its new place until the server confirms. Failure toasts "Failed to pin thread", "Failed to reorder pinned threads", "Failed to reorder active threads", "Failed to un-settle thread", "Failed to wake thread", "Failed to settle thread" — `Sidebar.tsx:999-1000,714-783,2046-2140` ⟶ ✓ #default
- **SB-135** Dragging horizontally out of the list turns it into a thread-context drag with a ghost ("{title}" + count). Dropping on the chat composer attaches thread(s) as context — `Sidebar.tsx:1682-1707,2894`, `chat/threadContextDrag.ts:4-105` ⟶ ✓ #default
- **SB-136** Drag is disabled while renaming, for unloaded-config environments, without operate scope, in folder mode, and during a pending optimistic drop — `Sidebar.tsx:3210-3215`, `sidebar/SidebarThreadRow.tsx:455-466` ⟶ ✓ #default
- **SB-137** OS file drop onto a row or result: ring highlight, navigate to the thread, and queue the files into its composer (folders are ignored) — `Sidebar.tsx:1396-1416`, `sidebar/SidebarThreadRow.tsx:865-874` ⟶ ✓ #default
- **SB-138** No project reordering by drag: the `manual` project order setting exists but nothing writes `projectOrder` (`reorderProjects` has no caller) — `uiStateStore.ts:387,439-461`, `hooks/useSidebarProjectGroups.ts:19-36` ⟶ ＋ новое: перетаскивание проектов меняет порядок (режим manual) #folders

## 14. Undo notice

Files: `sidebar/SidebarThreadUndoNotice.tsx`, `hooks/showThreadUndoNotice.ts`.

- **SB-139** Footer notice for 5s after "Settled" / "Snoozed" / "Unpinned" / "Archived" / "Discarded" (grouped: "Settled 3,") with the inline button "⌘Z to undo" (or "Undo"). Fades out and is announced to screen readers — `sidebar/SidebarThreadUndoNotice.tsx:14-51`, `hooks/showThreadUndoNotice.ts:15-53,135-150` ⟶ ✓ #default
- **SB-140** Unpinning may ask for confirmation (Settings › Confirmations "Ask before unpinning a thread from the pinned section.") — `Sidebar.tsx:1808-1822`, `settings/SettingsPanels.tsx:893-897` ⟶ ✓ #default

## 15. Empty, loading & error states

Files: `Sidebar.tsx`.

- **SB-141** No projects: "No projects yet" + an outlined "+ Add project" button (opens the palette) — `Sidebar.tsx:3493-3514` ⟶ ✓ #empty (пустое состояние «Add your first project», кнопки Add project / Clone repository)
- **SB-142** No threads: "No threads yet", "No threads in {project} yet", "No threads in these projects yet" — `Sidebar.tsx:3515-3521` ⟶ ✓ #empty
- **SB-143** No dedicated loading skeleton for the list. Empty states render whenever counts are zero, including before snapshots arrive. Only the older-settled shelf has a "Loading" state — `Sidebar.tsx:3493-3523,3480-3484` ⟶ ✓ #default
- **SB-144** Error toasts (stacked): "Failed to settle thread", "Failed to un-settle thread", "Failed to wake thread", "Failed to snooze thread", "Failed to snooze N threads"/"Failed to snooze threads", "Failed to pin thread", "Failed to unpin thread", "Failed to rename thread", "Failed to regenerate thread title(s)", "Failed to update auto-settle", "Could not create thread", "Could not turn thread into a project", "Failed to archive thread", "Thread archived, but navigation failed", "Failed to delete thread(s)", "Failed to copy path/branch/thread ID". Success "Project created" — `Sidebar.tsx:1546-1622,1793-1822,2141-2192,2339-2451,2611-2790` ⟶ ✓ #default

## 16. Remote, permissions & offline environments

Files: `Sidebar.tsx`, `sidebar/SidebarThreadRow.tsx`.

- **SB-145** Threads from all connected environments are merged into one list, and the search spans connected environments — `Sidebar.tsx:1004,1072` ⟶ ✓ #default
- **SB-146** If an environment's server config is not loaded (connecting/offline), its rows lose Settle/Snooze/Pin/drag and are never classed as snoozed/settled. The controls silently disappear — `Sidebar.tsx:619-625,644-647,3233-3235`, `threadActionMenu.logic.ts:84-90` ⟶ ✓ #offline (＋ видимая метка: точка соединения у проекта и строка «Reconnecting…» вместо молча пропавших действий)
- **SB-147** Read-only (no operate scope): drag off, rename off, inline controls hidden, menu items disabled. A blocked bulk action toasts "Thread action unavailable" / "This connection cannot change one or more selected threads." — `Sidebar.tsx:838-856,1008-1018`, `sidebar/SidebarThreadRow.tsx:455-466,929-930` ⟶ ✓ #default
- **SB-148** Remote thread marker (machine icon) + environment line in the hover card. Scratch threads show the machine label in place of the branch — `sidebar/SidebarThreadRow.tsx:801-802,1143-1151,1167-1175,284-292` ⟶ ✓ #default
- **SB-149** Default provider instance ids collide across environments, so provider icons resolve per environment — `Sidebar.tsx:288-312` ⟶ ✓ #default

## 17. Footer

Files: `sidebar/SidebarChrome.tsx`, `sidebar/SidebarUpdatePill.tsx`, `sidebar/SidebarUpdateCapsule.tsx`, `sidebar/SidebarProviderUpdatePill.tsx`, `sidebar/UpdateEverythingDialog.tsx`, `sidebar/SidebarUpdateReleaseNotes.tsx`.

- **SB-150** Icon row: "Settings" (gear → `/settings`), "Pull requests" (PR glyph → `/pull-requests` with saved list prefs, only when supported), "Usage" (chart → `/usage`). Tooltips only. Each closes the mobile sheet — `sidebar/SidebarChrome.tsx:134-225` ⟶ ✓ #default
- **SB-151** On utility pages (`/projects/*`, `/pull-requests`) the icon row becomes "← Back" to the last main view — `sidebar/SidebarChrome.tsx:196-205`, `sidebar/mainAppLocation.ts:18-37` ⟶ ✓ #default
- **SB-152** Undo notice fills the free space in the same row (SB-139) — `sidebar/SidebarChrome.tsx:226` ⟶ ✓ #default
- **SB-153** Desktop update button (round icon): idle "Check for updates" / "Checking for updates…" (spinning check, reduced-motion aware) / available / downloading % / downloaded "Restart". Confirm before install. Errors "Could not download update", "Could not start update download", "Could not install update", "Could not confirm update", "Could not check for updates" — `sidebar/SidebarUpdatePill.tsx:188-383,443-569`, `sidebar/DesktopUpdateStatusIcon.tsx:21-128` ⟶ ✓ #default
- **SB-154** Nightly release-notes hover popover ("Update ready to download", "What's changed", "Changes in {version}", "View release on GitHub"), opened on hover or keyboard focus — `sidebar/SidebarUpdatePill.tsx:520-563`, `sidebar/SidebarUpdateReleaseNotes.tsx:46-120` ⟶ ✓ #default
- **SB-155** "Update everything": when connected servers/providers have updates, the button opens a dialog (Machine / Marp / Providers table, "Skipped", "Cancel"/"Update"). It also shows on web — `sidebar/SidebarUpdatePill.tsx:226-228,350-384,396-406`, `sidebar/UpdateEverythingDialog.tsx:59-220` ⟶ ✓ #default
- **SB-156** Run capsule while updating: per-machine statuses with elapsed time, "This app" "Restart to update", and "Later"/"Retry"/"Dismiss" actions. Toasts "Update did not apply" — `sidebar/SidebarUpdateCapsule.tsx:58-181`, `sidebar/updateEverythingRun.tsx:310-336` ⟶ ✓ #default
- **SB-157** Provider update pill above the row: "Updating {provider}", "{provider} updated: vX", "… update failed", "N providers still need updates". Click → Settings › Providers. Auto-dismiss progress bar; ✕ "Dismiss provider update notice" (tooltip "Dismiss until provider status changes") — `sidebar/SidebarProviderUpdatePill.tsx:45-210`, `ProviderUpdateLaunchNotification.logic.ts:84-436` ⟶ ✓ #default
- **SB-158** Warning alert "Intel build on Apple Silicon" (Electron, arm64 Mac running the x64 build) — `sidebar/SidebarUpdatePill.tsx:113-131` ⟶ ✓ #default
- **SB-159** No Marp Connect/tunnel or environment/connection status item in the sidebar. Connections live in Settings (Machines) — `sidebar/SidebarChrome.tsx:232-240` ⟶ ✓ #default

## 18. Responsive, mobile web & desktop differences

Files: `ui/sidebar.tsx`, `AppSidebarLayout.tsx`, `sidebar/SidebarThreadRow.tsx`.

- **SB-160** At ≤767px the sidebar becomes a Sheet (drawer) at `100vw − 12px` with an sr-only title "Threads" and "Displays the mobile sidebar.". The toggle opens/closes the sheet, and no resize is offered — `ui/sidebar.tsx:101-105,249-257,300-336` ⟶ ✓ #narrow
- **SB-161** Opening a thread/draft, new thread, project settings or footer nav closes the mobile sheet — `Sidebar.tsx:1177-1179,1387-1389,1420-1422,2875,2884` ⟶ ✓ #default
- **SB-162** Touch: header icon buttons get a 48px invisible hit area. Folder "new thread" and count adapt to `pointer-coarse`. Row Settle/Snooze/Un-settle/Wake controls are hover-only (`any-hover`), so touch users reach them only through the context menu — `sidebar/SidebarThreadHeader.tsx:167-170`, `sidebar/SidebarProjectFolderHeader.tsx:89,102`, `sidebar/SidebarThreadRow.tsx:1272,1329,1452,1510` ⟶ ✓ #narrow (＋ на тач-устройствах кнопка «⋯» в строке видна всегда)
- **SB-163** Desktop-only behaviour: drag region, macOS traffic-light inset/fullscreen, native context menus and confirm dialogs, app-menu `sidebar.toggle` / `open-settings`, `mod+1…9` thread jump, desktop update button + architecture warning — `AppSidebarLayout.tsx:67-113,304-307,357-359`, `localApi.ts:47-49`, `packages/shared/src/keybindings.ts:223-227`, `sidebar/SidebarUpdatePill.tsx:113-115,383` ⟶ ✓ #default
- **SB-164** Web (hosted app / `npx marp`): DOM context menu fallback, no jump shortcuts, no local update button (only Update everything for servers) — `localApi.ts:50`, `sidebar/SidebarUpdatePill.tsx:383` ⟶ ✓ #default

## Observations

- **Two status vocabularies.** Sidebar rows say "Approval / Input / Request / Working / Goal / Waiting / Limited / Failed / Woke / Done" (`sidebar/SidebarThreadRow.tsx:723-778`). The palette uses "Pending Approval / Awaiting Input / Guest Request / Connecting / Plan Ready / Completed" (`Sidebar.logic.ts:1073-1175`). There is no "Plan Ready" or "Connecting" in the sidebar, and "Limited"/"Woke"/"Goal" don't exist in the palette. Also two status resolvers (`resolveSidebarThreadStatus` vs `resolveThreadStatusPill`) with subtly different Waiting/Working rules. A redesign should settle on one set.
- **Dead code / dead ends.** `latestRunDiff` always returns null, so the diff counts never show (SB-77). The `manual` project sort exists but nothing can reorder projects (SB-138). `sidebarThreadSortOrder` no longer affects the sidebar (palette and delete-fallback only). The `sidebar_state` cookie is written but never read, so collapse doesn't persist (SB-02). The `Sidebar.logic.ts` `resolveProjectStatusIndicator` / `sortProjectsForSidebar` helpers look legacy.
- **Duplicate toggles.** "Toggle main sidebar" appears in the sidebar header and again as a fixed floating control (SB-03/SB-04). Same label, two DOM triggers.
- **Hidden structure.** Pinned has no header except during drag. The Working/Snoozed/Settled shelves are collapsed by default, and the open thread "leaks" out of a collapsed shelf, which can confuse. Three row shapes (card/slim/folder) plus a multiline variant come from section, not from user choice.
- **Silent capability loss.** Rows from environments without a loaded config just lose Settle/Snooze/Pin/drag with no "offline/connecting" marker (SB-146). There is no sidebar-level connection status for remote/tunnel environments.
- **Touch dead end.** Inline row actions are hover-only, so on mobile web they are reachable only via long-press context menu, which the drag sensor may compete with (SB-162).
- **Empty-state flash.** There is no loading skeleton, so "No projects yet" / "No threads yet" can flash before snapshots load (SB-143).
- **Technical copy.** "Thread ID" copy item, "Regenerate title(s)", "Auto-settle behavior › Enabled/Disabled", "Un-settle", "Turn into project", "Woke", "Limited", the "Settled" count including unloaded threads, and "Could not load older threads. Retry".
- **Two entry points for "new thread in project"** (Shift+click, `chat.newLocal`, folder pen, folder menu, thread menu "New thread on {branch}"). Header behaviour flips between palette picker and direct create depending on project count and boring mode, which is hard to predict.
- **Performance risks.** The terminal-running icon pulses continuously (`motion-safe:animate-status-pulse`, `ThreadStatusIndicators.tsx:563`), against the no-continuous-animation rule. Working rows tick every second. `Sidebar.tsx` is 3.5k lines with heavy render-time derivations (partition, sort, search ranking, `jumpLabelByKey`) rerun on minute/snooze/inbox clocks. FLIP motion does layout reads per commit. Git status/PR queries are leased per visible row (good), but every visible branch row still queries `vcs.status`. The full nightly/dev SVG art renders in the header.
- **Labs fork.** The "boring sidebar" is a parallel layout (folders, no Working shelf, send-time sort, no drag in folders). Any redesign must keep or consciously drop it and migrate `legacySidebarEnabled` users.

## Новое (нет в продукте)

- **NEW-01** Секция «Needs you» над проектами: все треды со статусом needs-you и failed из всех проектов ⟶ ＋ новое: #default
- **NEW-02** Одна лексика статусов (5 семейств: working / needs-you / done / failed / idle) в строках, палитре, шапке треда ⟶ ＋ новое: #statuses
- **NEW-03** Plan ready и Connecting видны в сайдбаре ⟶ ＋ новое: #statuses
- **NEW-04** Карточка окружения внизу: машина + точка соединения + переключение машины ⟶ ＋ новое: #default
- **NEW-05** Скелетон при загрузке вместо мигания «No projects yet» ⟶ ＋ новое: #empty
- **NEW-06** Свёрнутое состояние запоминается между перезапусками ⟶ ＋ новое: #collapsed
- **NEW-07** Без бесконечных анимаций: иконка терминала статична, спиннер только у working ⟶ ＋ новое: #statuses
