/* Marp interactive prototype. One state object, small render functions, real interactions.
   Mount: MarpProto.mount(hostElement, { scenario }). Needs reference.js (window.Ref). */
(function () {
  "use strict";
  const I = (n, c = "") => window.Ref.icon(n, c);
  // A brighter copy of the label under a moving mask; only transform animates, so the text never repaints.
  const shim = (h) =>
    `<span class="shim">${h}<span class="shim-band" aria-hidden="true"><span class="shim-ctr"><span class="shim-copy">${h}</span></span></span></span>`;
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch],
    );
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const MOD = isMac ? "⌘" : "Ctrl";
  const kbd = (...k) =>
    `<span class="kbds">${k.map((x) => `<span class="kbd">${x === "mod" ? MOD : x}</span>`).join("")}</span>`;
  const fmt = (sec) =>
    sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;

  // ───────────────────────── data ─────────────────────────
  const PROJECTS = [
    { id: "mod", mono: "M", name: "Modelion", machine: "DESKTOP-UC7VC6O" },
    { id: "aag", mono: "a", name: "aagenvoro", machine: "DESKTOP-UC7VC6O" },
    { id: "infra", mono: "i", name: "infra", machine: "vps-hel1" },
    { id: "marp", mono: "m", name: "mywwave/Marp", machine: "DESKTOP-UC7VC6O" },
  ];
  const baseThreads = () => [
    {
      id: "t1",
      project: "mod",
      title: "Refactor session refresh",
      status: "idle",
      age: "2m",
      branch: "feat/session-refresh",
    },
    {
      id: "t2",
      project: "mod",
      title: "Add rate limiting to /api/upload",
      status: "working",
      age: "6m",
      branch: "feat/upload-limits",
      terminal: true,
    },
    {
      id: "t3",
      project: "mod",
      title: "Fix flaky checkout e2e test",
      status: "done",
      unread: true,
      age: "12m",
      pr: 482,
      branch: "fix/checkout-e2e",
    },
    {
      id: "t4",
      project: "mod",
      title: "Migrate billing to Stripe v2",
      status: "idle",
      pinned: true,
      age: "2d",
      branch: "billing/stripe-v2",
    },
    {
      id: "t5",
      project: "mod",
      title: "Dark mode for marketing site",
      status: "idle",
      age: "3h",
      branch: "main",
    },
    {
      id: "t6",
      project: "aag",
      title: "Run migrations on staging",
      status: "needs-you",
      reason: "Approval needed",
      unread: true,
      age: "now",
    },
    {
      id: "t7",
      project: "mod",
      title: "Pick a pricing page layout",
      status: "needs-you",
      reason: "Question",
      unread: true,
      age: "4m",
    },
    {
      id: "t8",
      project: "infra",
      title: "Terraform plan for eu-west-2",
      status: "failed",
      reason: "Failed · exit 1",
      unread: true,
      age: "1h",
    },
    { id: "t9", project: "aag", title: "SSR и события на фронте", status: "idle", age: "Oct 26" },
    {
      id: "t10",
      project: "aag",
      title: "Review uncommitted changes",
      status: "idle",
      age: "Oct 24",
    },
    { id: "t11", project: "marp", title: "Settings redesign", status: "done", age: "1d", pr: 12 },
    { id: "t12", project: "infra", title: "Rotate staging secrets", status: "idle", age: "Oct 26" },
    {
      id: "s1",
      project: "mod",
      title: "Nightly dependency audit",
      status: "working",
      shelf: "working",
      age: "40m",
    },
    {
      id: "s2",
      project: "mod",
      title: "Upgrade to React 20",
      status: "idle",
      shelf: "snoozed",
      wake: "Mon 9:00",
    },
    {
      id: "s3",
      project: "aag",
      title: "Q4 roadmap notes",
      status: "idle",
      shelf: "snoozed",
      wake: "Tomorrow",
    },
    {
      id: "s4",
      project: "aag",
      title: "Ключевые ошибки ИИ сейчас",
      status: "idle",
      shelf: "settled",
      age: "Sep 14",
    },
    {
      id: "s5",
      project: "aag",
      title: "Разделить цвета трат и агентств",
      status: "idle",
      shelf: "settled",
      age: "Sep 14",
    },
  ];
  const STEP_SCRIPT = [
    { kind: "think", verb: "Thought", obj: "", meta: "8s" },
    { kind: "read", verb: "Read", dir: "src/auth/", obj: "session.ts" },
    { kind: "search", verb: "Searched", obj: '"expiresAt" in src/', meta: "6 results" },
    { kind: "edit", verb: "Edited", dir: "src/auth/", obj: "session.ts", add: 4, del: 2 },
    { kind: "edit", verb: "Created", dir: "src/auth/", obj: "session.test.ts", add: 38 },
    {
      kind: "run",
      verb: "Ran",
      obj: "pnpm vitest run src/auth",
      meta: "7s",
      out: "✓ src/auth/session.test.ts (2 tests) 41ms\n\nTest Files  1 passed (1)\n     Tests  2 passed (2)",
    },
  ];
  const ANSWER = [
    "The refresh fired exactly at `expiresAt`, so any request in flight during that tick went out with a dead token. I moved the refresh 60 seconds earlier and covered the boundary with a test.",
    "Both auth tests pass, including the new boundary case. The Sentry issue should stop within one deploy.",
  ];
  const STEP_ICON = {
    think: "brain",
    read: "file",
    search: "search",
    edit: "file-pen",
    run: "terminal",
  };
  const FILES = [
    "src/auth/session.ts",
    "src/auth/session.test.ts",
    "src/auth/timers.ts",
    "app/(marketing)/pricing/page.tsx",
    "package.json",
  ];

  function mount(host, options = {}) {
    const S = {
      threads: baseThreads(),
      currentId: "t1",
      selected: new Set(),
      anchor: null,
      kb: -1,
      collapsedProjects: new Set(),
      expandedProjects: new Set(),
      shelves: { working: false, snoozed: false, settled: false },
      search: "",
      sideCollapsed: false,
      sideW: 272,
      panel: { open: false, tab: "diff", max: false, w: 520, file: 0, comment: null },
      drawer: false,
      termLive: true,
      toast: null,
      renaming: null,
      titleEdit: false,
      view: "thread",
      newProject: "mod",
      empty: false,
      offline: false,
      loading: false,
      blocked: null,
      chips: [],
      model: { mk: "Cl", name: "Sonnet 4.5" },
      effort: "High",
      mode: "Chat",
      access: "Supervised",
      find: null,
      jump: false,
      queue: [],
      run: null,
      turns: [],
      ask: null,
      drop: false,
      mention: null,
      dirty: { add: 0, del: 0 },
    };
    host.innerHTML = `<div class="proto" tabindex="-1"><div class="p-side-host"></div><main class="p-sheet"><div class="p-head"></div><div class="p-scroll"><div class="p-col"></div></div><div class="p-jump-host"></div><div class="p-find-host"></div><div class="p-dock"><div class="p-above"></div><div class="p-composer"><div class="chips"></div><textarea rows="2" aria-label="Message"></textarea><div class="p-bar"></div></div></div><div class="p-drawer-host"></div><div class="p-drop-host"></div></main><div class="p-panel-host"></div></div>`;
    const root = host.querySelector(".proto");
    const $ = (s) => root.querySelector(s);
    const ta = $("textarea");
    const sideHost = $(".p-side-host");
    sideHost.replaceWith(
      Object.assign(document.createElement("div"), { className: "p-side-wrap" }),
    );
    const sideWrap = $(".p-side-wrap");
    sideWrap.style.display = "contents";
    const sheet = $(".p-sheet");
    const scroller = $(".p-scroll");
    const col = $(".p-col");
    const cur = () => S.threads.find((t) => t.id === S.currentId);
    const proj = (id) => PROJECTS.find((p) => p.id === id);

    // ───────── popovers & modal ─────────
    let pops = [];
    function closePops(level = 0) {
      while (pops.length > level) pops.pop().el.remove();
    }
    function openPop(anchor, items, opts = {}) {
      closePops(opts.level || 0);
      const el = document.createElement("div");
      el.className = "p-pop";
      el.setAttribute("role", "menu");
      if (opts.width) el.style.width = opts.width + "px";
      el.innerHTML = items
        .map((it) =>
          it === "-"
            ? `<div class="sep"></div>`
            : it.head
              ? `<div class="opt-head">${it.head}</div>`
              : `<button class="opt${it.danger ? " danger" : ""}${it.disabled ? " dis" : ""}" role="menuitem" data-i="${i}" ${it.disabled ? `title="${esc(it.disabled)}"` : ""}>${it.icon ? I(it.icon) : it.mark || ""}<span class="lbl">${it.label}</span><span class="meta">${it.meta || ""}${it.kbd ? kbd(...it.kbd) : ""}${it.sub ? I("chevron-right", "i-14") : ""}${it.checked ? I("check") : ""}</span></button>`,
        )
        .join("");
      document.body.appendChild(el);
      const r = anchor.getBoundingClientRect
        ? anchor.getBoundingClientRect()
        : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0 };
      const w = el.offsetWidth,
        h = el.offsetHeight;
      let left = opts.side === "right" ? r.right + 4 : opts.align === "end" ? r.right - w : r.left;
      let top = opts.side === "right" ? r.top - 4 : r.bottom + 6;
      if (opts.above || top + h > innerHeight - 8)
        top = (opts.side === "right" ? r.bottom : r.top) - h - 6;
      el.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + "px";
      el.style.top = Math.max(8, top) + "px";
      const entry = { el, items, kb: -1 };
      pops.push(entry);
      const btns = () => [...el.querySelectorAll("button.opt:not(.dis)")];
      el.addEventListener("mousemove", (e) => {
        const b = e.target.closest("button.opt");
        if (!b) return;
        const i = btns().indexOf(b);
        if (i !== entry.kb) {
          entry.kb = i;
          paint();
          const it = items[+b.dataset.i];
          if (it.sub) openSub(b, it);
          else closePops(pops.indexOf(entry) + 1);
        }
      });
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button.opt");
        if (!b) return;
        const it = items[+b.dataset.i];
        if (it.sub) return openSub(b, it);
        closePops();
        it.action && it.action();
      });
      function openSub(b, it) {
        openPop(b, it.sub, { side: "right", level: pops.indexOf(entry) + 1, width: it.subWidth });
      }
      function paint() {
        btns().forEach((b, i) => b.classList.toggle("kbsel", i === entry.kb));
      }
      entry.key = (e) => {
        const bs = btns();
        if (e.key === "ArrowDown") {
          entry.kb = (entry.kb + 1) % bs.length;
          paint();
          return true;
        }
        if (e.key === "ArrowUp") {
          entry.kb = (entry.kb - 1 + bs.length) % bs.length;
          paint();
          return true;
        }
        if (e.key === "ArrowRight" && bs[entry.kb]) {
          const it = items[+bs[entry.kb].dataset.i];
          if (it.sub) {
            openSub(bs[entry.kb], it);
            pops[pops.length - 1].kb = 0;
            pops[pops.length - 1].key({ key: "noop" });
          }
          return true;
        }
        if (e.key === "ArrowLeft" && pops.length > 1) {
          closePops(pops.length - 1);
          return true;
        }
        if (e.key === "Enter" && bs[entry.kb]) {
          bs[entry.kb].click();
          return true;
        }
        if (e.key === "Escape") {
          closePops(pops.length - 1);
          return true;
        }
        if (e.key === "noop") {
          paint();
          return true;
        }
        return false;
      };
      if (opts.focusFirst) {
        entry.kb = 0;
        paint();
      }
      return entry;
    }
    function confirmModal({ title, text, action, danger = true, icon = "trash", onOk }) {
      const o = document.createElement("div");
      o.className = "overlay on";
      o.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><span class="danger-mark" ${danger ? "" : 'style="background:var(--attention-soft);color:var(--attention)"'}>${I(icon, "i-18")}</span><div class="grow"><div class="t-heading">${title}</div><p>${text}</p></div></div><div class="modal-foot" style="padding-top:var(--space-24)"><button class="btn ghost" data-x>Cancel</button><button class="btn ${danger ? "danger-solid" : "primary"}" data-ok>${action}</button></div></div>`;
      document.body.appendChild(o);
      const close = () => o.remove();
      o.addEventListener("click", (e) => {
        if (e.target === o || e.target.closest("[data-x]")) close();
        if (e.target.closest("[data-ok]")) {
          close();
          onOk();
        }
      });
      o.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Enter") {
          close();
          onOk();
        }
      });
      o.querySelector("[data-ok]").focus();
    }
    function toast(text, undo) {
      clearTimeout(S.toastTimer);
      S.toast = { text, undo };
      S.toastTimer = setTimeout(() => {
        S.toast = null;
        renderSide();
      }, 5000);
      renderSide();
    }

    // ───────── sidebar ─────────
    const visible = (t) => !t.archived;
    function rowsModel() {
      const q = S.search.trim().toLowerCase();
      if (q) {
        const hits = S.threads.filter((t) => visible(t) && t.title.toLowerCase().includes(q));
        return { search: hits };
      }
      const needs = S.threads.filter(
        (t) =>
          visible(t) &&
          !t.shelf &&
          (t.status === "needs-you" || t.status === "failed") &&
          !S.offlineHidden?.has(t.id),
      );
      const pinned = S.threads.filter(
        (t) => visible(t) && !t.shelf && t.pinned && !needs.includes(t),
      );
      const groups = PROJECTS.map((p) => ({
        p,
        rows: S.threads.filter(
          (t) => visible(t) && !t.shelf && t.project === p.id && !t.pinned && !needs.includes(t),
        ),
      })).filter((g) => g.rows.length || S.many);
      const shelves = ["working", "snoozed", "settled"].map((k) => ({
        k,
        rows: S.threads.filter((t) => visible(t) && t.shelf === k),
      }));
      return { needs, pinned, groups, shelves };
    }
    function flatOrder() {
      const m = rowsModel();
      if (m.search) return m.search.map((t) => t.id);
      const ids = [...m.needs, ...m.pinned].map((t) => t.id);
      m.groups.forEach((g) => {
        if (!S.collapsedProjects.has(g.p.id)) limit(g).forEach((t) => ids.push(t.id));
      });
      m.shelves.forEach((s) => {
        if (S.shelves[s.k]) s.rows.forEach((t) => ids.push(t.id));
      });
      return ids;
    }
    const LIMIT = 5;
    const limit = (g) => (S.expandedProjects.has(g.p.id) ? g.rows : g.rows.slice(0, LIMIT));
    function rowHtml(t, opts = {}) {
      const offline = proj(t.project).machine === "vps-hel1" && S.offline;
      const sd =
        t.status === "working"
          ? `<span class="sd working">${I("loader", "spin")}</span>`
          : `<span class="sd ${t.status}"></span>`;
      const q = S.search.trim();
      let title = esc(t.title);
      if (q)
        title = title.replace(
          new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"),
          "<mark>$1</mark>",
        );
      const two = (opts.reason && t.reason) || opts.project;
      const meta =
        t.shelf === "snoozed"
          ? `${I("clock")}${t.wake}`
          : `${t.pinned ? I("pin") : ""}${t.terminal ? I("terminal") : ""}${t.pr ? `${I("git-pull-request")}#${t.pr}` : ""}<span>${t.status === "working" && t.id === S.currentId && S.run ? "now" : t.age || ""}</span>`;
      const settleIcon = t.shelf === "settled" ? ["undo", "Un-settle"] : ["check", "Settle"];
      return `<div class="p-row${two ? " two" : ""}${t.id === S.currentId && S.view === "thread" ? " current" : ""}${t.unread ? " unread" : ""}${S.selected.has(t.id) ? " selected" : ""}${opts.kb ? " kb" : ""}${t.entering ? " entering" : ""}${t.leaving ? " leaving" : ""}" data-row="${t.id}" role="treeitem" aria-selected="${t.id === S.currentId}" ${offline ? 'style="opacity:.55"' : ""}>
        ${sd}<span class="check">${I("check")}</span>
        <span class="txt">${S.renaming === t.id ? `<input class="rename" value="${esc(t.title)}" aria-label="Thread title">` : `<span class="t">${title}</span>`}${two ? `<span class="reason">${esc(t.reason)} · ${esc(proj(t.project).name)}</span>` : opts.project ? `<span class="reason">${esc(proj(t.project).name)}</span>` : ""}</span>
        <span class="end"><span class="meta">${meta}</span><span class="hover-acts"><button class="p-mini" data-act="snooze" aria-label="Snooze" data-tip="Snooze">${I("snooze")}</button><button class="p-mini" data-act="settle" aria-label="${settleIcon[1]}" data-tip="${settleIcon[1]}" data-tip-kbd="${MOD} ⇧ S">${I(settleIcon[0])}</button><button class="p-mini" data-act="menu" aria-label="More actions" data-tip="More">${I("more")}</button></span></span></div>`;
    }
    function renderSide() {
      if (S.sideCollapsed) {
        const m = rowsModel();
        const dot = (p) => {
          const rows = S.threads.filter((t) => t.project === p.id && !t.shelf && !t.archived);
          return rows.some((t) => t.status === "failed")
            ? "var(--danger)"
            : rows.some((t) => t.status === "needs-you")
              ? "var(--attention)"
              : rows.some((t) => t.status === "working")
                ? "var(--working)"
                : null;
        };
        sideWrap.innerHTML = `<aside class="p-rail" aria-label="Threads"><button class="r" data-cmd="expand" aria-label="Expand sidebar" data-tip="Expand sidebar" data-tip-kbd="${MOD} B">${I("panel-left")}</button><button class="r" data-cmd="new" aria-label="New thread" data-tip="New thread" data-tip-kbd="${MOD} N">${I("plus")}</button><button class="r" data-cmd="expand-search" aria-label="Search" data-tip="Search">${I("search")}</button>
          ${m.needs.length ? `<button class="m" data-cmd="expand" data-tip="Needs you: ${m.needs.length}" aria-label="Needs you">${I("hand", "i-14")}<span class="badge-dot" style="background:var(--attention)"></span></button>` : ""}<div class="sep" style="width:24px"></div>
          ${PROJECTS.map((p) => `<button class="m" data-rail-project="${p.id}" data-tip="${esc(p.name)}" aria-label="${esc(p.name)}">${p.mono}${dot(p) ? `<span class="badge-dot" style="background:${dot(p)}"></span>` : ""}</button>`).join("")}
          <span class="grow"></span><button class="r" aria-label="Settings" data-tip="Settings">${I("settings")}</button></aside>`;
        return;
      }
      const m = rowsModel();
      const order = flatOrder();
      const kbId = order[S.kb];
      let list = "";
      if (S.loading)
        list = [70, 55, 82, 64, 48, 76]
          .map(
            (w) =>
              `<div class="p-skel-row"><span class="skel" style="width:8px;height:8px;border-radius:50%"></span><span class="skel" style="height:10px;width:${w}%"></span></div>`,
          )
          .join("");
      else if (S.empty)
        list = `<div class="p-empty"><span class="tile">${I("folder")}</span><h4>Add your first project</h4><p>Point Marp at a folder or clone a repository.</p><div class="acts"><button class="btn sm" data-cmd="add-project">${I("plus")}Add project</button><button class="btn ghost sm" data-cmd="clone">Clone repository</button></div></div>`;
      else if (m.search)
        list = m.search.length
          ? `<div class="p-section"><div class="p-group-label">Threads<span class="n">${m.search.length}</span></div><div class="p-rows">${m.search.map((t) => rowHtml(t, { kb: t.id === kbId, project: true })).join("")}</div></div><div class="p-section"><div class="p-group-label">Messages</div><div class="p-rows"><div class="p-row two" data-row="t1"><span class="sd idle"></span><span class="txt"><span class="t">Refactor session refresh</span><span class="reason">…keep the <mark>${esc(S.search)}</mark> token in the session…</span></span></div></div></div>`
          : `<div class="empty-row">No threads match “${esc(S.search)}”.</div>`;
      else {
        if (m.needs.length)
          list += `<div class="p-section p-needs"><div class="p-group-label">${I("hand", "i-14")}Needs you<span class="n">${m.needs.length}</span></div><div class="p-rows">${m.needs.map((t) => rowHtml(t, { reason: true, kb: t.id === kbId })).join("")}</div></div>`;
        if (m.pinned.length)
          list += `<div class="p-section"><div class="p-group-label">Pinned</div><div class="p-rows">${m.pinned.map((t) => rowHtml(t, { kb: t.id === kbId })).join("")}</div></div>`;
        list += `<div class="p-section">${m.groups
          .map((g) => {
            const off = g.p.machine === "vps-hel1" && S.offline;
            const collapsed = S.collapsedProjects.has(g.p.id);
            const shown = collapsed ? [] : limit(g);
            return `<div class="p-proj${collapsed ? " collapsed" : ""}" data-proj="${g.p.id}" role="treeitem" aria-expanded="${!collapsed}"><span class="mono">${g.p.mono}</span><span class="name">${esc(g.p.name)}</span>${off ? `<span class="conn" data-tip="vps-hel1 is offline"></span>` : ""}<span class="acts"><button class="p-mini" data-pact="new" aria-label="New thread in ${esc(g.p.name)}" data-tip="New thread in ${esc(g.p.name)}">${I("plus")}</button><button class="p-mini" data-pact="menu" aria-label="Project actions" data-tip="Project actions">${I("more")}</button></span>${I("chevron-down", "i-14 chev")}</div>
            ${off && !collapsed ? `<div class="empty-row" style="text-align:left;padding:4px 12px 6px 36px">${shim("Reconnecting to vps-hel1…")} <a href="#" data-cmd="reconnect">Retry now</a></div>` : ""}
            <div class="p-rows" role="group">${shown.map((t) => rowHtml(t, { kb: t.id === kbId })).join("")}</div>${!collapsed && g.rows.length > LIMIT ? `<button class="p-more-btn" data-more="${g.p.id}">${S.expandedProjects.has(g.p.id) ? "Show less" : `Show ${g.rows.length - LIMIT} more`}</button>` : ""}`;
          })
          .join("")}</div>`;
        list += `<div class="p-shelves">${m.shelves.map((s) => `<button class="p-shelf${S.shelves[s.k] ? " open" : ""}" data-shelf="${s.k}" aria-expanded="${S.shelves[s.k]}">${I("chevron-right", "i-14 chev")}${s.k[0].toUpperCase() + s.k.slice(1)}<span class="n">${s.rows.length}</span></button>${S.shelves[s.k] ? `<div class="p-rows">${s.rows.map((t) => rowHtml(t, { kb: t.id === kbId })).join("")}</div>` : ""}`).join("")}</div>`;
      }
      const bulk =
        S.selected.size >= 2
          ? `<div class="p-bulk" role="toolbar" aria-label="${S.selected.size} threads selected"><span class="count">${S.selected.size} selected</span><button class="btn ghost icon sm" data-bulk="settle" aria-label="Settle" data-tip="Settle" data-tip-kbd="S">${I("check")}</button><button class="btn ghost icon sm" data-bulk="snooze" aria-label="Snooze" data-tip="Snooze" data-tip-kbd="Z">${I("snooze")}</button><button class="btn ghost icon sm" data-bulk="archive" aria-label="Archive" data-tip="Archive">${I("archive")}</button><button class="btn ghost icon sm" data-bulk="clear" aria-label="Clear selection" data-tip="Clear selection" data-tip-kbd="Esc">${I("x")}</button></div>`
          : "";
      const tst =
        S.toast && !bulk
          ? `<div class="p-toast" role="status"><span class="grow">${S.toast.text}</span>${S.toast.undo ? `<button data-cmd="undo">Undo</button>` : ""}</div>`
          : "";
      const focusSearch =
        document.activeElement && document.activeElement.matches(".p-search input");
      const caret = focusSearch ? document.activeElement.selectionStart : 0;
      sideWrap.innerHTML = `<aside class="p-side" style="--p-side-w:${S.sideW}px" aria-label="Threads">
        <div class="p-side-top"><span class="p-brand"><img src="assets/marp-icon.svg" alt="" width="20" height="20" style="border-radius:6px">marp</span><span class="grow"></span><button class="btn ghost icon sm" data-cmd="collapse" aria-label="Collapse sidebar" data-tip="Collapse sidebar" data-tip-kbd="${MOD} B">${I("panel-left")}</button></div>
        <div class="p-side-actions"><button class="p-new" data-cmd="new">${I("plus")}New thread${kbd("mod", "N")}</button><label class="p-search">${I("search")}<input placeholder="Search threads" value="${esc(S.search)}" aria-label="Search threads">${S.search ? `<button class="p-mini" data-cmd="clear-search" aria-label="Clear search">${I("x")}</button>` : kbd("/")}</label></div>
        <div class="p-list" tabindex="0" role="tree" aria-label="Threads" aria-multiselectable="true">${list}</div>
        ${bulk}${tst}
        <div class="p-foot"><button class="p-foot-btn" data-cmd="prs">${I("git-pull-request")}Pull requests<span class="end">3</span></button><button class="p-foot-btn" data-cmd="settings">${I("settings")}Settings<span class="end">${kbd("mod", ",")}</span></button>
        <button class="p-machine" data-cmd="machine">${I("laptop", "ink-3")}<span><b>DESKTOP-UC7VC6O</b><small>${S.offline ? "1 machine offline" : "This device · 2 machines"}</small></span><span class="dot${S.offline ? " warn" : ""}"></span></button></div>
        <div class="p-resize" title=""></div></aside>`;
      if (focusSearch) {
        const inp = sideWrap.querySelector(".p-search input");
        inp.focus();
        inp.setSelectionRange(caret, caret);
      }
      const rn = sideWrap.querySelector(".rename");
      if (rn) {
        rn.focus();
        rn.select();
      }
      sideWrap.querySelectorAll("[data-tip]").forEach(() => {});
    }

    function openThread(id) {
      const t = S.threads.find((x) => x.id === id);
      if (!t) return;
      const changed = S.currentId !== id || S.view !== "thread";
      S.currentId = id;
      S.view = "thread";
      S.selected.clear();
      if (changed) loadThreadFor(t);
      t.unread = false;
      renderAll();
    }
    function settle(ids, undoable = true) {
      const before = ids.map((id) => {
        const t = S.threads.find((x) => x.id === id);
        return [t, t.shelf];
      });
      ids.forEach((id) => {
        const t = S.threads.find((x) => x.id === id);
        t.leaving = true;
      });
      renderSide();
      setTimeout(() => {
        ids.forEach((id) => {
          const t = S.threads.find((x) => x.id === id);
          t.leaving = false;
          t.shelf = t.shelf === "settled" ? null : "settled";
          t.unread = false;
        });
        S.selected.clear();
        toast(
          ids.length > 1 ? `Settled ${ids.length} threads` : `Settled “${esc(before[0][0].title)}”`,
          undoable &&
            (() => {
              before.forEach(([t, shelf]) => {
                t.shelf = shelf;
                t.entering = true;
              });
              renderSide();
              setTimeout(() => before.forEach(([t]) => (t.entering = false)), 300);
            }),
        );
      }, 200);
    }
    function snooze(ids, label, wake) {
      const before = ids.map((id) => {
        const t = S.threads.find((x) => x.id === id);
        return [t, t.shelf, t.wake];
      });
      ids.forEach((id) => {
        const t = S.threads.find((x) => x.id === id);
        t.shelf = "snoozed";
        t.wake = wake;
      });
      S.selected.clear();
      toast(
        ids.length > 1
          ? `Snoozed ${ids.length} threads until ${label.toLowerCase()}`
          : `Snoozed until ${label.toLowerCase()}`,
        () => {
          before.forEach(([t, shelf, w]) => {
            t.shelf = shelf;
            t.wake = w;
          });
          renderSide();
        },
      );
    }
    function archive(ids) {
      ids.forEach((id) => (S.threads.find((x) => x.id === id).archived = true));
      S.selected.clear();
      toast(ids.length > 1 ? `Archived ${ids.length} threads` : "Thread archived", () => {
        ids.forEach((id) => (S.threads.find((x) => x.id === id).archived = false));
        renderSide();
      });
    }
    const snoozeItems = (ids) =>
      [
        ["In 1 hour", "15:20", "15:20"],
        ["This evening", "18:00", "18:00"],
        ["Tomorrow", "Fri 9:00", "Tomorrow"],
        ["Next week", "Mon 9:00", "Mon 9:00"],
        ["Until limits reset", "16:40", "16:40"],
      ]
        .map(([label, meta, wake]) => ({ label, meta, action: () => snooze(ids, label, wake) }))
        .concat([
          "-",
          {
            icon: "clock",
            label: "Pick date & time…",
            action: () => toast("Custom snooze opens a date picker"),
          },
        ]);
    function rowMenu(anchor, id) {
      const ids = S.selected.has(id) && S.selected.size > 1 ? [...S.selected] : [id];
      const t = S.threads.find((x) => x.id === id);
      const offline =
        proj(t.project).machine === "vps-hel1" && S.offline ? "vps-hel1 is offline" : null;
      if (ids.length > 1)
        return openPop(
          anchor,
          [
            { head: `${ids.length} threads` },
            { icon: "check", label: "Settle", kbd: ["S"], action: () => settle(ids) },
            { icon: "snooze", label: "Snooze", sub: snoozeItems(ids) },
            {
              icon: "pin",
              label: "Pin",
              action: () => {
                ids.forEach((x) => (S.threads.find((y) => y.id === x).pinned = true));
                S.selected.clear();
                renderSide();
              },
            },
            "-",
            { icon: "archive", label: "Archive", action: () => archive(ids) },
          ],
          { focusFirst: !anchor.getBoundingClientRect },
        );
      openPop(
        anchor,
        [
          {
            icon: "plus",
            label: `New thread on <span class="mono t-code-sm">${esc(t.branch || "main")}</span>`,
            action: () => newThread(t.project),
          },
          "-",
          {
            icon: "pencil",
            label: "Rename",
            kbd: ["F2"],
            action: () => {
              S.renaming = id;
              renderSide();
            },
          },
          {
            icon: "pin",
            label: t.pinned ? "Unpin" : "Pin",
            kbd: ["P"],
            disabled: offline,
            action: () => {
              t.pinned = !t.pinned;
              renderSide();
            },
          },
          {
            icon: t.shelf === "settled" ? "undo" : "check",
            label: t.shelf === "settled" ? "Un-settle" : "Settle",
            kbd: ["S"],
            disabled: offline,
            action: () => settle([id]),
          },
          { icon: "snooze", label: "Snooze", sub: snoozeItems([id]), disabled: offline },
          { icon: "fork", label: "Fork thread", action: () => toast(`Forked “${esc(t.title)}”`) },
          {
            icon: "copy",
            label: "Copy",
            sub: [
              { icon: "link", label: "Link", action: () => toast("Link copied") },
              { icon: "git-branch", label: "Branch name", action: () => toast("Branch copied") },
              { icon: "file", label: "Thread ID", action: () => toast("Thread ID copied") },
            ],
          },
          "-",
          { icon: "archive", label: "Archive", action: () => archive([id]) },
          { icon: "trash", label: "Delete…", danger: true, kbd: ["⌫"], action: () => del(id) },
        ],
        { width: 280, focusFirst: !anchor.getBoundingClientRect },
      );
    }
    function del(id) {
      const t = S.threads.find((x) => x.id === id);
      confirmModal({
        title: `Delete “${esc(t.title)}”?`,
        text: "Removes the thread, its 6 checkpoints and its worktree. You can't undo this.",
        action: "Delete thread",
        onOk: () => {
          t.archived = true;
          if (S.currentId === id) openThread("t3");
          toast("Thread deleted");
        },
      });
    }
    function newThread(projectId) {
      S.view = "new";
      S.newProject = projectId || "mod";
      S.selected.clear();
      renderAll();
      ta.focus();
    }

    // ───────── thread content ─────────
    function loadThreadFor(t) {
      stopRun(true);
      S.ask = null;
      S.queue = [];
      S.turns = [];
      S.blocked = null;
      if (t.status === "done" || t.status === "idle") {
        S.turns = [
          doneTurn(
            t.id === "t1"
              ? "The session refresh races the expiry and we see random 401s in prod. Move the refresh earlier and add a test for the edge case."
              : `Work on “${t.title}”.`,
          ),
        ];
        S.turns[0].code = t.id === "t1";
        S.dirty = t.status === "done" ? { add: 42, del: 2 } : { add: 0, del: 0 };
      }
      if (t.status === "needs-you" && t.reason === "Approval needed") scenario("approval", true);
      else if (t.status === "needs-you") scenario("question", true);
      else if (t.status === "failed") scenario("failed", true);
      else if (t.status === "working") scenario("working", true);
    }
    const userMsg = (text, chips = []) => ({ text, chips });
    function doneTurn(text, opts = {}) {
      return {
        user: userMsg(text, opts.chips || []),
        model: "Claude Sonnet 4.5",
        mk: "Cl",
        time: "14:12",
        steps: STEP_SCRIPT.map((s) => ({ ...s, status: "done" })),
        state: "done",
        answer: ANSWER.slice(),
        logOpen: false,
        dur: 72,
        checkpoint: { files: 2, add: 42, del: 2 },
      };
    }
    function renderHead() {
      const t = cur();
      if (S.view === "new") {
        $(".p-head").innerHTML =
          `<span class="p-title" style="cursor:default;color:var(--ink-3);font-weight:500">New thread</span><div class="right"><button class="chip" data-cmd="pick-project">${I("folder")}${esc(proj(S.newProject).name)}${I("chevron-down", "i-14")}</button><button class="chip" data-cmd="pick-machine">${I("laptop")}DESKTOP-UC7VC6O</button><button class="chip" data-cmd="pick-workspace">${I("git-branch")}<span class="mono-txt">New worktree from main</span>${I("chevron-down", "i-14")}</button></div>`;
        return;
      }
      const running = !!S.run && !S.run.paused;
      const status = S.ask
        ? S.ask.type === "approval"
          ? `<span class="status needs-you">${I("hand")}Approval needed</span>`
          : S.ask.type === "question"
            ? `<span class="status needs-you">${I("question")}Question</span>`
            : S.ask.type === "plan"
              ? `<span class="status needs-you">${I("list-checks")}Plan ready</span>`
              : `<span class="status failed">${I("alert")}Failed</span>`
        : running
          ? `<span class="status working">${I("loader", "spin")}Working · <span data-timer>${fmt(S.run.sec)}</span></span>`
          : t.status === "done"
            ? `<span class="status done">${I("check")}Done</span>`
            : "";
      const gitReason = running
        ? "Wait for Claude to finish this turn"
        : S.dirty.add === 0 && S.dirty.del === 0
          ? "Nothing to commit. The worktree is clean."
          : null;
      const gitLabel = S.dirty.add || S.dirty.del ? (S.committed ? "Push" : "Commit") : "Commit";
      $(".p-head").innerHTML =
        (S.titleEdit
          ? `<input class="p-title-input" value="${esc(t.title)}" aria-label="Thread title">`
          : `<span class="p-title" data-cmd="rename-title" data-tip="Rename" title="">${esc(t.title)}</span>`) +
        status +
        `<div class="right"><button class="chip wide" data-cmd="branch">${I("git-branch")}<span class="mono-txt">${esc(t.branch || "feat/session-refresh")}</span>${I("chevron-down", "i-14")}</button>
        ${S.dirty.add || S.dirty.del ? `<button class="p-diffsum" data-cmd="open-diff" data-tip="Open diff" data-tip-kbd="${MOD} ⇧ D"><span class="add">+${S.dirty.add}</span><span class="del">−${S.dirty.del}</span></button>` : ""}
        <button class="btn ghost icon sm wide" data-cmd="open-in" aria-label="Open in VS Code" data-tip="Open in VS Code" data-tip-kbd="${MOD} O">${I("external-link")}</button>
        <div class="split p-git"><button class="btn sm" data-cmd="git" ${gitReason ? `aria-disabled="true" data-tip="${gitReason}"` : `data-tip="${gitLabel}" data-tip-kbd="${MOD} ⇧ C"`}>${I(gitLabel === "Push" ? "upload" : "git-commit")}<span class="wide">${gitLabel}</span></button><button class="btn sm" data-cmd="git-menu" aria-label="More git actions">${I("chevron-down")}</button></div>
        <span class="sep-v"></span>
        <button class="btn ghost icon sm" data-cmd="details" aria-label="Thread details" data-tip="Thread details">${I("info")}</button>
        <button class="btn ghost icon sm" data-cmd="drawer" aria-label="Terminal" data-tip="Terminal" data-tip-kbd="${MOD} J" aria-pressed="${S.drawer}">${I("terminal")}</button>
        <button class="btn ghost icon sm" data-cmd="panel" aria-label="Right panel" data-tip="Right panel" data-tip-kbd="${MOD} ⌥ B" aria-pressed="${S.panel.open}">${I("panel-right")}</button></div>`;
      const ti = $(".p-title-input");
      if (ti) {
        ti.focus();
        ti.select();
      }
    }
    function stepHtml(s, ti, si) {
      const obj = s.dir ? `<span class="dir">${s.dir}</span>${s.obj}` : esc(s.obj);
      const live = s.status === "live";
      const m =
        s.kind === "edit"
          ? `${s.add ? `<span class="add">+${s.add}</span>` : ""}${s.del ? `<span class="del">−${s.del}</span>` : ""}`
          : s.status === "err"
            ? `<span class="exit">Failed · exit 1</span><span>9s</span>`
            : live
              ? `<span data-step-timer>0:0${s.sec || 0}</span>`
              : s.meta
                ? esc(s.meta)
                : "";
      const verb = live
        ? {
            read: "Reading",
            search: "Searching",
            edit: "Editing",
            run: "Running",
            think: "Thinking",
          }[s.kind]
        : s.verb;
      const out =
        s.open && s.out
          ? `<div class="p-out"><pre>${esc(s.out)}</pre><div class="foot"><span class="grow">${s.status === "err" ? "Exit code 1 · 9s" : "Exit code 0 · 7s"}</span><button class="btn ghost sm" data-cmd="copy-out">${I("copy")}Copy output</button></div></div>`
          : "";
      return `<button class="p-step${live ? " live" : ""}${s.status === "err" ? " err" : ""}${s.fresh ? " entering" : ""}" data-step="${ti}:${si}" ${s.kind === "edit" ? `data-tip="Open diff"` : s.out ? `data-tip="${s.open ? "Hide" : "Show"} output"` : ""}>${live ? I("loader", "spin") : I(STEP_ICON[s.kind])}${s.kind === "think" ? (live ? shim(`<span class="ink-3">Thinking</span>`) : `<span class="ink-3">Thought for ${s.meta}</span>`) : live ? shim(`${verb}<span class="obj">${obj}</span>`) : `${verb}<span class="obj">${obj}</span>`}<span class="m">${m}</span></button>${out}`;
    }
    function logHtml(turn, ti) {
      const running = turn.state === "running";
      const done = turn.steps.filter((s) => s.status !== "live");
      const edits = done.filter((s) => s.kind === "edit").length,
        runs = done.filter((s) => s.kind === "run").length,
        reads = done.filter((s) => s.kind === "read" || s.kind === "search").length;
      const parts = [
        reads && `read ${reads} ${reads === 1 ? "file" : "files"}`,
        edits && `edited ${edits}`,
        runs && `ran ${runs} ${runs === 1 ? "command" : "commands"}`,
      ].filter(Boolean);
      const live = turn.steps.find((s) => s.status === "live");
      const sum = (
        running
          ? `${live ? { read: "Reading", search: "Searching", edit: "Editing", run: "Running tests", think: "Thinking" }[live.kind] : "Working"}${parts.length ? " · " + parts.join(", ") : ""}`
          : parts.join(", ") || "Worked"
      ).replace(/^./, (c) => c.toUpperCase());
      const open = running ? turn.logOpen !== false : turn.logOpen;
      let steps = turn.steps;
      let earlier = "";
      if (running && !turn.showAll && steps.length > 4) {
        earlier = `<button class="p-earlier" data-cmd="earlier" data-turn="${ti}">${steps.length - 3} earlier steps</button>`;
        steps = steps.slice(-3);
      }
      const offset = turn.steps.length - steps.length;
      return `<div class="p-log${open ? " open" : ""}"><button class="p-log-sum" data-log="${ti}" aria-expanded="${open}">${I("chevron-right", "i-14 chev")}${running ? I("loader", "i-14 spin live") : I("wrench", "i-14")}${running && !open ? shim(`<span>${sum}</span>`) : `<span>${sum}</span>`}<span class="dur">${running ? `<span data-timer>${fmt(S.run ? S.run.sec : 0)}</span>` : fmt(turn.dur || 0)}</span></button><div class="p-steps">${earlier}${steps.map((s, i) => stepHtml(s, ti, i + offset)).join("")}</div></div>`;
    }
    const md = (p) => esc(p).replace(/`([^`]+)`/g, "<code>$1</code>");
    function renderTimeline() {
      if (S.view === "new") {
        col.innerHTML = "";
        return;
      }
      const html = S.turns
        .map((turn, ti) => {
          const user = `<div class="p-user${turn.sending ? " sending" : ""}"><div class="bubble">${esc(turn.user.text)}${turn.user.chips.length ? `<div class="chips">${turn.user.chips.map((c) => `<span class="chip">${I(c.icon)}<span class="${c.mono ? "mono-txt" : ""}">${esc(c.label)}</span></span>`).join("")}</div>` : ""}</div><div class="acts"><button class="p-icon-btn" data-cmd="copy-msg" aria-label="Copy message" data-tip="Copy">${I("copy")}</button><button class="p-icon-btn" data-cmd="edit-from" data-turn="${ti}" aria-label="Edit from here" data-tip="Edit from here">${I("pencil")}</button></div></div>`;
          if (!turn.steps) return `<div class="p-turn">${user}</div>`;
          const answer = turn.answer.length
            ? `<div class="p-answer${turn.streaming ? " streaming" : ""}">${turn.answer.map((p, i) => (i === 0 && turn.code ? `<p>${md(p)}</p><div class="codeblock"><div class="cb-head">src/auth/session.ts<button class="btn ghost icon sm" aria-label="Copy code" data-tip="Copy">${I("copy")}</button></div><pre><span class="kw">const</span> SKEW_MS = <span class="nm">60_000</span>;\n<span class="kw">const</span> expires = session.expiresAt - SKEW_MS;</pre></div>` : `<p>${md(p)}</p>`)).join("")}</div>`
            : "";
          const notes = (turn.notes || [])
            .map((n) => `<div class="p-note">${I(n.icon)}${n.text}</div>`)
            .join("");
          const agent = `<div class="p-agent"><div class="p-author"><span class="pmark s16">${turn.mk}</span><b>${turn.model}</b>· ${turn.time}</div>${logHtml(turn, ti)}${notes}${answer}${turn.state === "done" ? `<div class="acts"><button class="p-icon-btn" data-cmd="copy-msg" aria-label="Copy response" data-tip="Copy">${I("copy")}</button><button class="p-icon-btn" data-cmd="fork" aria-label="Fork from here" data-tip="Fork from here">${I("fork")}</button></div>` : ""}</div>`;
          const cp = turn.checkpoint
            ? `<div class="p-checkpoint">Checkpoint · ${turn.checkpoint.files} files changed<button data-cmd="cp-diff" data-turn="${ti}">View diff</button><button data-cmd="cp-restore" data-turn="${ti}">Restore</button></div>`
            : "";
          return `<div class="p-turn">${user}${agent}</div>${cp}`;
        })
        .join("");
      const ask = askHtml();
      const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
      col.innerHTML = html + (ask ? `<div class="p-asks">${ask}</div>` : "");
      if (S.find) applyFind();
      if (nearBottom || S.forceScroll) {
        scroller.scrollTop = scroller.scrollHeight;
        S.jump = false;
        S.forceScroll = false;
      } else if (S.run) S.jump = true;
      renderJump();
    }
    function askHtml() {
      const a = S.ask;
      if (!a) return "";
      if (a.type === "approval")
        return `<div class="p-card" data-ask><div class="row"><span class="status needs-you">${I("hand")}Approval needed</span><span class="grow"></span><span class="t-caption ink-3">Supervised · asks before commands</span></div><div class="q">Run a command that deletes files</div><div class="cmd">rm -rf dist .turbo</div><div class="foot"><span class="grow">Removes build output in <span class="mono">acme-web</span>. Source files are not touched.</span><button class="btn ghost sm" data-cmd="deny">Deny <span class="kbd">Esc</span></button><button class="btn sm" data-cmd="always">Always allow</button><button class="btn primary sm" data-cmd="approve">Approve <span class="kbd">↵</span></button></div></div>`;
      if (a.type === "question")
        return `<div class="p-card" data-ask><div class="row"><span class="status needs-you">${I("question")}Question</span><span class="grow"></span><span class="t-caption ink-3">1 of 1</span></div><div class="q">Which layout should the pricing page use?</div><div class="stack" style="gap:6px" role="radiogroup">${[
          ["Three cards side by side", "Starter, Agency, Enterprise. Agency highlighted."],
          ["Comparison table", "One table with every feature per plan."],
        ]
          .map(
            ([b, s], i) =>
              `<button class="p-opt" role="radio" aria-checked="${a.pick === i}" data-pick="${i}"><span class="k">${i + 1}</span><span><b>${b}</b><span class="s">${s}</span></span></button>`,
          )
          .join(
            "",
          )}<div class="p-opt" role="radio" aria-checked="${a.pick === 2}" data-pick="2"><span class="k">3</span>${a.pick === 2 ? `<input placeholder="Describe the layout you want" value="${esc(a.other || "")}" aria-label="Other answer">` : `<span><b>Other…</b><span class="s">Describe it in your own words.</span></span>`}</div></div><div class="foot"><span class="grow">Press 1–3 to choose</span><button class="btn ghost sm" data-cmd="skip-q">Skip</button><button class="btn primary sm" data-cmd="answer" ${a.pick == null ? "disabled" : ""}>Send answer <span class="kbd">↵</span></button></div></div>`;
      if (a.type === "plan")
        return `<div class="p-card" data-ask><div class="row"><span class="status needs-you">${I("list-checks")}Plan ready</span><span class="grow"></span><button class="btn ghost icon sm" data-cmd="copy-plan" aria-label="Copy plan" data-tip="Copy plan">${I("copy")}</button></div><div class="q">Split billing into its own service</div><div class="plan"><ol><li>Move <code>services/billing</code> into <code>packages/billing</code> with its own entry point.</li><li>Replace direct imports with a typed client over the internal RPC.</li><li>Run both paths behind a flag for one release.</li><li>Delete the in-process path once traffic is at 100%.</li></ol></div><div class="foot"><span class="grow">4 steps · about 25 files · switches to Build</span><button class="btn sm" data-cmd="refine">${I("pencil")}Refine</button><button class="btn primary sm" data-cmd="implement">Implement plan ${kbd("mod", "↵")}</button></div></div>`;
      if (a.type === "error")
        return `<div class="p-card danger" data-ask><div class="row"><span class="status failed">${I("alert")}Turn failed</span></div><div class="q">Claude stopped responding</div><div class="t-body">The connection closed after 30 seconds without output. Your changes up to the last checkpoint are safe.</div><details><summary class="t-caption ink-3" style="cursor:pointer">Details</summary><pre class="t-code-sm" style="margin:6px 0 0;white-space:pre-wrap">error: stream closed (code 1006) · trace 3f9a…c21</pre></details><div class="foot"><span class="grow"></span><button class="btn ghost sm" data-cmd="copy-err">Copy details</button><button class="btn sm" data-cmd="retry">${I("undo")}Retry turn</button></div></div>`;
      return "";
    }
    function renderJump() {
      $(".p-jump-host").innerHTML = S.jump
        ? `<button class="p-jump" data-cmd="jump">${I("arrow-up", "i-14")}New activity</button>`.replace(
            "arrow-up",
            "chevron-down",
          )
        : "";
    }
    function renderDock() {
      const running = !!S.run && !S.run.paused;
      const hasText = ta.value.trim().length > 0 || S.chips.length > 0;
      const above = [];
      if (S.blocked)
        above.push(
          `<div class="p-blocked">${I("alert")}<span class="grow">${S.blocked}</span><button class="btn sm" data-cmd="unblock">Sign in</button></div>`,
        );
      S.queue.forEach((q, i) =>
        above.push(
          `<div class="p-queued">${I("clock")}<span class="grow">Queued: ${esc(q)}</span><button class="btn ghost icon sm" data-cmd="unqueue" data-q="${i}" aria-label="Remove from queue" data-tip="Remove">${I("x")}</button></div>`,
        ),
      );
      if (running && hasText)
        above.push(
          `<div class="p-note" style="padding:0 12px">${I("info")}Enter steers Claude now · ${MOD}+Enter queues it for after this turn</div>`,
        );
      $(".p-above").innerHTML = above.join("");
      $(".p-above").style.display = above.length ? "flex" : "none";
      $(".p-composer .chips").innerHTML = S.chips
        .map(
          (c, i) =>
            `<span class="chip">${I(c.icon)}<span class="${c.mono ? "mono-txt" : ""}">${esc(c.label)}</span><button class="x" data-cmd="unchip" data-c="${i}" aria-label="Remove ${esc(c.label)}">${I("x", "i-14")}</button></span>`,
        )
        .join("");
      $(".p-composer .chips").style.display = S.chips.length ? "flex" : "none";
      const askBlocks = S.ask && S.ask.type !== "error";
      const placeholder =
        S.view === "new"
          ? "Describe a task, paste an error, or @ a file…"
          : S.ask?.type === "approval"
            ? "Tell Claude what to do instead…"
            : S.ask?.type === "plan"
              ? "Add feedback to refine the plan…"
              : running
                ? "Steer Claude, or queue a follow-up…"
                : "Ask Claude to…";
      ta.placeholder = placeholder;
      let send;
      if (running && !hasText)
        send = `<button class="p-send stop" data-cmd="stop" aria-label="Stop" data-tip="Stop" data-tip-kbd="Esc"><i class="sq"></i></button>`;
      else if (S.blocked || (askBlocks && !hasText))
        send = `<button class="p-send" disabled aria-label="Send" data-tip="${S.blocked ? "Sign in to Claude first" : "Answer the card above, or type to give other instructions"}">${I("arrow-up")}</button>`;
      else
        send = `<button class="p-send" data-cmd="send" aria-label="${running ? "Steer" : "Send"}" data-tip="${running ? "Steer" : "Send"}" data-tip-kbd="↵" ${hasText ? "" : "disabled"}>${I("arrow-up")}</button>`;
      $(".p-bar").innerHTML =
        `<button class="btn ghost sm" data-cmd="attach" aria-label="Attach files" data-tip="Attach files">${I("paperclip")}</button><button class="btn ghost sm" data-cmd="model"><span class="pmark s16">${S.model.mk}</span>${S.model.name}${I("chevron-down", "i-14")}</button><button class="btn ghost sm" data-cmd="effort" data-tip="Reasoning effort · click to change">${I("brain")}<span class="bl">${S.effort}</span></button><button class="btn ghost sm" data-cmd="mode" data-tip="Chat or plan" data-tip-kbd="⇧ Tab">${I("list-checks")}<span class="bl">${S.mode}</span></button><button class="btn ghost sm" data-cmd="access" data-tip="${S.access} · click to change">${I(S.access === "Full access" ? "zap" : "shield")}<span class="bl">${S.access}</span>${S.access === "Full access" ? `<span class="access-dot"></span>` : ""}</button><div class="right"><span class="row t-caption ink-3" data-tip-title="Context window" data-tip="How much of the model's memory this thread uses. Near the limit, older messages get summarized."><span class="ctx-ring" style="--p:${S.ctx || 38}"></span><span class="num">${S.ctx || 38}%</span></span>${send}</div>`;
      const dock = $(".p-dock");
      if (S.view === "new") {
        if (!dock.classList.contains("hero")) {
          dock.classList.add("hero");
          col.innerHTML = "";
          const hero = document.createElement("div");
          hero.className = "p-hero";
          hero.innerHTML = `<h3>What should we build?</h3><span class="sub">${esc(proj(S.newProject).name)} · new worktree from main</span><div class="p-hero-dock"></div><div class="suggest"><button class="chip" data-suggest="Fix the failing CI on main">${I("terminal")}Fix the failing CI on main</button><button class="chip" data-suggest="Review PR #482">${I("git-pull-request")}Review PR #482</button><button class="chip" data-suggest="Explain the auth flow">${I("search")}Explain the auth flow</button></div>`;
          scroller.style.display = "none";
          sheet.insertBefore(hero, scroller);
          hero.querySelector(".p-hero-dock").appendChild(dock);
        }
      } else if (dock.classList.contains("hero")) {
        dock.classList.remove("hero");
        sheet.querySelector(".p-hero")?.remove();
        scroller.style.display = "";
        sheet.insertBefore(dock, $(".p-drawer-host"));
      }
    }
    function renderDrawer() {
      $(".p-drawer-host").innerHTML =
        S.drawer && S.view === "thread"
          ? `<div class="p-drawer"><div class="p-term-bar"><button class="p-ptab" aria-selected="true">${S.termLive ? `<span class="live"></span>` : ""}pnpm dev</button><button class="p-ptab" aria-selected="false">zsh</button><button class="btn ghost icon sm" aria-label="New terminal" data-tip="New terminal">${I("plus")}</button><span class="grow"></span>${S.termLive ? `<button class="btn sm" data-cmd="term-stop" data-tip="Send Ctrl+C">${I("x")}Stop</button>` : `<button class="btn sm" data-cmd="term-start">${I("play")}Run again</button>`}<button class="btn ghost icon sm" data-cmd="drawer" aria-label="Close terminal" data-tip="Close" data-tip-kbd="${MOD} J">${I("chevron-down")}</button></div><div class="p-term"><span class="dim">$</span> pnpm dev\n<span class="c">▲ Next.js 16.1</span>  - Local: <span class="c">http://localhost:3000</span>\n<span class="p">✓</span> Ready in 1.8s\n<span class="dim">GET /pricing 200 in 84ms</span>${S.termLive ? "" : `\n<span class="e">^C</span>\n<span class="dim">$</span> `}</div></div>`
          : "";
    }
    function renderPanel() {
      const host = $(".p-panel-host");
      root.classList.toggle("maximized", S.panel.open && S.panel.max);
      if (!S.panel.open || S.view === "new") {
        host.innerHTML = "";
        return;
      }
      const tabs = [
        ["diff", "file-diff", `Diff <span class="t-caption ink-3">2</span>`],
        ["terminal", "terminal", "Terminal"],
        ["preview", "globe", "Preview"],
        ["pr", "git-pull-request", "#482"],
      ];
      let body = "";
      if (S.panel.tab === "diff") {
        const files = [
          ["session.ts", "src/auth/", 4, 2],
          ["session.test.ts", "src/auth/", 40, 0],
        ];
        const f = files[S.panel.file];
        const lines =
          S.panel.file === 0
            ? [
                ["hunk", "", "", "@@ -38,9 +38,11 @@"],
                ["", "38", "38", 'import { useInterval } from "./timers";'],
                ["a", "", "39", '<span class="wa">const SKEW_MS = 60_000;</span>'],
                ["", "40", "41", "export function useSession(initial: Session) {"],
                ["d", "42", "", '  const expires = session.<span class="wd">expiresAt</span>;'],
                [
                  "a",
                  "",
                  "43",
                  '  const expires = session.<span class="wa">expiresAt - SKEW_MS</span>;',
                ],
                ["", "44", "44", "  return session;"],
              ]
            : [
                ["hunk", "", "", "@@ -0,0 +1,40 @@"],
                ["a", "", "1", 'import { describe, expect, it } from "vitest";'],
                ["a", "", "2", 'import { useSession } from "./session";'],
                ["a", "", "4", 'describe("useSession", () => {'],
                ["a", "", "5", '  it("refreshes before expiry", () => {'],
              ];
        body = `<div class="p-dtool"><div class="seg sm"><button aria-pressed="true">This turn</button><button aria-pressed="false">Branch</button></div><div class="seg sm"><button aria-pressed="true">Stacked</button><button aria-pressed="false">Split</button></div><span class="grow"></span><button class="btn ghost icon sm" data-cmd="diff-opts" aria-label="Diff options" data-tip="Whitespace, wrap, file tree">${I("settings")}</button></div>
          <div class="p-dmain"><div class="p-dfiles">${files.map((x, i) => `<button class="p-dfile${i === S.panel.file ? " on" : ""}" data-file="${i}">${I(i ? "plus" : "file-pen", "i-14 " + (i ? "add" : "ink-3"))}<span class="nm">${x[0]}</span><span class="t-caption add">+${x[2]}</span>${x[3] ? `<span class="t-caption del">−${x[3]}</span>` : ""}</button>`).join("")}</div>
          <div class="p-dcode"><div class="p-dhead"><span class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span>${f[1]}</span><b>${f[0]}</b></span><span class="t-caption"><span class="add">+${f[2]}</span> <span class="del">${f[3] ? "−" + f[3] : ""}</span></span><button class="btn ghost icon sm" data-cmd="copy-path" aria-label="Copy path" data-tip="Copy path">${I("copy")}</button></div>
          ${lines.map((l) => (l[0] === "hunk" ? `<div class="p-dl hunk"><span class="ln">@@</span><span>${l[3].slice(3)}</span></div>` : `<div class="p-dl ${l[0]}" data-line="${l[2] || l[1]}">${l[0] === "a" || l[0] === "" ? `<button class="add-c" data-cmd="comment" data-line="${l[2] || l[1]}" aria-label="Comment on line ${l[2] || l[1]}" data-tip="Comment for Claude">${I("plus")}</button>` : ""}<span class="ln">${l[1]}</span><span class="ln">${l[2]}</span><span>${l[3]}</span></div>${S.panel.comment === (l[2] || l[1]) && S.panel.commentFile === S.panel.file ? `<div class="p-comment"><input placeholder="Comment for Claude on line ${l[2] || l[1]}…" aria-label="Comment"><button class="btn ghost sm" data-cmd="comment-cancel">Cancel</button><button class="btn sm" data-cmd="comment-add">Add to prompt</button></div>` : ""}`)).join("")}</div></div>`;
      } else if (S.panel.tab === "terminal") {
        body = `<div class="p-term-wrap"><div class="p-term-bar"><span class="grow t-caption ink-3">${S.termLive ? "pnpm dev · running" : "pnpm dev · stopped"}</span>${S.termLive ? `<button class="btn sm" data-cmd="term-stop">${I("x")}Stop</button>` : `<button class="btn sm" data-cmd="term-start">${I("play")}Run again</button>`}</div><div class="p-term"><span class="dim">$</span> pnpm dev\n<span class="c">▲ Next.js 16.1</span>  - Local: <span class="c">http://localhost:3000</span>\n<span class="p">✓</span> Ready in 1.8s${S.termLive ? "" : `\n<span class="e">^C</span>`}</div></div>`;
      } else if (S.panel.tab === "preview") {
        body = `<div class="p-url"><button class="btn ghost icon sm" aria-label="Back" data-tip="Back">${I("arrow-left")}</button><button class="btn ghost icon sm" aria-label="Reload" data-tip="Reload">${I("undo")}</button><input class="input" value="localhost:3000/pricing" aria-label="Address"><button class="btn ghost sm">100%</button></div><div class="p-canvas"><div class="nav"><b style="color:#111">Modelion</b><span>Features</span><span>Pricing</span><span>Docs</span></div><h4>Simple pricing for agencies</h4><div style="color:#666;font-size:14px">One plan per agency. Unlimited models and chatters.</div><span class="cta">Start free trial</span></div>`;
      } else {
        body = `<div style="padding:4px 16px 16px;display:flex;flex-direction:column;gap:12px;overflow:auto"><div><div class="t-title">fix(auth): refresh sessions before they expire</div><div class="t-caption ink-3"><span class="mono">feat/session-refresh</span> → <span class="mono">main</span> · opened 1h ago</div></div><div class="row"><span class="badge working dot">Open</span><span class="badge success dot">Checks passing</span><span class="badge">1 approval</span></div>${["build 1m 12s", "test 2m 40s", "lint 31s", "e2e 4m 02s"].map((c) => `<div class="row" style="min-height:var(--row-xs)">${I("check", "add i-14")}<span class="grow">${c.split(" ")[0]}</span><span class="t-caption ink-3">${c.split(" ").slice(1).join(" ")}</span></div>`).join("")}<div class="row"><span class="grow"></span><button class="btn sm">Squash ▾</button><button class="btn primary sm" data-cmd="merge">Merge pull request</button></div></div>`;
      }
      host.innerHTML = `<section class="p-panel" style="--p-panel-w:${S.panel.w}px" aria-label="Right panel"><div class="resize" data-tip="Drag to resize · double-click to reset"></div><div class="p-ptabs" role="tablist">${tabs.map(([k, ic, l]) => `<button class="p-ptab" role="tab" data-tab="${k}" aria-selected="${S.panel.tab === k}">${k === "terminal" && S.termLive ? `<span class="live"></span>` : I(ic)}${l}</button>`).join("")}<span class="grow"></span><button class="btn ghost icon sm" data-cmd="maximize" aria-label="${S.panel.max ? "Restore" : "Maximize"} panel" data-tip="${S.panel.max ? "Restore" : "Maximize"}" data-tip-kbd="${MOD} ⌥ M">${I(S.panel.max ? "panel-left" : "panel-right")}</button><button class="btn ghost icon sm" data-cmd="panel" aria-label="Close panel" data-tip="Close" data-tip-kbd="${MOD} W">${I("x")}</button></div><div class="p-pbody">${body}</div></section>`;
      const ci = host.querySelector(".p-comment input");
      if (ci) ci.focus();
    }
    function renderAll() {
      renderSide();
      renderHead();
      renderTimeline();
      renderDock();
      renderDrawer();
      renderPanel();
    }

    // ───────── agent run simulation ─────────
    function stopRun(silent) {
      if (!S.run) return;
      clearInterval(S.run.tick);
      clearTimeout(S.run.timer);
      clearInterval(S.run.stream);
      const turn = S.turns[S.run.turn];
      if (!silent && turn) {
        turn.state = "done";
        turn.dur = S.run.sec;
        turn.steps = turn.steps.filter((s) => s.status !== "live");
        (turn.notes = turn.notes || []).push({
          icon: "x",
          text: `Stopped by you after ${fmt(S.run.sec)}. Changes so far are kept.`,
        });
        turn.streaming = false;
      }
      S.run = null;
      if (!silent) {
        const t = cur();
        t.status = "idle";
        renderAll();
      }
    }
    function startRun(turnIndex, opts = {}) {
      const turn = S.turns[turnIndex];
      const script = (opts.script || STEP_SCRIPT).map((s) => ({ ...s }));
      turn.steps = turn.steps || [];
      turn.state = "running";
      turn.answer = [];
      turn.logOpen = true;
      S.run = { turn: turnIndex, sec: opts.sec || 0, i: opts.from || 0, script, paused: false };
      const t = cur();
      t.status = "working";
      S.run.tick = setInterval(() => {
        if (!S.run || S.run.paused) return;
        S.run.sec++;
        root.querySelectorAll("[data-timer]").forEach((el) => (el.textContent = fmt(S.run.sec)));
        const live = turn.steps.find((s) => s.status === "live");
        if (live) {
          live.sec = (live.sec || 0) + 1;
          root
            .querySelectorAll("[data-step-timer]")
            .forEach((el) => (el.textContent = `0:${String(live.sec).padStart(2, "0")}`));
        }
      }, 1000);
      const next = () => {
        if (!S.run) return;
        turn.steps.forEach((s) => {
          if (s.status === "live") s.status = s.failAt ? "err" : "done";
          s.fresh = false;
        });
        const step = S.run.script[S.run.i];
        if (opts.askAt != null && S.run.i === opts.askAt && !S.run.asked) {
          S.run.asked = true;
          S.run.paused = true;
          S.ask = { type: opts.ask };
          t.status = "needs-you";
          t.reason = opts.ask === "approval" ? "Approval needed" : "Question";
          renderAll();
          return;
        }
        if (!step) return finish();
        turn.steps.push({ ...step, status: "live", sec: 0, fresh: true });
        if (step.kind === "edit") {
          S.dirty.add += step.add || 0;
          S.dirty.del += step.del || 0;
          renderHead();
        }
        S.run.i++;
        renderTimeline();
        renderDock();
        renderSide();
        S.run.timer = setTimeout(next, step.kind === "run" ? 1600 : 900);
      };
      S.run.next = next;
      const finish = () => {
        if (opts.fail) {
          turn.steps.forEach((s) => (s.status = s.status === "live" ? "done" : s.status));
          turn.steps.push({
            kind: "run",
            verb: "Ran",
            obj: "pnpm vitest run src/auth",
            status: "err",
            out: "FAIL src/auth/session.test.ts > refreshes before expiry\nAssertionError: expected 1 to be 2",
            open: true,
          });
          turn.state = "done";
          turn.dur = S.run.sec;
          clearInterval(S.run.tick);
          S.run = null;
          S.ask = { type: "error" };
          t.status = "failed";
          t.reason = "Failed · exit 1";
          renderAll();
          return;
        }
        turn.code = true;
        turn.streaming = true;
        const words = ANSWER.join("   ").split(" ");
        let n = 0;
        S.run.stream = setInterval(() => {
          n += 4;
          const text = words.slice(0, n).join(" ");
          turn.answer = text
            .split("   ")
            .map((p) => p.replace(" ", "").trim())
            .filter(Boolean);
          const el = col.querySelectorAll(".p-answer");
          if (el.length && el[el.length - 1]) renderTimeline();
          else renderTimeline();
          if (n >= words.length) {
            clearInterval(S.run.stream);
            clearInterval(S.run.tick);
            turn.streaming = false;
            turn.state = "done";
            turn.dur = S.run.sec;
            turn.logOpen = false;
            turn.checkpoint = { files: 2 };
            S.run = null;
            t.status = "done";
            t.unread = S.currentId !== t.id;
            if (S.queue.length) {
              const q = S.queue.shift();
              renderAll();
              setTimeout(() => send(q), 400);
              return;
            }
            renderAll();
          }
        }, 70);
      };
      renderAll();
      S.run.timer = setTimeout(next, 600);
    }
    function send(text, chips = S.chips.splice(0)) {
      text = text.trim();
      if (!text && !chips.length) return;
      if (S.view === "new") {
        S.view = "thread";
        const t = {
          id: "n" + Date.now(),
          project: S.newProject,
          title: text.slice(0, 48),
          status: "working",
          age: "now",
          entering: true,
          branch: "feat/" + text.toLowerCase().split(" ").slice(0, 3).join("-"),
        };
        S.threads.unshift(t);
        S.currentId = t.id;
        S.turns = [];
        S.dirty = { add: 0, del: 0 };
      }
      if (S.run && !S.run.paused) {
        const turn = S.turns[S.run.turn];
        (turn.notes = turn.notes || []).push({
          icon: "arrow-up",
          text: `You steered: “${esc(text)}”`,
        });
        ta.value = "";
        renderAll();
        return;
      }
      if (S.ask?.type === "approval") {
        resolveAsk("deny", text);
        ta.value = "";
        return;
      }
      if (S.ask?.type === "plan") {
        S.ask = null;
      }
      S.turns.push({
        user: userMsg(text, chips),
        model: `Claude ${S.model.name}`,
        mk: S.model.mk,
        time: "14:20",
        steps: [],
        answer: [],
        state: "running",
        sending: true,
      });
      ta.value = "";
      autosize();
      S.forceScroll = true;
      const idx = S.turns.length - 1;
      renderAll();
      setTimeout(() => {
        S.turns[idx].sending = false;
        startRun(idx);
      }, 250);
    }
    function resolveAsk(kind, text) {
      const a = S.ask;
      S.ask = null;
      const t = cur();
      const turn = S.run ? S.turns[S.run.turn] : S.turns[S.turns.length - 1];
      if (a.type === "approval") {
        (turn.notes = turn.notes || []).push(
          kind === "deny"
            ? {
                icon: "x",
                text: `Denied <span class="mono">rm -rf dist .turbo</span>${text ? ` · “${esc(text)}”` : ""}`,
              }
            : {
                icon: "check",
                text: `${kind === "always" ? "Always allowed" : "Approved"} <span class="mono">rm -rf dist .turbo</span>`,
              },
        );
        if (S.run) {
          S.run.paused = false;
          t.status = "working";
          t.reason = null;
          renderAll();
          S.run.timer = setTimeout(S.run.next, 500);
        }
      } else if (a.type === "question") {
        const answers = ["Three cards side by side", "Comparison table", a.other || "Other"];
        (turn.notes = turn.notes || []).push({
          icon: "question",
          text:
            kind === "skip" ? "You skipped the question" : `You answered: ${esc(answers[a.pick])}`,
        });
        if (S.run) {
          S.run.paused = false;
          t.status = "working";
          t.reason = null;
          renderAll();
          S.run.timer = setTimeout(S.run.next, 500);
        }
      }
      renderAll();
    }
    function autosize() {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }

    // ───────── find in thread ─────────
    function applyFind() {
      col
        .querySelectorAll("mark.f")
        .forEach((m) => m.replaceWith(document.createTextNode(m.textContent)));
      col.normalize();
      const q = S.find.q.trim().toLowerCase();
      S.find.hits = [];
      if (!q) return updateFindCount();
      const walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.parentElement.closest(".bubble, .p-answer")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const text = node.textContent;
        const lower = text.toLowerCase();
        let i = lower.indexOf(q);
        if (i < 0) return;
        const frag = document.createDocumentFragment();
        let last = 0;
        while (i >= 0) {
          frag.append(text.slice(last, i));
          const m = document.createElement("mark");
          m.className = "f";
          m.textContent = text.slice(i, i + q.length);
          frag.append(m);
          S.find.hits.push(m);
          last = i + q.length;
          i = lower.indexOf(q, last);
        }
        frag.append(text.slice(last));
        node.replaceWith(frag);
      });
      S.find.i = Math.min(S.find.i || 0, Math.max(0, S.find.hits.length - 1));
      S.find.hits.forEach((m, i) => m.classList.toggle("cur", i === S.find.i));
      S.find.hits[S.find.i]?.scrollIntoView({ block: "center" });
      updateFindCount();
    }
    function updateFindCount() {
      const n = root.querySelector(".p-find .n");
      if (n)
        n.textContent = S.find.hits?.length
          ? `${S.find.i + 1} of ${S.find.hits.length}`
          : S.find.q
            ? "No results"
            : "";
    }
    function renderFind() {
      $(".p-find-host").innerHTML = S.find
        ? `<div class="p-find" role="search"><input value="${esc(S.find.q)}" placeholder="Find in thread" aria-label="Find in thread"><span class="n"></span><button class="btn ghost icon sm" data-cmd="find-prev" aria-label="Previous match" data-tip="Previous" data-tip-kbd="⇧ ↵" style="rotate:180deg">${I("chevron-down")}</button><button class="btn ghost icon sm" data-cmd="find-next" aria-label="Next match" data-tip="Next" data-tip-kbd="↵">${I("chevron-down")}</button><button class="btn ghost icon sm" data-cmd="find-close" aria-label="Close find" data-tip="Close" data-tip-kbd="Esc">${I("x")}</button></div>`
        : "";
      const inp = root.querySelector(".p-find input");
      if (inp) {
        inp.focus();
        inp.select();
        applyFind();
      }
    }

    // ───────── events ─────────
    root.addEventListener("click", (e) => {
      const el = e.target;
      const row = el.closest("[data-row]");
      const act = el.closest("[data-act]");
      if (row && act) {
        e.stopPropagation();
        const id = row.dataset.row;
        if (act.dataset.act === "settle") settle([id]);
        if (act.dataset.act === "snooze") openPop(act, snoozeItems([id]), { align: "end" });
        if (act.dataset.act === "menu") rowMenu(act, id);
        return;
      }
      if (row && !el.closest(".rename")) {
        const id = row.dataset.row;
        const order = flatOrder();
        if (e.metaKey || e.ctrlKey) {
          S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
          if (S.selected.size === 1 && !S.selected.has(S.currentId)) S.selected.add(S.currentId);
          S.anchor = id;
          renderSide();
          return;
        }
        if (e.shiftKey && (S.anchor || S.currentId)) {
          const a = order.indexOf(S.anchor || S.currentId),
            b = order.indexOf(id);
          S.selected = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
          renderSide();
          return;
        }
        S.kb = order.indexOf(id);
        S.anchor = id;
        openThread(id);
        return;
      }
      const pact = el.closest("[data-pact]");
      if (pact) {
        e.stopPropagation();
        const pid = pact.closest("[data-proj]").dataset.proj;
        if (pact.dataset.pact === "new") newThread(pid);
        else
          openPop(
            pact,
            [
              {
                icon: "plus",
                label: "New thread",
                kbd: ["mod", "N"],
                action: () => newThread(pid),
              },
              {
                icon: "chevron-down",
                label: S.collapsedProjects.has(pid) ? "Expand" : "Collapse",
                action: () => {
                  S.collapsedProjects.has(pid)
                    ? S.collapsedProjects.delete(pid)
                    : S.collapsedProjects.add(pid);
                  renderSide();
                },
              },
              {
                icon: "settings",
                label: "Project settings",
                action: () => toast("Opens Settings → Projects"),
              },
              {
                icon: "folder",
                label: "Open folder",
                action: () => toast("Opened in File Explorer"),
              },
              "-",
              {
                icon: "trash",
                label: "Remove from Marp…",
                danger: true,
                action: () =>
                  confirmModal({
                    title: `Remove “${esc(proj(pid).name)}”?`,
                    text: "Removes the project and its threads from Marp. Files and git history stay on disk.",
                    action: "Remove project",
                    onOk: () => toast("Project removed"),
                  }),
              },
            ],
            { align: "end" },
          );
        return;
      }
      const pj = el.closest("[data-proj]");
      if (pj) {
        const pid = pj.dataset.proj;
        S.collapsedProjects.has(pid)
          ? S.collapsedProjects.delete(pid)
          : S.collapsedProjects.add(pid);
        renderSide();
        return;
      }
      const more = el.closest("[data-more]");
      if (more) {
        const pid = more.dataset.more;
        S.expandedProjects.has(pid) ? S.expandedProjects.delete(pid) : S.expandedProjects.add(pid);
        renderSide();
        return;
      }
      const shelf = el.closest("[data-shelf]");
      if (shelf) {
        S.shelves[shelf.dataset.shelf] = !S.shelves[shelf.dataset.shelf];
        renderSide();
        return;
      }
      const bulk = el.closest("[data-bulk]");
      if (bulk) {
        const ids = [...S.selected];
        ({
          settle: () => settle(ids),
          snooze: () => openPop(bulk, snoozeItems(ids), { above: true }),
          archive: () => archive(ids),
          clear: () => {
            S.selected.clear();
            renderSide();
          },
        })[bulk.dataset.bulk]();
        return;
      }
      const railP = el.closest("[data-rail-project]");
      if (railP) {
        const pid = railP.dataset.railProject;
        openPop(
          railP,
          [
            { head: esc(proj(pid).name) },
            ...S.threads
              .filter((t) => t.project === pid && !t.shelf && !t.archived)
              .map((t) => ({
                mark:
                  t.status === "working"
                    ? I("loader", "spin")
                    : `<span class="sdot ${t.status}"></span>`,
                label: esc(t.title),
                meta: t.age,
                action: () => openThread(t.id),
              })),
            "-",
            { icon: "plus", label: "New thread", action: () => newThread(pid) },
          ],
          { side: "right", width: 300 },
        );
        return;
      }
      const log = el.closest("[data-log]");
      if (log) {
        const turn = S.turns[+log.dataset.log];
        turn.logOpen = !(turn.state === "running" ? turn.logOpen !== false : turn.logOpen);
        renderTimeline();
        return;
      }
      const step = el.closest("[data-step]");
      if (step) {
        const [ti, si] = step.dataset.step.split(":").map(Number);
        const s = S.turns[ti].steps[si];
        if (s.kind === "edit") {
          S.panel.open = true;
          S.panel.tab = "diff";
          S.panel.file = s.obj.includes("test") ? 1 : 0;
          renderPanel();
          renderHead();
        } else if (s.out) {
          s.open = !s.open;
          renderTimeline();
        }
        return;
      }
      const pick = el.closest("[data-pick]");
      if (pick && S.ask?.type === "question" && !el.matches("input")) {
        S.ask.pick = +pick.dataset.pick;
        renderTimeline();
        if (S.ask.pick === 2) root.querySelector(".p-opt input")?.focus();
        return;
      }
      const tab = el.closest("[data-tab]");
      if (tab) {
        S.panel.tab = tab.dataset.tab;
        renderPanel();
        return;
      }
      const file = el.closest("[data-file]");
      if (file) {
        S.panel.file = +file.dataset.file;
        S.panel.comment = null;
        renderPanel();
        return;
      }
      const sug = el.closest("[data-suggest]");
      if (sug) {
        ta.value = sug.dataset.suggest;
        autosize();
        ta.focus();
        renderDock();
        return;
      }
      const c = el.closest("[data-cmd]");
      if (!c) return;
      const cmd = c.dataset.cmd;
      const handlers = {
        new: () => newThread(cur()?.project),
        collapse: () => {
          S.sideCollapsed = true;
          renderSide();
        },
        expand: () => {
          S.sideCollapsed = false;
          renderSide();
        },
        "expand-search": () => {
          S.sideCollapsed = false;
          renderSide();
          sideWrap.querySelector(".p-search input").focus();
        },
        "clear-search": () => {
          S.search = "";
          S.kb = -1;
          renderSide();
        },
        undo: () => {
          const u = S.toast?.undo;
          S.toast = null;
          clearTimeout(S.toastTimer);
          u && u();
          renderSide();
        },
        reconnect: () => {
          e.preventDefault();
          S.offline = false;
          toast("Reconnected to vps-hel1");
          renderAll();
        },
        machine: () =>
          openPop(
            c,
            [
              { head: "Machines" },
              { icon: "laptop", label: "DESKTOP-UC7VC6O", meta: "this device", checked: true },
              { icon: "server", label: "vps-hel1", meta: S.offline ? "Offline" : "Online" },
              "-",
              {
                icon: "plus",
                label: "Add machine…",
                action: () => toast("Opens Settings → Machines"),
              },
            ],
            { above: true, width: 280 },
          ),
        settings: () => toast("Opens Settings"),
        prs: () => toast("Opens Pull requests"),
        "add-project": () => {
          S.empty = false;
          renderAll();
          toast("Added “Modelion”");
        },
        clone: () => toast("Clone opens a repository picker"),
        "rename-title": () => {
          S.titleEdit = true;
          renderHead();
        },
        branch: () =>
          openPop(
            c,
            [
              { head: "Switch branch" },
              {
                icon: "git-branch",
                label: '<span class="mono t-code-sm">feat/session-refresh</span>',
                checked: true,
              },
              {
                icon: "git-branch",
                label: '<span class="mono t-code-sm">main</span>',
                action: () => toast("Switched to main"),
              },
              { icon: "git-branch", label: '<span class="mono t-code-sm">fix/checkout-e2e</span>' },
              "-",
              {
                icon: "plus",
                label: "New branch…",
                action: () => toast("New branch from feat/session-refresh"),
              },
            ],
            { align: "end", width: 300 },
          ),
        "open-diff": () => {
          S.panel.open = true;
          S.panel.tab = "diff";
          renderPanel();
          renderHead();
        },
        "open-in": () => toast("Opened in VS Code"),
        git: () => {
          if (c.getAttribute("aria-disabled") === "true") return;
          confirmModal({
            title: "Commit 2 files?",
            text: `<span class="mono t-code-sm">feat/session-refresh</span> · message: “fix(auth): refresh sessions 60s before expiry”. Leave it to Marp or edit it in the Git menu.`,
            action: "Commit",
            danger: false,
            icon: "git-commit",
            onOk: () => {
              S.committed = true;
              renderHead();
              toast("Committed 2 files", () => {
                S.committed = false;
                renderHead();
              });
            },
          });
        },
        "git-menu": () =>
          openPop(
            c,
            [
              {
                icon: "git-commit",
                label: "Commit…",
                kbd: ["mod", "⇧", "C"],
                disabled: S.run ? "Wait for Claude to finish" : null,
                action: () => handlers.git(),
              },
              { icon: "upload", label: "Commit & push" },
              { icon: "git-pull-request", label: "Commit, push & create PR" },
              "-",
              { icon: "git-branch", label: "New branch…" },
              { icon: "undo", label: "Discard all changes…", danger: true },
            ],
            { align: "end", width: 280 },
          ),
        details: () =>
          openPop(
            c,
            [
              { head: "Run on" },
              { icon: "laptop", label: "DESKTOP-UC7VC6O", kbd: ["mod", "⇧", "H"] },
              { icon: "git-branch", label: "New worktree", kbd: ["mod", "⇧", "X"] },
              "-",
              { head: "Scripts" },
              { icon: "play", label: "dev", meta: "pnpm dev" },
              { icon: "play", label: "test", meta: "pnpm test" },
              "-",
              { head: "Servers" },
              { icon: "globe", label: "localhost:3000", meta: "Stop" },
              "-",
              { icon: "settings", label: "Choose what this shows…" },
            ],
            { align: "end", width: 300 },
          ),
        drawer: () => {
          S.drawer = !S.drawer;
          renderDrawer();
          renderHead();
        },
        panel: () => {
          S.panel.open = !S.panel.open;
          S.panel.max = false;
          renderPanel();
          renderHead();
        },
        maximize: () => {
          S.panel.max = !S.panel.max;
          renderPanel();
        },
        "term-stop": () => {
          S.termLive = false;
          renderDrawer();
          renderPanel();
          toast("Sent Ctrl+C to pnpm dev");
        },
        "term-start": () => {
          S.termLive = true;
          renderDrawer();
          renderPanel();
        },
        approve: () => resolveAsk("approve"),
        always: () => resolveAsk("always"),
        deny: () => resolveAsk("deny"),
        answer: () => resolveAsk("answer"),
        "skip-q": () => resolveAsk("skip"),
        implement: () => {
          S.ask = null;
          S.mode = "Build";
          send("Implement the plan");
        },
        refine: () => {
          ta.value = "Refine: ";
          autosize();
          ta.focus();
          ta.setSelectionRange(8, 8);
          renderDock();
        },
        retry: () => {
          S.ask = null;
          const turn = S.turns[S.turns.length - 1];
          turn.steps = [];
          turn.notes = [];
          startRun(S.turns.length - 1);
        },
        stop: () => stopRun(false),
        send: () => send(ta.value),
        unqueue: () => {
          S.queue.splice(+c.dataset.q, 1);
          renderDock();
        },
        unchip: () => {
          S.chips.splice(+c.dataset.c, 1);
          renderDock();
        },
        unblock: () => {
          S.blocked = null;
          toast("Signed in to Claude");
          renderDock();
        },
        attach: () => {
          S.chips.push({ icon: "image", label: "screenshot.png" });
          renderDock();
        },
        model: () =>
          openPop(
            c,
            [
              { head: "Claude" },
              ...[
                ["Cl", "Sonnet 4.5", "fast"],
                ["Cl", "Opus 4.8", "1M context"],
              ].map(([mk, name, meta]) => ({
                mark: `<span class="pmark s16">${mk}</span>`,
                label: `Claude ${name}`,
                meta,
                checked: S.model.name === name,
                action: () => {
                  S.model = { mk, name };
                  renderDock();
                },
              })),
              { head: "Codex" },
              ...[
                ["Cx", "GPT-5.6 Terra", "medium"],
                ["Cx", "GPT-5.6 Luna", "cheap"],
              ].map(([mk, name, meta]) => ({
                mark: `<span class="pmark s16">${mk}</span>`,
                label: name,
                meta,
                checked: S.model.name === name,
                action: () => {
                  S.model = { mk, name };
                  renderDock();
                },
              })),
              "-",
              {
                icon: "settings",
                label: "Manage models…",
                action: () => toast("Opens Settings → Providers"),
              },
            ],
            { above: true, width: 300 },
          ),
        effort: () => {
          S.effort = { Low: "Medium", Medium: "High", High: "Low" }[S.effort];
          renderDock();
        },
        mode: () => {
          S.mode = S.mode === "Chat" ? "Plan" : "Chat";
          renderDock();
        },
        access: () =>
          openPop(
            c,
            [
              {
                icon: "eye",
                label: "Supervised",
                meta: "asks first",
                checked: S.access === "Supervised",
                action: () => {
                  S.access = "Supervised";
                  renderDock();
                },
              },
              {
                icon: "shield",
                label: "Auto",
                meta: "asks for risky",
                checked: S.access === "Auto",
                action: () => {
                  S.access = "Auto";
                  renderDock();
                },
              },
              {
                icon: "zap",
                label: "Full access",
                meta: "never asks",
                checked: S.access === "Full access",
                action: () => {
                  S.access = "Full access";
                  renderDock();
                },
              },
            ],
            { above: true, width: 260 },
          ),
        jump: () => {
          S.forceScroll = true;
          renderTimeline();
        },
        earlier: () => {
          S.turns[+c.dataset.turn].showAll = true;
          renderTimeline();
        },
        "cp-diff": () => {
          S.panel.open = true;
          S.panel.tab = "diff";
          renderPanel();
          renderHead();
        },
        "cp-restore": () => {
          const ti = +c.dataset.turn;
          confirmModal({
            title: "Restore this checkpoint?",
            text: `Puts 2 files back as they were after turn ${ti + 1}${S.turns.length - 1 > ti ? ` and moves the ${S.turns.length - 1 - ti} later ${S.turns.length - 1 - ti === 1 ? "turn" : "turns"} into a fork` : ""}.`,
            action: "Restore checkpoint",
            icon: "undo",
            onOk: () => {
              S.turns = S.turns.slice(0, ti + 1);
              S.dirty = { add: 42, del: 2 };
              renderAll();
              toast("Restored checkpoint · 2 files reverted", () => {});
            },
          });
        },
        "edit-from": () => {
          const ti = +c.dataset.turn;
          confirmModal({
            title: "Edit from here?",
            text: "Rewinds the chat to before this message. Your prompt returns to the composer.",
            action: "Edit from here",
            danger: false,
            icon: "pencil",
            onOk: () => {
              ta.value = S.turns[ti].user.text;
              S.turns = S.turns.slice(0, ti);
              autosize();
              renderAll();
              ta.focus();
            },
          });
        },
        "copy-msg": () => toast("Copied"),
        fork: () => toast("Forked into a new thread"),
        "copy-out": () => toast("Output copied"),
        "copy-path": () => toast("Path copied"),
        "copy-plan": () => toast("Plan copied"),
        "copy-err": () => toast("Details copied"),
        comment: () => {
          S.panel.comment = c.dataset.line;
          S.panel.commentFile = S.panel.file;
          renderPanel();
        },
        "comment-cancel": () => {
          S.panel.comment = null;
          renderPanel();
        },
        "comment-add": () => {
          const v = root.querySelector(".p-comment input").value || "Look at this line";
          S.chips.push({
            icon: "file-pen",
            label: `${S.panel.file ? "session.test.ts" : "session.ts"}:${S.panel.comment} · ${v.slice(0, 24)}`,
            mono: true,
          });
          S.panel.comment = null;
          renderPanel();
          renderDock();
          ta.focus();
        },
        "diff-opts": () =>
          openPop(
            c,
            [
              { label: "Hide whitespace", checked: true },
              { label: "Wrap lines" },
              { label: "File tree", checked: true },
              { label: "Hide test files" },
            ],
            { align: "end" },
          ),
        merge: () =>
          confirmModal({
            title: "Merge #482 into main?",
            text: "Squashes 2 commits and deletes the branch on GitHub.",
            action: "Squash and merge",
            danger: false,
            icon: "git-pull-request",
            onOk: () => toast("Merged #482"),
          }),
        "find-close": () => {
          S.find = null;
          renderFind();
          renderTimeline();
        },
        "find-next": () => {
          if (!S.find.hits.length) return;
          S.find.i = (S.find.i + 1) % S.find.hits.length;
          applyFind();
        },
        "find-prev": () => {
          if (!S.find.hits.length) return;
          S.find.i = (S.find.i - 1 + S.find.hits.length) % S.find.hits.length;
          applyFind();
        },
        "pick-project": () =>
          openPop(
            c,
            PROJECTS.map((p) => ({
              mark: `<span class="mono-mark">${p.mono}</span>`,
              label: esc(p.name),
              checked: S.newProject === p.id,
              action: () => {
                S.newProject = p.id;
                renderHead();
                sheet.querySelector(".p-hero .sub").textContent =
                  `${p.name} · new worktree from main`;
              },
            })),
            { width: 260 },
          ),
        "pick-workspace": () =>
          openPop(
            c,
            [
              { icon: "git-branch", label: "New worktree from main", checked: true },
              { icon: "folder", label: "Current checkout" },
              { icon: "git-branch", label: "Previous worktree (fix/checkout-e2e)" },
            ],
            { width: 300, align: "end" },
          ),
        "pick-machine": () =>
          openPop(
            c,
            [
              { icon: "laptop", label: "DESKTOP-UC7VC6O", checked: true },
              {
                icon: "server",
                label: "vps-hel1",
                meta: "Offline",
                disabled: "vps-hel1 is offline",
              },
              { icon: "layers", label: "Auto balance" },
            ],
            { width: 260, align: "end" },
          ),
      };
      handlers[cmd] && handlers[cmd]();
    });
    root.addEventListener("dblclick", (e) => {
      const row = e.target.closest("[data-row]");
      if (row && e.target.closest(".t")) {
        S.renaming = row.dataset.row;
        renderSide();
      }
    });
    root.addEventListener("contextmenu", (e) => {
      const row = e.target.closest("[data-row]");
      if (!row) return;
      e.preventDefault();
      rowMenu({ x: e.clientX, y: e.clientY }, row.dataset.row);
    });
    root.addEventListener("input", (e) => {
      if (e.target.matches(".p-search input")) {
        S.search = e.target.value;
        S.kb = S.search ? 0 : -1;
        renderSide();
      }
      if (e.target === ta) {
        autosize();
        const m = ta.value.slice(0, ta.selectionStart).match(/@([\w./-]*)$/);
        if (m) {
          const list = FILES.filter((f) => f.toLowerCase().includes(m[1].toLowerCase())).slice(
            0,
            5,
          );
          S.mention = { q: m[1] };
          openPop(
            ta,
            [
              { head: "Files" },
              ...list.map((f) => ({
                icon: "file",
                label: `<span class="mono t-code-sm">${f}</span>`,
                action: () => {
                  ta.value = ta.value.replace(/@[\w./-]*$/, "");
                  S.chips.push({ icon: "file", label: f, mono: true });
                  S.mention = null;
                  renderDock();
                  ta.focus();
                },
              })),
              { head: "Skills" },
              { icon: "sparkle", label: "design-reference" },
            ],
            { above: true, width: 360, focusFirst: true },
          );
        } else if (S.mention) {
          S.mention = null;
          closePops();
        }
        renderDock();
      }
      if (e.target.matches(".p-opt input")) S.ask.other = e.target.value;
      if (e.target.matches(".p-find input")) {
        S.find.q = e.target.value;
        S.find.i = 0;
        applyFind();
      }
    });
    root.addEventListener("keydown", (e) => {
      if (pops.length && pops[pops.length - 1].key(e)) {
        e.preventDefault();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (e.target.matches(".rename")) {
        if (e.key === "Enter") {
          const t = S.threads.find((x) => x.id === S.renaming);
          t.title = e.target.value.trim() || t.title;
          S.renaming = null;
          renderAll();
        }
        if (e.key === "Escape") {
          S.renaming = null;
          renderSide();
        }
        return;
      }
      if (e.target.matches(".p-title-input")) {
        if (e.key === "Enter") {
          cur().title = e.target.value.trim() || cur().title;
          S.titleEdit = false;
          renderAll();
        }
        if (e.key === "Escape") {
          S.titleEdit = false;
          renderHead();
        }
        return;
      }
      if (e.target.matches(".p-find input")) {
        if (e.key === "Enter") {
          e.preventDefault();
          e.shiftKey
            ? root.querySelector('[data-cmd="find-prev"]').click()
            : root.querySelector('[data-cmd="find-next"]').click();
        }
        if (e.key === "Escape") root.querySelector('[data-cmd="find-close"]').click();
        return;
      }
      if (e.target.matches(".p-comment input")) {
        if (e.key === "Enter") root.querySelector('[data-cmd="comment-add"]').click();
        if (e.key === "Escape") root.querySelector('[data-cmd="comment-cancel"]').click();
        return;
      }
      if (e.target.matches(".p-opt input")) {
        if (e.key === "Enter") resolveAsk("answer");
        return;
      }
      if (e.target.matches(".p-search input")) {
        const order = flatOrder();
        if (e.key === "Escape") {
          S.search = "";
          S.kb = -1;
          renderSide();
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          sideWrap.querySelector(".p-list").focus();
          S.kb = 0;
          renderSide();
          sideWrap.querySelector(".p-list").focus();
          return;
        }
        if (e.key === "Enter" && order[0]) {
          openThread(order[S.kb >= 0 ? S.kb : 0]);
          return;
        }
        return;
      }
      if (e.target === ta) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (mod && S.run && !S.run.paused && ta.value.trim()) {
            S.queue.push(ta.value.trim());
            ta.value = "";
            autosize();
            renderDock();
            return;
          }
          if (mod && S.ask?.type === "plan") return handlersProxy("implement");
          send(ta.value);
          return;
        }
        if (e.key === "Escape" && S.run && !ta.value) {
          stopRun(false);
          return;
        }
        if (e.key === "Tab" && e.shiftKey) {
          e.preventDefault();
          S.mode = S.mode === "Chat" ? "Plan" : "Chat";
          renderDock();
          return;
        }
        if (!(mod && ["b", "j", "f", "n"].includes(e.key.toLowerCase()))) return;
      }
      if (e.target.matches(".p-list")) {
        const order = flatOrder();
        const id = order[S.kb];
        const move = (d) => {
          e.preventDefault();
          S.kb = Math.max(
            0,
            Math.min(order.length - 1, (S.kb < 0 ? order.indexOf(S.currentId) : S.kb) + d),
          );
          if (e.shiftKey) {
            S.selected.add(order[S.kb]);
            if (id) S.selected.add(id);
          }
          renderSide();
          sideWrap.querySelector(".p-list").focus();
          sideWrap.querySelector(".p-row.kb")?.scrollIntoView({ block: "nearest" });
        };
        if (e.key === "ArrowDown") return move(1);
        if (e.key === "ArrowUp") return move(-1);
        if (e.key === "Enter" && id) {
          openThread(id);
          return;
        }
        if (e.key === " " && id) {
          e.preventDefault();
          S.selected.has(id) ? S.selected.delete(id) : S.selected.add(id);
          renderSide();
          sideWrap.querySelector(".p-list").focus();
          return;
        }
        if (e.key.toLowerCase() === "s" && !mod && (id || S.selected.size)) {
          settle(S.selected.size ? [...S.selected] : [id]);
          return;
        }
        if (e.key.toLowerCase() === "p" && !mod && id) {
          const t = S.threads.find((x) => x.id === id);
          t.pinned = !t.pinned;
          renderSide();
          sideWrap.querySelector(".p-list").focus();
          return;
        }
        if (e.key.toLowerCase() === "z" && id) {
          const r = sideWrap.querySelector(".p-row.kb");
          openPop(r, snoozeItems(S.selected.size ? [...S.selected] : [id]), {
            align: "end",
            focusFirst: true,
          });
          return;
        }
        if (e.key === "F2" && id) {
          S.renaming = id;
          renderSide();
          return;
        }
        if ((e.key === "Delete" || e.key === "Backspace") && id) {
          del(id);
          return;
        }
        if (e.key === "Escape") {
          S.selected.clear();
          renderSide();
          return;
        }
        if (e.key === "ContextMenu" && id) {
          rowMenu(sideWrap.querySelector(".p-row.kb"), id);
          return;
        }
      }
      if (S.ask && !e.target.matches("input, textarea") && !mod) {
        if (S.ask.type === "approval" && e.key === "Enter") return resolveAsk("approve");
        if (S.ask.type === "approval" && e.key === "Escape") return resolveAsk("deny");
        if (S.ask.type === "question" && ["1", "2", "3"].includes(e.key)) {
          S.ask.pick = +e.key - 1;
          renderTimeline();
          if (S.ask.pick === 2) root.querySelector(".p-opt input")?.focus();
          return;
        }
        if (S.ask.type === "question" && e.key === "Enter" && S.ask.pick != null)
          return resolveAsk("answer");
      }
      if (mod && e.key.toLowerCase() === "b" && !e.altKey) {
        e.preventDefault();
        S.sideCollapsed = !S.sideCollapsed;
        renderSide();
        return;
      }
      if (mod && e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        S.panel.open = !S.panel.open;
        renderPanel();
        renderHead();
        return;
      }
      if (mod && e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        S.panel.open = true;
        S.panel.max = !S.panel.max;
        renderPanel();
        return;
      }
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        S.drawer = !S.drawer;
        renderDrawer();
        renderHead();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newThread(cur()?.project);
        return;
      }
      if (mod && e.key.toLowerCase() === "f" && S.view === "thread") {
        e.preventDefault();
        S.find = { q: S.find?.q || "", i: 0, hits: [] };
        renderFind();
        return;
      }
      if (e.key === "/" && !e.target.matches("input, textarea")) {
        e.preventDefault();
        sideWrap.querySelector(".p-search input")?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (pops.length) closePops();
        else if (S.selected.size) {
          S.selected.clear();
          renderSide();
        } else if (S.run) stopRun(false);
      }
    });
    const handlersProxy = (cmd) => root.querySelector(`[data-cmd="${cmd}"]`)?.click();
    document.addEventListener("mousedown", (e) => {
      if (pops.length && !e.target.closest(".p-pop")) closePops();
    });
    root.addEventListener("focusout", (e) => {
      if (e.target.matches(".rename") && !root.contains(e.relatedTarget)) {
        S.renaming = null;
      }
      if (e.target.matches(".p-title-input")) {
        cur().title = e.target.value.trim() || cur().title;
        S.titleEdit = false;
        setTimeout(renderAll);
      }
    });
    scroller.addEventListener(
      "scroll",
      () => {
        $(".p-head").classList.toggle("scrolled", scroller.scrollTop > 2);
        if (S.jump && scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40) {
          S.jump = false;
          renderJump();
        }
      },
      { passive: true },
    );
    sheet.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!S.drop) {
        S.drop = true;
        $(".p-drop-host").innerHTML = `<div class="p-drop">${I("upload")}Drop to attach</div>`;
      }
    });
    sheet.addEventListener("dragleave", (e) => {
      if (!sheet.contains(e.relatedTarget)) {
        S.drop = false;
        $(".p-drop-host").innerHTML = "";
      }
    });
    sheet.addEventListener("drop", (e) => {
      e.preventDefault();
      S.drop = false;
      $(".p-drop-host").innerHTML = "";
      const f = e.dataTransfer.files[0];
      S.chips.push({ icon: "image", label: f ? f.name : "screenshot.png" });
      renderDock();
    });
    root.addEventListener("pointerdown", (e) => {
      const side = e.target.closest(".p-resize"),
        pan = e.target.closest(".p-panel .resize");
      if (!side && !pan) return;
      e.preventDefault();
      const startX = e.clientX,
        start = side ? S.sideW : S.panel.w;
      (side || pan).classList.add("drag");
      const move = (ev) => {
        if (side) {
          S.sideW = Math.max(220, Math.min(380, start + ev.clientX - startX));
          sideWrap.querySelector(".p-side").style.setProperty("--p-side-w", S.sideW + "px");
        } else {
          S.panel.w = Math.max(360, Math.min(820, start - (ev.clientX - startX)));
          root.querySelector(".p-panel").style.setProperty("--p-panel-w", S.panel.w + "px");
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        root.querySelector(".drag")?.classList.remove("drag");
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    });
    root.addEventListener("dblclick", (e) => {
      if (e.target.closest(".p-resize")) {
        S.sideW = 272;
        renderSide();
      }
      if (e.target.closest(".p-panel .resize")) {
        S.panel.w = 520;
        renderPanel();
      }
    });

    function scenario(name, keepThread) {
      stopRun(true);
      closePops();
      S.ask = null;
      S.queue = [];
      S.blocked = null;
      S.view = "thread";
      S.find = null;
      renderFind();
      if (!keepThread) {
        S.threads = baseThreads();
        S.currentId = "t1";
        S.selected.clear();
        S.search = "";
        S.empty = false;
        S.offline = false;
        S.loading = false;
        S.sideCollapsed = false;
        S.many = false;
        S.panel.open = false;
        S.panel.max = false;
        S.drawer = false;
      }
      S.dirty = { add: 0, del: 0 };
      S.committed = false;
      S.chips = [];
      S.mode = "Chat";
      S.effort = "High";
      ta.value = "";
      autosize();
      const t = cur();
      const prompt = userMsg(
        "The session refresh races the expiry and we see random 401s in prod. Move the refresh earlier and add a test for the edge case.",
        [
          { icon: "file", label: "src/auth/session.ts", mono: true },
          { icon: "image", label: "sentry-401.png" },
        ],
      );
      const fresh = () => ({
        user: prompt,
        model: "Claude Sonnet 4.5",
        mk: "Cl",
        time: "14:12",
        steps: [],
        answer: [],
        state: "running",
      });
      switch (name) {
        case "working":
          S.turns = [fresh()];
          t.status = "working";
          renderAll();
          startRun(0, { sec: 31, from: 0 });
          break;
        case "approval":
          S.turns = [fresh()];
          startRun(0, { askAt: 3, ask: "approval", sec: 20 });
          break;
        case "question":
          S.turns = [{ ...fresh(), user: userMsg("Build a pricing page for the agency plan.") }];
          startRun(0, { askAt: 2, ask: "question", sec: 12 });
          break;
        case "plan":
          S.turns = [
            {
              ...doneTurn("Plan how to split the billing service out of the monolith."),
              steps: STEP_SCRIPT.slice(0, 3).map((s) => ({ ...s, status: "done" })),
              answer: [],
              checkpoint: null,
              model: "Claude Opus 4.8",
            },
          ];
          S.ask = { type: "plan" };
          S.mode = "Plan";
          t.status = "needs-you";
          t.reason = "Plan ready";
          renderAll();
          break;
        case "done":
          S.turns = [doneTurn(prompt.text, { chips: prompt.chips })];
          S.turns[0].code = true;
          S.dirty = { add: 42, del: 2 };
          t.status = "done";
          renderAll();
          break;
        case "failed":
          S.turns = [fresh()];
          startRun(0, { fail: true, script: STEP_SCRIPT.slice(0, 4), sec: 8 });
          break;
        case "new":
          S.turns = [];
          newThread("mod");
          break;
        case "blocked":
          S.turns = [doneTurn(prompt.text, { chips: prompt.chips })];
          S.turns[0].code = true;
          S.dirty = { add: 42, del: 2 };
          S.blocked = "Claude isn't signed in on DESKTOP-UC7VC6O.";
          t.status = "done";
          ta.value = "Add a test for the logout race too";
          renderAll();
          break;
        case "offline":
          S.turns = [doneTurn(prompt.text)];
          S.offline = true;
          renderAll();
          break;
        case "empty":
          S.empty = true;
          S.turns = [];
          newThread("mod");
          break;
        case "loading":
          S.loading = true;
          S.turns = [];
          renderAll();
          break;
        case "many":
          for (let i = 0; i < 40; i++)
            S.threads.push({
              id: "m" + i,
              project: "mod",
              title:
                [
                  "Bump dependencies",
                  "Fix lint warnings",
                  "Translate docs",
                  "Refactor hooks",
                  "Speed up CI",
                ][i % 5] + ` #${i + 1}`,
              status: i % 9 === 0 ? "done" : "idle",
              unread: i % 9 === 0,
              age: `${i + 1}d`,
            });
          S.turns = [doneTurn(prompt.text)];
          S.selected = new Set(["t3", "t4", "t5"]);
          renderAll();
          break;
        case "collapsed":
          S.sideCollapsed = true;
          S.turns = [doneTurn(prompt.text)];
          S.dirty = { add: 42, del: 2 };
          renderAll();
          break;
        case "panel":
          S.turns = [doneTurn(prompt.text, { chips: prompt.chips })];
          S.turns[0].code = true;
          S.dirty = { add: 42, del: 2 };
          S.panel.open = true;
          S.panel.tab = "diff";
          t.status = "done";
          renderAll();
          break;
        case "terminal":
          S.turns = [doneTurn(prompt.text)];
          S.drawer = true;
          S.termLive = true;
          renderAll();
          break;
        default:
          S.turns = [doneTurn(prompt.text)];
          renderAll();
      }
    }
    autosize();
    scenario(options.scenario || "done");
    return { scenario, root };
  }

  window.MarpProto = { mount };
})();
