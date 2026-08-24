(() => {
  "use strict";

  /* ---------- kill double-tap-to-zoom ---------- */
  // touch-action:manipulation + the viewport meta handle most browsers, but
  // some iOS Safari versions still zoom on a fast double tap, so belt-and-braces:
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  /* ---------- keyboard-aware sheets ---------- */
  // When the on-screen keyboard opens, the visual viewport shrinks but fixed/
  // absolute elements stay anchored to the layout viewport, so a bottom sheet
  // with an input can end up hidden behind the keyboard. We track how much
  // space the keyboard is eating via visualViewport and push any open sheet
  // up by that amount so it always sits just above the keyboard.
  (function setupKeyboardAvoidance() {
    const vv = window.visualViewport;
    if (!vv) return;
    function apply() {
      const raw = window.innerHeight - vv.height - vv.offsetTop;
      const offset = raw > 60 ? raw + 12 : 0; // small buffer above the keyboard; ignore tiny UI-chrome deltas
      document.querySelectorAll(".sheet.open").forEach(sheet => {
        sheet.style.setProperty("--kb-offset", offset + "px");
      });
    }
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    // Re-check right as any sheet opens/an input inside it gains focus, since
    // the resize event can lag slightly behind the focus-triggered keyboard.
    document.addEventListener("focusin", (e) => {
      if (e.target.closest && e.target.closest(".sheet")) setTimeout(apply, 50);
    });
  })();

  const STORAGE_KEY = "flowWalletStateV2";
  const CURRENCY_SYMBOLS = { USD: "$", GBP: "£", EUR: "€", NGN: "₦" };

  /* ---------- icon set (replaces emoji) ---------- */
  const ICONS = {
    card: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/></svg>',
    savings: '<svg viewBox="0 0 24 24"><path d="M4 13c0-3.6 3-6.5 7.5-6.5S19 9.4 19 13c0 1-.3 1.9-.9 2.7l.9 2.8-2.7-.8c-.9.5-2 .8-3.3.8H10a3 3 0 0 1-3-3v-.3C5.2 14.7 4 14 4 13Z"/><circle cx="15.3" cy="10.7" r=".6" fill="currentColor" stroke="none"/><path d="M9 6.8 8 4.5"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path d="M3 10 12 4l9 6"/><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9"/><path d="M3 19h18"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-4 4-6 7.5-6s6.1 2 7.5 6"/></svg>',
    snowflake: '<svg viewBox="0 0 24 24"><path d="M12 3v18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5"/><path d="M4.5 7.5l15 9M4.5 7.5 7.7 8M4.5 7.5l1 3.3M19.5 16.5 16.3 16M19.5 16.5l-1-3.3"/><path d="M19.5 7.5l-15 9M19.5 7.5 16.3 8M19.5 7.5l-1 3.3M4.5 16.5 7.7 16M4.5 16.5l1-3.3"/></svg>',
    unlock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M4 9h16v3.5H4z"/><path d="M12 9v11"/><path d="M12 9c-1.5-3.5-6-4-6-1s3 1 6 1Z"/><path d="M12 9c1.5-3.5 6-4 6-1s-3 1-6 1Z"/></svg>',
    coffee: '<svg viewBox="0 0 24 24"><path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 10.5h1.5a2.3 2.3 0 0 1 0 4.6H16"/><path d="M8 5.5c0 1-1 1-1 2M12 5.5c0 1-1 1-1 2"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M3 13.5 21 6l-6.5 16-2.8-7.2L3 13.5Z"/><path d="M11.7 14.8 21 6"/></svg>',
    car: '<svg viewBox="0 0 24 24"><path d="M4 16V12l2-5h12l2 5v4"/><path d="M4 16h16v2.5a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1V17H7.2v1.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V16Z"/><circle cx="7.5" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5 12 3l8.5 4.5V16L12 21l-8.5-4.5V7.5Z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.3M12 18.7V21M21 12h-2.3M5.3 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg>',
    spinner: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9" /></svg>',
    backspace: '<svg viewBox="0 0 24 24"><path d="M9 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-6-6 6-6Z"/><path d="M13 10l4 4M17 10l-4 4"/></svg>',
    sendArrow: '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>',
    requestArrow: '<svg viewBox="0 0 24 24"><path d="M17 7L7 17M7 17h8M7 17V9"/></svg>',
    exchange: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'
  };

  const defaultState = () => ({
    passcode: "1472",
    currency: "USD",
    theme: "light",
    notificationsEnabled: false,
    activeAccount: "checking",
    profile: { name: "Flow Member", handle: "@flow-member" },
    accounts: { checking: 86290.49, savings: 12540.0 },
    card: { frozen: false, nickname: "" },
    transactions: [
      tx("Mikel Borle", "received", 350.0, "Receive", 0, 10, 30),
      tx("Uber", "transfer", -10.0, "Transfer", 0, 8, 25),
      tx("Ryan Scott", "sent", -85.0, "Send", 0, 9, 45),
      tx("Amazon Shopping", "sent", -124.0, "Shopping", 0, 7, 10),
      tx("Mikel Borle", "received", 350.0, "Receive", 1, 10, 30),
      tx("Food Panda", "sent", -21.56, "Payment", 1, 9, 45),
      tx("Uber", "transfer", -25.0, "Transfer", 1, 20, 25)
    ]
  });

  function genTxRef() {
    // 20 numeric digits, guaranteed unique per call
    let digits = "";
    while (digits.length < 20) digits += Math.floor(Math.random() * 1e15).toString();
    return digits.slice(0, 20);
  }

  function tx(title, type, amount, label, daysAgo, hour, min) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return {
      id: "t" + Math.random().toString(36).slice(2, 10),
      txRef: genTxRef(),
      title, type, amount, label,
      date: d.toISOString(),
      account: "checking"
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed, {
        accounts: Object.assign({ checking: 0, savings: 0 }, parsed.accounts),
        profile: Object.assign({ name: "Flow Member", handle: "@flow-member" }, parsed.profile),
        card: Object.assign({ frozen: false, nickname: "" }, parsed.card)
      });
    } catch (e) { return defaultState(); }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  const $ = (id) => document.getElementById(id);
  const sym = () => CURRENCY_SYMBOLS[state.currency] || "$";
  const fmt = (n) => sym() + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._h);
    toast._h = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- theme / currency ---------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    const btn = $("themeToggleBtn");
    if (btn) btn.textContent = state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }

  /* ---------- avatars ---------- */
  const MERCHANTS = {
    "uber": { icon: ICONS.car, bg: "#101314" },
    "food panda": { icon: ICONS.bag, bg: "#ff2d78" },
    "amazon shopping": { icon: ICONS.box, bg: "#f5a623" }
  };
  const PALETTE = ["#6c5ce7", "#2d9cdb", "#00b894", "#e17055", "#0984e3", "#e84393"];
  function avatarFor(title) {
    const key = title.toLowerCase();
    if (MERCHANTS[key]) return { html: MERCHANTS[key].icon, bg: MERCHANTS[key].bg };
    const initials = title.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const bg = PALETTE[Math.abs(hash) % PALETTE.length];
    return { html: initials, bg };
  }

  /* ---------- navigation ---------- */
  const SCREENS = ["home", "statistic", "card", "amount", "details", "activity", "txDetail", "profile", "status"];
  const TAB_SCREENS = ["home", "statistic", "card", "profile"];

  function moveNavIndicator(name) {
    const btn = document.querySelector(`.nav[data-nav="${name}"]`);
    const indicator = $("navIndicator");
    if (!btn || !indicator || !TAB_SCREENS.includes(name)) return;
    // Position/size the sliding glass pill to match the active tab's box so it
    // glides across the bar instead of the old lift-up bump.
    indicator.style.width = btn.offsetWidth + "px";
    indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  function showScreen(name) {
    SCREENS.forEach(s => { const el = $(s + "Main"); if (el) el.classList.add("hidden"); });
    const target = $(name + "Main");
    if (target) target.classList.remove("hidden");
    document.querySelectorAll(".nav").forEach(n => n.classList.toggle("active", n.dataset.nav === name));
    $("bottomNav").classList.toggle("hidden", !TAB_SCREENS.includes(name));
    if (TAB_SCREENS.includes(name)) moveNavIndicator(name);
    // statusActions (the "Done" bar) only belongs on the status screen — leaving
    // status without hiding it is what left it stacked on top of other screens.
    if (name !== "status") $("statusActions").classList.add("hidden");
    const appEl = $("app");
    if (appEl) appEl.scrollTop = 0;
  }
  window.addEventListener("resize", () => {
    const activeTab = document.querySelector(".nav.active");
    if (activeTab && !$("bottomNav").classList.contains("hidden")) moveNavIndicator(activeTab.dataset.nav);
  });

  /* ---------- HOME ---------- */
  function renderHome() {
    const bal = state.accounts[state.activeAccount] || 0;
    $("balance").textContent = fmt(bal);
    $("balanceCaption").textContent = state.activeAccount === "checking" ? "Your Balance" : "Savings Balance";
    $("cardChipMark").innerHTML = state.activeAccount === "checking" ? ICONS.card : ICONS.savings;
    $("cardChipLabel").textContent = state.activeAccount === "checking" ? "•••• 3425" : "Savings";
    if (state.activeAccount === "checking") {
      $("insightText").textContent = `You saved ${fmt(Math.min(bal * 0.003, 999)).replace(".00", "")} last month`;
    } else {
      $("insightText").textContent = "Growing steadily this month";
    }
    renderMerchants();
    renderTxList($("activityPreview"), state.transactions.slice(0, 3), true);
  }

  function renderMerchants() {
    const row = $("merchantRow");
    if (row.childElementCount) return;
    const items = [
      { ico: ICONS.gift, title: "Discount Up To 80%", sub: "Festive Season Gift" },
      { ico: ICONS.coffee, title: "Buy 1 Get 1 Free", sub: "Partner Cafés" },
      { ico: ICONS.plane, title: "Save On Flights", sub: "Book Before Friday" }
    ];
    row.innerHTML = items.map(i => `
      <div class="merchant-card">
        <span class="merchant-ico">${i.ico}</span>
        <div><b>${i.title}</b><span>${i.sub}</span></div>
      </div>`).join("");
  }

  /* ---------- transactions rendering ---------- */
  function groupLabel(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const startOf = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const diff = (startOf(now) - startOf(d)) / 86400000;
    if (diff === 0) return "TODAY";
    if (diff === 1) return "YESTERDAY";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  }
  function timeLabel(dateStr) {
    return new Date(dateStr).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function renderTxList(container, list, skipGroups) {
    if (!list.length) { container.innerHTML = `<div class="empty-state">No transactions yet</div>`; return; }
    let html = "";
    let lastGroup = null;
    list.forEach(t => {
      const g = groupLabel(t.date);
      if (!skipGroups && g !== lastGroup) { html += `<div class="tx-group-label">${g}</div>`; lastGroup = g; }
      const av = avatarFor(t.title);
      const pos = t.amount > 0;
      html += `
        <div class="tx-row" data-tx="${t.id}">
          <div class="tx-avatar" style="background:${av.bg}">${av.html}</div>
          <div class="tx-mid"><b>${t.title}</b><span>${timeLabel(t.date)}</span></div>
          <div class="tx-right">
            <span class="tx-amt ${pos ? "pos" : ""}">${pos ? "+" : "-"}${fmt(t.amount)}</span>
            <span class="tx-type">${t.label}</span>
          </div>
        </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll(".tx-row").forEach(row => {
      row.addEventListener("click", () => openTxDetail(row.dataset.tx));
    });
  }

  function openTxDetail(id) {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;
    // Ensure legacy transactions get a txRef on first view
    if (!t.txRef) { t.txRef = genTxRef(); saveState(); }
    const pos = t.amount > 0;
    const typeColor = pos ? "var(--success)" : "var(--danger)";
    const typeLabel = pos ? "Credit" : "Debit";

    // Build 10 particles for the mini success burst
    const particles = Array.from({ length: 10 }).map((_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 48 + Math.random() * 14;
      const tx = (Math.cos(angle) * dist).toFixed(0);
      const ty = (Math.sin(angle) * dist).toFixed(0);
      const color = i % 2 === 0 ? "var(--accent-strong)" : "var(--accent-ink)";
      const delay = (Math.random() * 0.25).toFixed(2);
      return `<span class="success-particle" style="--tx:${tx}px;--ty:${ty}px;background:${color};animation-delay:${delay}s"></span>`;
    }).join("");

    $("txDetailContent").innerHTML = `
      <div class="tx-detail-hero">
        <div class="tx-detail-icon-wrap status-icon success">
          <svg class="success-svg" viewBox="0 0 100 100">
            <circle class="success-ring" cx="50" cy="50" r="46"/>
            <path class="success-check" d="M30 52 L44 66 L72 34"/>
          </svg>
          <div class="success-particles">${particles}</div>
        </div>
        <div class="tx-detail-amount" style="color:${typeColor}">${pos ? "+" : "-"}${fmt(t.amount)}</div>
        <div class="tx-detail-name">${t.title}</div>
        <div class="tx-detail-badge" style="background:${pos ? "color-mix(in srgb, var(--success) 14%, transparent)" : "color-mix(in srgb, var(--danger) 14%, transparent)"};color:${typeColor}">${typeLabel} · ${t.label}</div>
      </div>

      <div class="tx-detail-card">
        <div class="tx-detail-section-title">Transaction Details</div>
        <div class="stat-row"><span>Status</span><b class="tx-status-pill">✓ Completed</b></div>
        <div class="stat-row"><span>To / From</span><b>${t.title}</b></div>
        <div class="stat-row"><span>Date</span><b>${new Date(t.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</b></div>
        <div class="stat-row"><span>Time</span><b>${new Date(t.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" })}</b></div>
        <div class="stat-row"><span>Category</span><b>${t.label}</b></div>
        <div class="stat-row"><span>Account</span><b>${t.account === "savings" ? "Savings" : "Checking"}</b></div>
      </div>

      <div class="tx-detail-card">
        <div class="tx-detail-section-title">Reference</div>
        <div class="tx-ref-block">
          <span class="tx-ref-label">Transaction ID</span>
          <span class="tx-ref-number">${t.txRef}</span>
        </div>
      </div>
    `;
    showScreen("txDetail");
  }

  function renderActivity() {
    applyActivityFilter();
  }
  let activityFilter = "all";
  function applyActivityFilter() {
    const q = $("searchTx").value.trim().toLowerCase();
    let list = state.transactions.slice();
    if (activityFilter !== "all") list = list.filter(t => t.type === activityFilter);
    if (q) list = list.filter(t => t.title.toLowerCase().includes(q));
    renderTxList($("transactions"), list, false);
  }

  /* ---------- statistic ---------- */
  let statRange = "week";
  function renderStatistic() {
    const now = Date.now();
    const rangeMs = statRange === "week" ? 7 * 86400000 : statRange === "month" ? 30 * 86400000 : Infinity;
    const list = state.transactions.filter(t => now - new Date(t.date).getTime() <= rangeMs);
    const received = list.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const sent = list.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
    $("statReceived").textContent = fmt(received);
    $("statSent").textContent = fmt(sent);

    const byCat = {};
    list.forEach(t => { byCat[t.label] = (byCat[t.label] || 0) + Math.abs(t.amount); });
    const max = Math.max(1, ...Object.values(byCat));
    $("statBreakdown").innerHTML = Object.keys(byCat).length ? Object.entries(byCat).map(([label, amt]) => `
      <div>
        <div class="stat-row" style="border:none;padding:0"><span>${label}</span><b>${fmt(amt)}</b></div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${(amt / max) * 100}%"></div></div>
      </div>`).join("") : `<div class="empty-state">No activity in this range</div>`;

    $("statChecking").textContent = fmt(state.accounts.checking);
    $("statSavings").textContent = fmt(state.accounts.savings);
  }

  /* ---------- card screen ---------- */
  function renderCard() {
    $("visualCardName").textContent = state.profile.name;
    $("freezeLabel").textContent = state.card.frozen ? "Unfreeze card" : "Freeze card";
    $("freezeIcon").innerHTML = state.card.frozen ? ICONS.unlock : ICONS.snowflake;
    $("visualCard").style.filter = state.card.frozen ? "grayscale(1) opacity(.6)" : "none";
    $("cardNicknameInput").value = state.card.nickname;
  }

  /* ---------- profile ---------- */
  function renderProfile() {
    $("profileName").value = state.profile.name;
    $("profileHandleInput").value = state.profile.handle;
    $("profileHeaderName").textContent = state.profile.name;
    $("profileHandle").textContent = state.profile.handle;
    $("profileAvatar").textContent = state.profile.name.trim()[0]?.toUpperCase() || "F";
    applyTheme();
    $("notifToggleBtn").textContent = state.notificationsEnabled ? "Disable notifications" : "Enable notifications";
    document.querySelectorAll("#currencySwatches .chip-btn").forEach(b => b.classList.toggle("active", b.dataset.currency === state.currency));
  }

  /* ---------- amount / details / confirm flow ---------- */
  let flow = null;          // 'send' | 'request' | 'exchange' | 'topup'
  let draft = {};

  function startFlow(name) {
    flow = name;
    draft = {};
    $("amountBalanceHint").textContent = `${fmt(state.accounts[state.activeAccount])} available`;
    $("amountCurrencySym").textContent = sym();
    $("amountTyped").value = "";
    sizeAmountInput();
    showScreen("amount");
    setTimeout(() => $("amountTyped").focus(), 300);
  }

  function sizeAmountInput() {
    const el = $("amountTyped");
    el.style.width = Math.max(1, (el.value || el.placeholder || "0").length) + "ch";
  }

  $("amountTyped").addEventListener("input", () => {
    let val = $("amountTyped").value.replace(/[^0-9.]/g, "");
    const firstDot = val.indexOf(".");
    if (firstDot !== -1) {
      val = val.slice(0, firstDot + 1) + val.slice(firstDot + 1).replace(/\./g, "");
    }
    if (val.includes(".") && val.split(".")[1].length > 2) {
      val = val.slice(0, val.indexOf(".") + 3);
    }
    if (val.length > 10) val = val.slice(0, 10);
    $("amountTyped").value = val;
    sizeAmountInput();
  });

  $("amountContinueBtn").addEventListener("click", () => {
    const amt = parseFloat($("amountTyped").value) || 0;
    if (amt <= 0) { toast("Enter an amount first"); return; }
    if ((flow === "send" || flow === "exchange") && amt > state.accounts[state.activeAccount]) {
      toast("Insufficient balance"); return;
    }
    draft.amount = amt;
    openDetails();
  });

  function openDetails() {
    ["sendDetailFields", "requestDetailFields", "exchangeDetailFields", "topupDetailFields"].forEach(id => $(id).classList.add("hidden"));
    const titles = { send: "Send money", request: "Request money", exchange: "Move money", topup: "Top up balance" };
    const btnLabels = { send: "Send " + fmt(draft.amount), request: "Send request", exchange: "Move " + fmt(draft.amount), topup: "Top up " + fmt(draft.amount) };
    $("detailsTitle").textContent = titles[flow];
    $("detailsContinueBtn").textContent = btnLabels[flow];
    $(flow + "DetailFields").classList.remove("hidden");
    showScreen("details");
  }

  $("sendDestPicker").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-dest]"); if (!b) return;
    $("sendDestPicker").querySelectorAll("button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    draft.dest = b.dataset.dest;
    $("sendBankFields").classList.toggle("hidden", draft.dest !== "bank");
    $("sendPersonFields").classList.toggle("hidden", draft.dest !== "person");
  });
  $("exchangeDirPicker").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-dir]"); if (!b) return;
    $("exchangeDirPicker").querySelectorAll("button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    draft.dir = b.dataset.dir;
  });
  $("topupSourcePicker").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]"); if (!b) return;
    $("topupSourcePicker").querySelectorAll("button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    draft.src = b.dataset.src;
    $("topupCardFields").classList.toggle("hidden", draft.src !== "card");
  });

  $("topupCardNumber")?.addEventListener("input", () => {
    const digits = $("topupCardNumber").value.replace(/\D/g, "").slice(0, 16);
    $("topupCardNumber").value = digits.replace(/(.{4})/g, "$1 ").trim();
  });
  $("topupCardExpiry")?.addEventListener("input", () => {
    let v = $("topupCardExpiry").value.replace(/\D/g, "").slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    $("topupCardExpiry").value = v;
  });
  $("topupCardCvv")?.addEventListener("input", () => {
    $("topupCardCvv").value = $("topupCardCvv").value.replace(/\D/g, "").slice(0, 3);
  });

  $("detailsContinueBtn").addEventListener("click", () => {
    if (flow === "send") {
      draft.dest = draft.dest || "bank";
      if (draft.dest === "bank") {
        draft.bankName = $("sendBankName").value.trim();
        draft.accountNumber = $("sendAccountNumber").value.trim();
        draft.accountName = $("sendAccountName").value.trim();
        if (!draft.bankName || !draft.accountNumber || !draft.accountName) { toast("Fill in the recipient's details"); return; }
      } else if (draft.dest === "person") {
        draft.personName = $("sendPersonName").value.trim();
        draft.personHandle = $("sendPersonHandle").value.trim();
        if (!draft.personName || !draft.personHandle) { toast("Add who you're sending to"); return; }
      }
      draft.note = $("sendNote").value.trim();
    } else if (flow === "request") {
      draft.from = $("requestFrom").value.trim();
      if (!draft.from) { toast("Add who you're requesting from"); return; }
      draft.note = $("requestNote").value.trim();
    } else if (flow === "exchange") {
      draft.dir = draft.dir || "to_savings";
    } else if (flow === "topup") {
      draft.src = draft.src || "bank";
      if (draft.src === "card") {
        draft.cardNumber = $("topupCardNumber").value.replace(/\s/g, "");
        draft.cardExpiry = $("topupCardExpiry").value.trim();
        draft.cardCvv = $("topupCardCvv").value.trim();
        if (draft.cardNumber.length < 16 || draft.cardExpiry.length < 5 || draft.cardCvv.length < 3) {
          toast("Enter your full card details"); return;
        }
      }
    }
    openConfirm();
  });

  /* ---------- passcode confirm sheet ---------- */
  let pinMode = "confirmTx"; // confirmTx | verifyOld | setNew | setNewConfirm
  let newPasscodeDraft = "";

  function openSheet(id) { $(id).classList.remove("hidden"); requestAnimationFrame(() => $(id).classList.add("open")); }
  function closeSheet(id) { $(id).classList.remove("open"); setTimeout(() => $(id).classList.add("hidden"), 250); }

  function openConfirm() {
    pinMode = "confirmTx";
    const labelMap = {
      send: draft.dest === "savings" ? "To your savings"
        : draft.dest === "person" ? "To " + draft.personName
        : (draft.bankName || "Bank transfer"),
      request: "From " + draft.from,
      exchange: draft.dir === "to_savings" ? "Checking → Savings" : "Savings → Checking",
      topup: "Top up via " + (draft.src === "card" ? "card •••• " + draft.cardNumber.slice(-4) : "bank account")
    };
    $("confirmSummary").innerHTML = `<div class="amt">${fmt(draft.amount)}</div><div class="to">${labelMap[flow]}</div>`;
    $("confirmPinField").classList.remove("hidden");
    resetPinDots("confirmDots");
    $("confirmInput").value = "";
    $("confirmError").classList.add("hidden");
    openSheet("pinSheet");
    setTimeout(() => $("confirmInput").focus(), 300);
  }

  function resetPinDots(id) {
    $(id).querySelectorAll(".pin-box").forEach((b, i) => {
      b.classList.remove("filled");
      b.classList.toggle("active", i === 0);
    });
  }
  function updateDots(id, len) {
    $(id).querySelectorAll(".pin-box").forEach((b, i) => {
      b.classList.toggle("filled", i < len);
      b.classList.toggle("active", i === len);
    });
  }

  $("confirmInput").addEventListener("input", () => {
    const val = $("confirmInput").value.replace(/\D/g, "").slice(0, 4);
    $("confirmInput").value = val;
    updateDots("confirmDots", val.length);
    if (val.length < 4) return;

    if (pinMode === "confirmTx") {
      if (val === state.passcode) { closeSheet("pinSheet"); processTransaction(); }
      else pinFail();
    } else if (pinMode === "verifyOld") {
      if (val === state.passcode) {
        pinMode = "setNew"; newPasscodeDraft = "";
        $("confirmSummary").innerHTML = `<div class="to">Choose a new 4-digit passcode</div>`;
        $("confirmInput").value = ""; resetPinDots("confirmDots");
      } else pinFail();
    } else if (pinMode === "setNew") {
      newPasscodeDraft = val;
      pinMode = "setNewConfirm";
      $("confirmSummary").innerHTML = `<div class="to">Re-enter your new passcode</div>`;
      $("confirmInput").value = ""; resetPinDots("confirmDots");
    } else if (pinMode === "setNewConfirm") {
      if (val === newPasscodeDraft) {
        state.passcode = val; saveState();
        closeSheet("pinSheet");
        toast("Passcode updated");
      } else {
        toast("Passcodes didn't match"); pinMode = "verifyOld";
        $("confirmSummary").innerHTML = `<div class="to">Enter your current passcode</div>`;
        $("confirmInput").value = ""; resetPinDots("confirmDots");
      }
    }
  });

  function pinFail() {
    $("confirmError").classList.remove("hidden");
    $("confirmDots").classList.add("shake");
    setTimeout(() => $("confirmDots").classList.remove("shake"), 400);
    $("confirmInput").value = "";
    updateDots("confirmDots", 0);
  }

  $("pinSheetBackdrop").addEventListener("click", () => closeSheet("pinSheet"));

  /* ---------- process transaction ---------- */
  function processTransaction() {
    let record = null;
    if (flow === "send") {
      if (draft.dest === "savings") {
        state.accounts.checking -= draft.amount;
        state.accounts.savings += draft.amount;
        record = tx("Transfer to savings", "transfer", -draft.amount, "Transfer", 0, new Date().getHours(), new Date().getMinutes());
      } else if (draft.dest === "person") {
        state.accounts.checking -= draft.amount;
        record = tx(draft.personName, "sent", -draft.amount, "Send", 0, new Date().getHours(), new Date().getMinutes());
      } else {
        state.accounts.checking -= draft.amount;
        record = tx(draft.accountName, "sent", -draft.amount, "Send", 0, new Date().getHours(), new Date().getMinutes());
      }
    } else if (flow === "request") {
      record = tx(draft.from, "request", draft.amount, "Requested", 0, new Date().getHours(), new Date().getMinutes());
    } else if (flow === "exchange") {
      if (draft.dir === "to_savings") { state.accounts.checking -= draft.amount; state.accounts.savings += draft.amount; }
      else { state.accounts.savings -= draft.amount; state.accounts.checking += draft.amount; }
      record = tx(draft.dir === "to_savings" ? "To savings" : "To checking", "transfer", -draft.amount, "Transfer", 0, new Date().getHours(), new Date().getMinutes());
      record.amount = -draft.amount;
    } else if (flow === "topup") {
      state.accounts[state.activeAccount] += draft.amount;
      record = tx("Top up", "topup", draft.amount, "Top up", 0, new Date().getHours(), new Date().getMinutes());
    }
    if (record) state.transactions.unshift(record);
    saveState();
    if (state.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
      new Notification("Flow", { body: `${flow[0].toUpperCase() + flow.slice(1)} of ${fmt(draft.amount)} completed` });
    }
    runStatus();
  }

  function runStatus() {
    $("statusBackBtn").classList.add("hidden");
    $("statusActions").classList.add("hidden");

    const flowIcon = { send: ICONS.sendArrow, request: ICONS.requestArrow, exchange: ICONS.exchange, topup: ICONS.plus }[flow] || ICONS.sendArrow;

    $("statusBody").innerHTML = `
      <div class="status-icon pending">
        <div class="pending-rings"><span class="pending-ring r1"></span><span class="pending-ring r2"></span><span class="pending-ring r3"></span></div>
        <svg class="pending-spinner" viewBox="0 0 100 100">
          <circle class="pending-track" cx="50" cy="50" r="42"/>
          <circle class="pending-arc" cx="50" cy="50" r="42"/>
        </svg>
        <div class="pending-core">${flowIcon}</div>
      </div>
      <div class="status-amount">${fmt(draft.amount)}</div>
      <p class="status-caption">Transaction is being processed. Please hold.</p>`;
    showScreen("status");

    setTimeout(() => {
      const particles = Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 52 + Math.random() * 18;
        const tx = (Math.cos(angle) * dist).toFixed(0);
        const ty = (Math.sin(angle) * dist).toFixed(0);
        const color = i % 2 === 0 ? "var(--accent-strong)" : "var(--accent-ink)";
        const delay = (0.45 + Math.random() * 0.2).toFixed(2);
        return `<span class="success-particle" style="--tx:${tx}px;--ty:${ty}px;background:${color};animation-delay:${delay}s"></span>`;
      }).join("");

      const doneCopy = {
        send: "Money sent successfully",
        request: "Money requested successfully",
        exchange: "Money moved successfully",
        topup: "Money added successfully"
      }[flow] || "All done";

      $("statusBody").innerHTML = `
        <div class="status-icon success">
          <svg class="success-svg" viewBox="0 0 100 100">
            <circle class="success-ring" cx="50" cy="50" r="46"/>
            <path class="success-check" d="M30 52 L44 66 L72 34"/>
          </svg>
          <div class="success-particles">${particles}</div>
        </div>
        <div class="status-amount">${fmt(draft.amount)}</div>
        <p class="status-caption">${doneCopy}</p>`;
      $("statusActions").classList.remove("hidden");
      renderHome(); renderStatistic(); renderCard();
    }, 10000);
  }
  $("statusDoneBtn").addEventListener("click", () => showScreen("home"));

  /* ---------- more sheet ---------- */
  $("moreSheetBackdrop").addEventListener("click", () => closeSheet("moreSheet"));
  document.querySelectorAll("[data-more]").forEach(b => b.addEventListener("click", () => {
    closeSheet("moreSheet");
    if (b.dataset.more === "topup") startFlow("topup");
    else showScreen("profile");
  }));

  /* ---------- account switch sheet ---------- */
  $("cardChipBtn").addEventListener("click", () => {
    $("acctChip1").textContent = fmt(state.accounts.checking);
    $("acctChip2").textContent = fmt(state.accounts.savings);
    openSheet("accountSheet");
  });
  $("accountSheetBackdrop").addEventListener("click", () => closeSheet("accountSheet"));
  document.querySelectorAll(".account-opt").forEach(b => b.addEventListener("click", () => {
    state.activeAccount = b.dataset.account;
    saveState();
    closeSheet("accountSheet");
    renderHome();
  }));

  /* ---------- quick actions / nav / back ---------- */
  document.querySelectorAll(".qa[data-action]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.action === "more") { openSheet("moreSheet"); return; }
    startFlow(b.dataset.action);
  }));
  document.querySelectorAll(".nav[data-nav]").forEach(b => b.addEventListener("click", () => {
    const n = b.dataset.nav;
    showScreen(n);
    if (n === "statistic") renderStatistic();
    if (n === "card") renderCard();
    if (n === "profile") renderProfile();
    if (n === "home") renderHome();
  }));
  document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => {
    const dest = b.dataset.back;
    showScreen(dest === "activity" ? "activity" : dest);
    if (dest === "home") renderHome();
  }));

  $("seeAllBtn").addEventListener("click", () => { activityFilter = "all"; showScreen("activity"); renderActivity(); });
  $("merchantsViewAll").addEventListener("click", () => toast("More merchant offers coming soon"));
  $("notificationsBtn").addEventListener("click", () => toast("You're all caught up"));
  $("menuBtn").addEventListener("click", () => toast("Menu coming soon"));

  document.querySelectorAll(".filter[data-filter]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".filter[data-filter]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    activityFilter = b.dataset.filter;
    applyActivityFilter();
  }));
  $("searchTx").addEventListener("input", applyActivityFilter);
  $("searchToggleBtn").addEventListener("click", () => { $("searchTx").classList.toggle("hidden"); if (!$("searchTx").classList.contains("hidden")) $("searchTx").focus(); });

  document.querySelectorAll(".stat-toggle .filter").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".stat-toggle .filter").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    statRange = b.dataset.statRange;
    renderStatistic();
  }));

  /* ---------- card screen actions ---------- */
  $("freezeCardBtn").addEventListener("click", () => { state.card.frozen = !state.card.frozen; saveState(); renderCard(); toast(state.card.frozen ? "Card frozen" : "Card unfrozen"); });
  $("showPinBtn").addEventListener("click", () => toast("For your security, passcodes aren't shown here"));
  $("saveCardNicknameBtn").addEventListener("click", () => { state.card.nickname = $("cardNicknameInput").value.trim(); saveState(); toast("Nickname saved"); });

  /* ---------- profile actions ---------- */
  $("saveProfileBtn").addEventListener("click", () => {
    const name = $("profileName").value.trim() || "Flow Member";
    const handle = $("profileHandleInput").value.trim() || "@flow-member";
    state.profile = { name, handle }; saveState(); renderProfile(); toast("Profile saved");
  });
  $("themeToggleBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark"; saveState(); applyTheme();
  });
  $("notifToggleBtn").addEventListener("click", async () => {
    if (!state.notificationsEnabled) {
      if (!("Notification" in window)) { toast("Notifications aren't supported here"); return; }
      const perm = await Notification.requestPermission();
      if (perm === "granted") { state.notificationsEnabled = true; toast("Notifications enabled"); }
      else { toast("Permission was not granted"); }
    } else { state.notificationsEnabled = false; toast("Notifications disabled"); }
    saveState(); renderProfile();
  });
  document.querySelectorAll("#currencySwatches .chip-btn").forEach(b => b.addEventListener("click", () => {
    state.currency = b.dataset.currency; saveState(); renderProfile(); renderHome();
  }));
  $("changePasscodeBtn").addEventListener("click", () => {
    pinMode = "verifyOld";
    $("confirmSummary").innerHTML = `<div class="to">Enter your current passcode</div>`;
    $("confirmPinField").classList.remove("hidden");
    resetPinDots("confirmDots"); $("confirmInput").value = ""; $("confirmError").classList.add("hidden");
    openSheet("pinSheet");
    setTimeout(() => $("confirmInput").focus(), 300);
  });
  $("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Clear all transaction history? This can't be undone.")) {
      state.transactions = []; saveState(); renderHome(); toast("History cleared");
    }
  });
  $("resetAppBtn").addEventListener("click", () => {
    if (confirm("Reset the app to its default state?")) { localStorage.removeItem(STORAGE_KEY); location.reload(); }
  });

  /* ---------- boot ---------- */
  function boot() {
    applyTheme();
    renderProfile();
    setTimeout(() => {
      $("splash").classList.add("hidden");
      $("app").classList.remove("hidden");
      showScreen("home");
      renderHome();
    }, 1500);
  }
  boot();
})();
