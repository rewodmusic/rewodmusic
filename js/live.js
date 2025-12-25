(() => {
  "use strict";

  // =========================
  //  "POTIK" – egyszerű állítók
  // =========================
  const CFG = {
    jsonPath: "data/live.json",

    // footer ne csússzon fel NO UPCOMING SHOWS esetén
    emptySpacerMinHeight: 260, // px

    // dátum parse: "YYYY_MM_DD"
    dateDelimiter: "_",

    // mobil breakpoint (CSS-hez igazítsd)
    mobileMQ: "(max-width: 640px)"
  };

  const app = document.getElementById("liveApp");
  if (!app) return;

  const mq = window.matchMedia(CFG.mobileMQ);

  // ---------- helpers ----------
  const pad2 = (n) => String(n).padStart(2, "0");

  function parseDateKey(dateKey) {
    const parts = String(dateKey).split(CFG.dateDelimiter);
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  function formatWeekdayShort(dateObj) {
    return dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  }

  function formatMonthShort(dateObj) {
    return dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  }

  function formatMonthLong(dateObj) {
    return dateObj.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  }

  function monthKey(dateObj) {
    return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}`;
  }

  function ensureAbsoluteUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `https://${raw}`;
  }

  function escapeHTML(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // accordion
  function setExpanded(panel, expanded) {
    panel.dataset.expanded = expanded ? "true" : "false";
    if (expanded) {
      panel.style.maxHeight = panel.scrollHeight + "px";
      panel.style.opacity = "1";
    } else {
      panel.style.maxHeight = "0px";
      panel.style.opacity = "0";
    }
  }

  // ---------- render ----------
  function renderEmpty() {
    app.innerHTML = `
      <div class="live-month-title">NO UPCOMING SHOWS</div>
      <div class="live-empty-spacer" style="min-height:${CFG.emptySpacerMinHeight}px"></div>
    `;
  }

  function renderMonthTitle(dateObj) {
    return `<div class="live-month-title">${formatMonthLong(dateObj)} ${dateObj.getFullYear()}</div>`;
  }

  // DESKTOP card (a mostani, bevált struktúra)
  function renderEventCardDesktop(item, dateObj) {
    const weekday = formatWeekdayShort(dateObj);
    const day = String(dateObj.getDate());
    const mon = formatMonthShort(dateObj);
    const year = String(dateObj.getFullYear());

    const title = escapeHTML(item.title || "");
    const subtitle = escapeHTML(item.subtitle || "");
    const descr = String(item.descr || "").trim();
    const type = escapeHTML(item.type || "");
    const program = escapeHTML(item.program || "");
    const ticketsUrl = ensureAbsoluteUrl(item.tickets || "");

    const descrBlock = descr ? `<div class="live-descr">${escapeHTML(descr)}</div>` : "";

    return `
      <article class="live-card" data-card>
        <div class="live-card-inner">
          <div class="live-datebox" aria-label="Event date">
            <div class="live-date-wd">${weekday}</div>
            <div class="live-date-dm">${day}. ${mon}</div>
            <div class="live-date-y">${year}</div>
          </div>

          <div class="live-maincol">
            <div class="live-title">${title}</div>
            <div class="live-subtitle">${subtitle}</div>
          </div>

          <div class="live-btncol">
            <button class="live-btn live-btn-info" type="button" data-action="toggle">INFO</button>
            <a class="live-btn live-btn-tickets" href="${escapeHTML(ticketsUrl)}" target="_blank" rel="noopener">TICKETS</a>
          </div>
        </div>

        <div class="live-expand" data-panel>
          <div class="live-expand-inner">
            ${descrBlock}

            <div class="live-two-col">
              <div class="live-col">
                <div class="live-label">Show Type</div>
                <div class="live-value">${type}</div>
              </div>
              <div class="live-col">
                <div class="live-label">Program</div>
                <div class="live-value">${program}</div>
              </div>
            </div>

            <div class="live-spacer"></div>
          </div>
        </div>
      </article>
    `;
  }

  // MOBILE card (stackelt, gombok alul mindig; dátum nem animál)
  function renderEventCardMobile(item, dateObj) {
    const weekday = formatWeekdayShort(dateObj);
    const day = String(dateObj.getDate());
    const mon = formatMonthShort(dateObj);
    const year = String(dateObj.getFullYear());

    const title = escapeHTML(item.title || "");
    const subtitle = escapeHTML(item.subtitle || "");
    const descr = String(item.descr || "").trim();
    const type = escapeHTML(item.type || "");
    const program = escapeHTML(item.program || "");
    const ticketsUrl = ensureAbsoluteUrl(item.tickets || "");

    const descrBlock = descr ? `<div class="live-descr">${escapeHTML(descr)}</div>` : "";

    // Fontos: a panel a subtitle és a gombok közé kerül!
    return `
      <article class="live-card live-card--mobile" data-card>
        <div class="live-card-inner">
          <div class="live-datebox" aria-label="Event date">
            <div class="live-date-wd">${weekday}</div>
            <div class="live-date-dm">${day}. ${mon}</div>
            <div class="live-date-y">${year}</div>
          </div>

          <div class="live-maincol">
            <div class="live-title">${title}</div>
          </div>

          <div class="live-subtitle">${subtitle}</div>

          <div class="live-btncol">
            <button class="live-btn live-btn-info" type="button" data-action="toggle">INFO</button>
            <a class="live-btn live-btn-tickets" href="${escapeHTML(ticketsUrl)}" target="_blank" rel="noopener">TICKETS</a>
          </div>
        </div>

        <div class="live-expand" data-panel>
          <div class="live-expand-inner">
            ${descrBlock}

            <div class="live-two-col">
              <div class="live-col">
                <div class="live-label">Show Type</div>
                <div class="live-value">${type}</div>
              </div>

              <div class="live-col">
                <div class="live-label">Program</div>
                <div class="live-value">${program}</div>
              </div>
            </div>

            <div class="live-spacer"></div>
          </div>
        </div>
      </article>
    `;
  }

  function bindInteractions() {
    app.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action='toggle']");
      if (!btn) return;

      const card = btn.closest("[data-card]");
      if (!card) return;

      const panel = card.querySelector("[data-panel]");
      if (!panel) return;

      const expanded = panel.dataset.expanded === "true";
      setExpanded(panel, !expanded);

      btn.classList.toggle("is-active", !expanded);

      if (!expanded) {
        requestAnimationFrame(() => {
          panel.style.maxHeight = panel.scrollHeight + "px";
        });
      }
    });

    window.addEventListener("resize", () => {
      const panels = app.querySelectorAll("[data-panel][data-expanded='true']");
      panels.forEach((p) => (p.style.maxHeight = p.scrollHeight + "px"));
    });
  }

  function renderFromNormalized(normalized, isMobile) {
    if (!normalized.length) {
      renderEmpty();
      return;
    }

    // group by month
    const groups = new Map();
    for (const x of normalized) {
      const key = monthKey(x.d);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    }

    let html = "";
    for (const arr of groups.values()) {
      html += renderMonthTitle(arr[0].d);
      for (const x of arr) {
        html += isMobile
          ? renderEventCardMobile(x.it, x.d)
          : renderEventCardDesktop(x.it, x.d);
      }
    }

    app.innerHTML = html;
    bindInteractions();

    // init panels collapsed
    const panels = app.querySelectorAll("[data-panel]");
    panels.forEach((p) => setExpanded(p, false));
  }

  async function init() {
    try {
      const res = await fetch(CFG.jsonPath, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Failed to load ${CFG.jsonPath}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("live.json must be an array");

      const today = startOfToday();

      const normalized = data
        .map((it) => {
          const d = parseDateKey(it.date);
          return { it, d };
        })
        .filter((x) => x.d instanceof Date && !isNaN(x.d.getTime()))
        .filter((x) => x.d.getTime() >= today.getTime())
        .sort((a, b) => a.d.getTime() - b.d.getTime());

      const isMobile = mq.matches;
      renderFromNormalized(normalized, isMobile);

      // ha átváltasz desktop<->mobil breakpointon (pl. devtools), rerender
      const onChange = () => renderFromNormalized(normalized, mq.matches);
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else mq.addListener(onChange);
    } catch (err) {
      console.error(err);
      renderEmpty();
    }
  }

  init();
})();