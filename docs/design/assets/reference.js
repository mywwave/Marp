/* Marp reference runtime: тема, акцент, навигация, экраны, поповеры, модалки, тосты, тултипы, иконки. */
(function () {
  "use strict";

  const DOC_PAGES = [
    ["reference.html", "Design system"],
    ["settings.html", "Settings"],
  ];

  const ACCENTS = [
    ["clay", "Clay", "#b4532f"],
    ["forest", "Forest", "#27804a"],
    ["iris", "Iris", "#6250d8"],
    ["sky", "Sky", "#2a6cc4"],
    ["teal", "Teal", "#127f74"],
    ["amber", "Amber", "#d99a1e"],
    ["peony", "Peony", "#bd3d7a"],
    ["graphite", "Graphite", "#34312d"],
  ];

  // Lucide (ISC), 24×24, stroke.
  const ICONS = {
    plus: '<path d="M5 12h14M12 5v14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "arrow-up": '<path d="M12 19V5M5 12l7-7 7 7"/>',
    "arrow-left": '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    "git-branch":
      '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M6 8.5v7M18 8.5a9 9 0 0 1-9 9"/>',
    "git-pull-request":
      '<circle cx="18" cy="18" r="2.5"/><circle cx="6" cy="6" r="2.5"/><path d="M13 6h3a2 2 0 0 1 2 2v7.5M6 8.5V21"/>',
    "git-commit": '<circle cx="12" cy="12" r="3"/><path d="M3 12h6M15 12h6"/>',
    terminal: '<path d="m4 17 6-6-6-6M12 19h8"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    "file-diff":
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M9 10h6M12 7v6M9 17h6"/>',
    "file-pen":
      '<path d="M12 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v3"/><path d="M14 3v5h5M17.5 14.5l2 2L15 21h-2v-2z"/>',
    folder:
      '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
    settings:
      '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.7 16a2 2 0 0 1 3-2.6L8 15"/>',
    question:
      '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    "list-checks": '<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
    alert:
      '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
    loader: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    paperclip:
      '<path d="m21.4 11-9.2 9.2a6 6 0 0 1-8.5-8.5l8.6-8.6a4 4 0 0 1 5.7 5.7l-8.6 8.6a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    fork: '<circle cx="12" cy="18" r="2.5"/><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M18 8.5v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-1M12 11.5v4"/>',
    "panel-right": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
    "panel-left": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    laptop: '<path d="M4 16V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9M2 20h20l-2-4H4z"/>',
    server:
      '<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
    globe:
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    wrench:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    pencil:
      '<path d="M21.2 6.8a2.8 2.8 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/>',
    archive:
      '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    pin: '<path d="M12 17v5M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9a2 2 0 0 1-1.1-1.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
    snooze: '<circle cx="12" cy="13" r="8"/><path d="M5 3 2 6M22 6l-3-3M10 10h4l-4 6h4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    trash:
      '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    "external-link":
      '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    brain:
      '<path d="M12 5a3 3 0 1 0-6 .1 4 4 0 0 0-2.5 5.8A4 4 0 0 0 6 18a4 4 0 0 0 6 .5zM12 5a3 3 0 1 1 6 .1 4 4 0 0 1 2.5 5.8A4 4 0 0 1 18 18a4 4 0 0 1-6 .5z"/>',
    shield:
      '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.7 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>',
    zap: '<path d="M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.4l-1.9 6A1 1 0 0 0 13 10h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.4l1.9-6A1 1 0 0 0 11 14z"/>',
    image:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
    play: '<path d="m6 3 14 9-14 9z"/>',
    plug: '<path d="M12 22v-5M9 8V2M15 8V2M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
    history:
      '<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    sparkle:
      '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    keyboard:
      '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M8 13h.01M12 13h.01M16 13h.01M7 16h10"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  };

  const svg = (name, cls = "") =>
    `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const params = new URLSearchParams(location.search);

  // Тема и акцент до первой отрисовки.
  html.dataset.theme = params.get("theme") || localStorage.getItem("marp-ref-theme") || "light";
  html.dataset.accent = params.get("accent") || localStorage.getItem("marp-ref-accent") || "clay";
  if (params.get("frame") === "1") html.classList.add("frame");

  function setTheme(t) {
    html.dataset.theme = t;
    localStorage.setItem("marp-ref-theme", t);
    $$("[data-set-theme]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.setTheme === t)),
    );
  }
  function setAccent(a) {
    html.dataset.accent = a;
    localStorage.setItem("marp-ref-accent", a);
    $$("[data-set-accent]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.setAccent === a)),
    );
  }

  function renderIcons(root = document) {
    $$("i[data-i]", root).forEach((el) => {
      const tmp = document.createElement("span");
      tmp.innerHTML = svg(el.dataset.i, el.className);
      el.replaceWith(tmp.firstChild);
    });
  }

  function renderDocNav() {
    const nav = $(".doc-nav");
    if (!nav) return;
    const here = location.pathname.split("/").pop() || "reference.html";
    nav.innerHTML = DOC_PAGES.map(
      ([href, label]) =>
        `<a href="${href}"${href === here ? ' aria-current="page"' : ""}>${label}</a>`,
    ).join("");
  }

  function renderThemeControls() {
    $$("[data-theme-controls]").forEach((host) => {
      host.innerHTML =
        `<div class="seg sm" role="group" aria-label="Theme">` +
        `<button data-set-theme="light">${svg("sun", "i-14")}Light</button>` +
        `<button data-set-theme="dark">${svg("moon", "i-14")}Dark</button></div>` +
        `<div class="seg sm" role="group" aria-label="Accent">` +
        ACCENTS.map(
          ([id, label, color]) =>
            `<button data-set-accent="${id}" data-tip="${label}" aria-label="${label}"><span style="width:12px;height:12px;border-radius:50%;background:${color}"></span></button>`,
        ).join("") +
        `</div>`;
    });
    setTheme(html.dataset.theme);
    setAccent(html.dataset.accent);
  }

  // Экраны: nav.screens > button[data-screen] + [data-screen-panel]
  function initScreens() {
    const navs = $$("nav.screens");
    if (!navs.length) return;
    const show = (id) => {
      const btn = $(`nav.screens [data-screen="${id}"]`);
      if (!btn) return false;
      $$("nav.screens [data-screen]").forEach((b) =>
        b.setAttribute("aria-selected", String(b === btn)),
      );
      $$("[data-screen-panel]").forEach((p) =>
        p.classList.toggle("on", p.dataset.screenPanel === id),
      );
      return true;
    };
    navs.forEach((nav) =>
      nav.addEventListener("click", (e) => {
        const b = e.target.closest("[data-screen]");
        if (!b) return;
        history.replaceState(null, "", `${location.search}#${b.dataset.screen}`);
        show(b.dataset.screen);
      }),
    );
    const fromHash = location.hash.slice(1);
    if (!show(fromHash)) show($("nav.screens [data-screen]").dataset.screen);
    window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  }

  // Поповеры: [data-pop="id"] открывает #id (.pop) у триггера.
  let openPop = null;
  function closePop() {
    if (!openPop) return;
    openPop.classList.remove("on");
    openPop = null;
  }
  function placePop(pop, trigger) {
    const r = trigger.getBoundingClientRect();
    pop.style.left = "0px";
    pop.style.top = "0px";
    const w = pop.offsetWidth,
      h = pop.offsetHeight;
    let left = trigger.dataset.popAlign === "end" ? r.right - w : r.left;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8) top = r.top - h - 6;
    left = Math.max(8, Math.min(left, innerWidth - w - 8));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }

  // Модалки: [data-modal="id"] открывает .overlay#id; [data-close] закрывает.
  function openModal(id) {
    const o = document.getElementById(id);
    if (!o) return;
    o.classList.add("on");
    const f = $("input, textarea, [autofocus]", o);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModals() {
    $$(".overlay.on").forEach((o) => o.classList.remove("on"));
  }

  // Тосты.
  function toast({ title, text = "", kind = "ok", action = "" }) {
    let host = $(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    const icon =
      kind === "bad"
        ? svg("alert", "bad")
        : kind === "live"
          ? svg("loader", "spin")
          : svg("check", "ok");
    el.innerHTML = `${icon}<div class="grow"><b>${title}</b>${text ? `<small>${text}</small>` : ""}</div>${action ? `<button class="act">${action}</button>` : ""}`;
    host.appendChild(el);
    let t = setTimeout(() => el.remove(), 5000);
    el.addEventListener("mouseenter", () => clearTimeout(t));
    el.addEventListener("mouseleave", () => (t = setTimeout(() => el.remove(), 2000)));
    el.querySelector(".act")?.addEventListener("click", () => el.remove());
  }

  // Тултипы: [data-tip], опционально [data-tip-title], [data-tip-kbd].
  let tipEl = null,
    tipTimer = 0,
    tipWarm = false;
  function showTip(target) {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "tip";
      document.body.appendChild(tipEl);
    }
    const title = target.dataset.tipTitle;
    const kbd = target.dataset.tipKbd;
    tipEl.innerHTML =
      (title ? `<b>${title}</b>` : "") +
      target.dataset.tip +
      (kbd
        ? kbd
            .split(" ")
            .map((k) => `<span class="kbd">${k}</span>`)
            .join("")
        : "");
    const r = target.getBoundingClientRect();
    tipEl.style.left = "0px";
    const w = tipEl.offsetWidth,
      h = tipEl.offsetHeight;
    let top = r.top - h - 6;
    if (top < 8) top = r.bottom + 6;
    tipEl.style.left = `${Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8))}px`;
    tipEl.style.top = `${top}px`;
    tipEl.classList.add("on");
  }

  function initInteractions() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      const themeBtn = t.closest("[data-set-theme]");
      if (themeBtn) return setTheme(themeBtn.dataset.setTheme);
      const accentBtn = t.closest("[data-set-accent]");
      if (accentBtn) return setAccent(accentBtn.dataset.setAccent);

      const popTrigger = t.closest("[data-pop]");
      if (popTrigger) {
        const pop = document.getElementById(popTrigger.dataset.pop);
        const wasOpen = openPop === pop;
        closePop();
        if (pop && !wasOpen) {
          if (pop.parentElement !== document.body) document.body.appendChild(pop);
          placePop(pop, popTrigger);
          pop.classList.add("on");
          openPop = pop;
          pop.querySelector("input")?.focus();
        }
        e.stopPropagation();
        return;
      }
      if (openPop && !t.closest(".pop")) closePop();
      if (openPop && t.closest(".pop .opt") && !t.closest("[data-keep-open]")) closePop();

      const m = t.closest("[data-modal]");
      if (m) return openModal(m.dataset.modal);
      if (t.closest("[data-close]") || t.classList.contains("overlay")) return closeModals();

      const tg = t.closest("[data-toggle]");
      if (tg) {
        const target =
          tg.dataset.toggle === "parent"
            ? tg.parentElement
            : document.getElementById(tg.dataset.toggle);
        target?.classList.toggle("open");
        return;
      }

      const sw = t.closest(".switch, .check");
      if (sw) sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true"));

      const segBtn = t.closest(".seg:not([data-theme-group]) > button");
      if (segBtn && !segBtn.dataset.setTheme && !segBtn.dataset.setAccent) {
        $$(":scope > button", segBtn.parentElement).forEach((b) =>
          b.setAttribute("aria-pressed", String(b === segBtn)),
        );
      }
      const tab = t.closest(".ptabs > button");
      if (tab)
        $$(":scope > button", tab.parentElement).forEach((b) =>
          b.setAttribute("aria-selected", String(b === tab)),
        );

      const choice = t.closest(".choice");
      if (choice && choice.parentElement) {
        $$(":scope > .choice", choice.parentElement).forEach((c) =>
          c.setAttribute("aria-checked", String(c === choice)),
        );
      }

      const tt = t.closest("[data-toast]");
      if (tt) toast(JSON.parse(tt.dataset.toast));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePop();
        closeModals();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        document.getElementById("palette")
      ) {
        e.preventDefault();
        openModal("palette");
      }
    });

    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-tip]");
      if (!t) return;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(
        () => {
          showTip(t);
          tipWarm = true;
        },
        tipWarm ? 0 : 300,
      );
      t.addEventListener(
        "mouseleave",
        () => {
          clearTimeout(tipTimer);
          tipEl?.classList.remove("on");
          tipTimer = setTimeout(() => (tipWarm = false), 400);
        },
        { once: true },
      );
    });

    window.addEventListener("scroll", closePop, true);
  }

  // Демо-панель: <div class="demo-bar" data-target="#id"> с .seg[data-demo="key"] > button[data-v]
  // ставит data-<key>="v" на цель; CSS страницы показывает нужное состояние.
  function initDemo() {
    $$(".demo-bar").forEach((bar) => {
      const target = $(bar.dataset.target);
      if (!target) return;
      $$("[data-demo]", bar).forEach((group) => {
        const key = group.dataset.demo;
        const sync = (v) => {
          target.dataset[key] = v;
          $$("[data-v]", group).forEach((b) =>
            b.setAttribute("aria-pressed", String(b.dataset.v === v)),
          );
        };
        const initial = target.dataset[key] || $("[data-v]", group)?.dataset.v;
        sync(initial);
        group.addEventListener("click", (e) => {
          const b = e.target.closest("[data-v]");
          if (b) {
            e.stopPropagation();
            sync(b.dataset.v);
          }
        });
      });
    });
  }

  function initScrollShadow() {
    $$("[data-scroll-shadow]").forEach((sc) => {
      const head = document.getElementById(sc.dataset.scrollShadow);
      if (!head) return;
      sc.addEventListener("scroll", () => head.classList.toggle("scrolled", sc.scrollTop > 2), {
        passive: true,
      });
    });
  }

  window.Ref = {
    $,
    $$,
    icon: svg,
    toast,
    openModal,
    closeModals,
    setTheme,
    setAccent,
    ACCENTS,
    DOC_PAGES,
  };

  document.addEventListener("DOMContentLoaded", () => {
    renderDocNav();
    renderThemeControls();
    renderIcons();
    initScreens();
    initInteractions();
    initDemo();
    initScrollShadow();
  });
})();
