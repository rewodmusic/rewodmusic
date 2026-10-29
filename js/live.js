(() => {
  "use strict";

  const CFG = {
    jsonPath: "/data/live.json",
    emptySpacerMinHeight: 260,
    dateDelimiter: "_",
    mobileMQ: "(max-width: 640px)",
    sourceTimeZone: "Europe/Budapest"
  };

  const app = document.getElementById("liveApp");
  if (!app) return;

  const mq = window.matchMedia(CFG.mobileMQ);

  // ==================================================
  // HELPERS
  // ==================================================

  const pad2 = (n) => String(n).padStart(2, "0");

  function parseDateKey(dateKey) {
    const parts = String(dateKey).split(CFG.dateDelimiter);

    if (parts.length !== 3) return null;

    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);

    if (!y || !m || !d) return null;

    const date = new Date(y, m - 1, d, 12, 0, 0, 0);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return null;
    }

    return date;
  }

  function startOfToday() {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0, 0, 0, 0
    );
  }

  function formatWeekdayShort(dateObj) {
    return dateObj.toLocaleDateString("en-US", {
      weekday: "short"
    }).toUpperCase();
  }

  function formatMonthShort(dateObj) {
    return dateObj.toLocaleDateString("en-US", {
      month: "short"
    }).toUpperCase();
  }

  function formatMonthLong(dateObj) {
    return dateObj.toLocaleDateString("en-US", {
      month: "long"
    }).toUpperCase();
  }

  function monthKey(dateObj) {
    return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}`;
  }

  function ensureAbsoluteUrl(url) {
    const raw = String(url || "").trim();

    if (!raw) return "";

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://")
    ) {
      return raw;
    }

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

  function isLivestream(item) {
    return String(item?.livestream || "")
      .trim()
      .toLowerCase() === "x";
  }

  function calendarIcsHref(item) {
    const key = String(item?.date || "").trim();

    return key ? `calendar/${key}.ics` : "calendar/.ics";
  }

  // ==================================================
  // TIMEZONE CONVERSION
  //
  // JSON:
  // date: "2026_12_20"
  // subtitle: "youtube, 12:00"
  //
  // Source timezone: Europe/Budapest
  //
  // Output:
  // Visitor's local timezone, 12-hour AM/PM.
  //
  // Date rollover is handled automatically.
  // ==================================================

  function extractTimeFromSubtitle(subtitle) {
    const text = String(subtitle || "");

    const match = text.match(
      /(^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/
    );

    if (!match) return null;

    return {
      fullMatch: match[0],
      prefix: match[1],
      hours: Number(match[2]),
      minutes: Number(match[3]),
      timeText: `${match[2]}:${match[3]}`
    };
  }

  function getTimeZoneParts(date, timeZone) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });

    const parts = formatter.formatToParts(date);

    const values = {};

    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = Number(part.value);
      }
    }

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
      second: values.second
    };
  }

  function getTimeZoneOffset(date, timeZone) {
    const parts = getTimeZoneParts(date, timeZone);

    const utcEquivalent = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );

    return utcEquivalent - date.getTime();
  }

  function budapestTimeToUTC(
    year,
    month,
    day,
    hours,
    minutes
  ) {
    const localAsUTC = Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0
    );

    let utcTimestamp = localAsUTC;

    for (let i = 0; i < 4; i++) {
      const offset = getTimeZoneOffset(
        new Date(utcTimestamp),
        CFG.sourceTimeZone
      );

      const nextTimestamp = localAsUTC - offset;

      if (nextTimestamp === utcTimestamp) break;

      utcTimestamp = nextTimestamp;
    }

    return new Date(utcTimestamp);
  }

  function formatLocalTime(date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function convertEventToLocal(item) {
    const originalDate = parseDateKey(item.date);

    if (!originalDate) return null;

    const extracted = extractTimeFromSubtitle(
      item.subtitle
    );

    // If no HH:MM exists, preserve the original
    // subtitle and date.

    if (!extracted) {
      return {
        it: {
          ...item
        },
        d: originalDate,
        originalDate,
        hasTime: false
      };
    }

    const year = originalDate.getFullYear();
    const month = originalDate.getMonth() + 1;
    const day = originalDate.getDate();

    const eventUTC = budapestTimeToUTC(
      year,
      month,
      day,
      extracted.hours,
      extracted.minutes
    );

    const localYear = eventUTC.getFullYear();
    const localMonth = eventUTC.getMonth();
    const localDay = eventUTC.getDate();

    const localDate = new Date(
      localYear,
      localMonth,
      localDay,
      12, 0, 0, 0
    );

    const formattedTime = formatLocalTime(eventUTC);

    const originalSubtitle = String(
      item.subtitle || ""
    );

    const convertedSubtitle = originalSubtitle.replace(
      extracted.timeText,
      formattedTime
    );

    return {
      it: {
        ...item,
        subtitle: convertedSubtitle
      },
      d: localDate,
      originalDate,
      eventUTC,
      hasTime: true
    };
  }

  // ==================================================
  // ACCORDION
  // ==================================================

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

  // ==================================================
  // DESKTOP DATEBOX SLIDE
  // ==================================================

  function getPanelDurationMs(panel) {
    const cs = getComputedStyle(panel);

    const durations = (cs.transitionDuration || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const props = (cs.transitionProperty || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const pickIndex = props.findIndex(
      (p) => p.includes("max-height")
    );

    const durStr = durations[
      pickIndex >= 0 ? pickIndex : 0
    ] || "0s";

    const toMs = (v) => (
      v.endsWith("ms")
        ? parseFloat(v)
        : parseFloat(v) * 1000
    );

    const ms = toMs(durStr);

    return Number.isFinite(ms) ? ms : 0;
  }

  function setDateboxShift(card, open, isMobile) {
    const datebox = card.querySelector(".live-datebox");
    const panel = card.querySelector("[data-panel]");

    if (!datebox || !panel) return;

    if (isMobile) {
      datebox.style.transition = "none";
      datebox.style.transform = "translateY(0px)";
      return;
    }

    datebox.style.willChange = "transform";

    const dur = getPanelDurationMs(panel);

    if (dur > 0) {
      datebox.style.transition =
        `transform ${dur}ms ease`;
    }

    if (!open) {
      datebox.style.transform = "translateY(0px)";
      return;
    }

    requestAnimationFrame(() => {
      const h = panel.scrollHeight || 0;

      datebox.style.transform =
        `translateY(${h / 2}px)`;
    });
  }

  // ==================================================
  // RENDER
  // ==================================================

  function renderEmpty() {
    app.innerHTML = `
      <div class="live-month-title">
        NO UPCOMING SHOWS
      </div>

      <div
        class="live-empty-spacer"
        style="min-height:${CFG.emptySpacerMinHeight}px">
      </div>
    `;
  }

  function renderMonthTitle(dateObj) {
    return `
      <div class="live-month-title">
        ${formatMonthLong(dateObj)} ${dateObj.getFullYear()}
      </div>
    `;
  }

  function renderActionButton(item) {
    const stream = isLivestream(item);

    if (stream) {
      const href = calendarIcsHref(item);

      return `
        <a
          class="live-btn live-btn-tickets live-btn-remind"
          href="${escapeHTML(href)}"
          download>
          REMIND
        </a>
      `;
    }

    const ticketsUrl = ensureAbsoluteUrl(
      item.tickets || ""
    );

    return `
      <a
        class="live-btn live-btn-tickets"
        href="${escapeHTML(ticketsUrl)}"
        target="_blank"
        rel="noopener">
        TICKETS
      </a>
    `;
  }

  function renderLabels(item) {
    const stream = isLivestream(item);

    return {
      typeLabel: stream ? "Stream Type" : "Show Type",
      programLabel: stream ? "Platform" : "Program"
    };
  }

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

    const descrBlock = descr
      ? `<div class="live-descr">${escapeHTML(descr)}</div>`
      : "";

    const { typeLabel, programLabel } = renderLabels(item);

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
            <button
              class="live-btn live-btn-info"
              type="button"
              data-action="toggle">
              INFO
            </button>

            ${renderActionButton(item)}
          </div>

        </div>

        <div class="live-expand" data-panel>
          <div class="live-expand-inner">

            ${descrBlock}

            <div class="live-two-col">

              <div class="live-col">
                <div class="live-label">
                  ${escapeHTML(typeLabel)}
                </div>
                <div class="live-value">${type}</div>
              </div>

              <div class="live-col">
                <div class="live-label">
                  ${escapeHTML(programLabel)}
                </div>
                <div class="live-value">${program}</div>
              </div>

            </div>

            <div class="live-spacer"></div>

          </div>
        </div>
      </article>
    `;
  }

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

    const descrBlock = descr
      ? `<div class="live-descr">${escapeHTML(descr)}</div>`
      : "";

    const { typeLabel, programLabel } = renderLabels(item);

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
            <button
              class="live-btn live-btn-info"
              type="button"
              data-action="toggle">
              INFO
            </button>

            ${renderActionButton(item)}
          </div>

        </div>

        <div class="live-expand" data-panel>
          <div class="live-expand-inner">

            ${descrBlock}

            <div class="live-two-col">

              <div class="live-col">
                <div class="live-label">
                  ${escapeHTML(typeLabel)}
                </div>
                <div class="live-value">${type}</div>
              </div>

              <div class="live-col">
                <div class="live-label">
                  ${escapeHTML(programLabel)}
                </div>
                <div class="live-value">${program}</div>
              </div>

            </div>

            <div class="live-spacer"></div>

          </div>
        </div>
      </article>
    `;
  }

  // ==================================================
  // INTERACTIONS
  // ==================================================

  function bindInteractions(isMobile) {
    app.addEventListener("click", (e) => {
      const btn = e.target.closest(
        "[data-action='toggle']"
      );

      if (!btn) return;

      const card = btn.closest("[data-card]");
      if (!card) return;

      const panel = card.querySelector("[data-panel]");
      if (!panel) return;

      const expanded =
        panel.dataset.expanded === "true";

      const willOpen = !expanded;

      setExpanded(panel, willOpen);

      btn.classList.toggle(
        "is-active",
        willOpen
      );

      setDateboxShift(
        card,
        willOpen,
        isMobile
      );

      if (willOpen) {
        requestAnimationFrame(() => {
          panel.style.maxHeight =
            panel.scrollHeight + "px";

          setDateboxShift(
            card,
            true,
            isMobile
          );
        });
      }
    });

    window.addEventListener("resize", () => {
      const nowMobile = mq.matches;

      const cards = app.querySelectorAll(
        "[data-card]"
      );

      cards.forEach((card) => {
        const panel = card.querySelector(
          "[data-panel]"
        );

        if (!panel) return;

        const isOpen =
          panel.dataset.expanded === "true";

        if (isOpen) {
          panel.style.maxHeight =
            panel.scrollHeight + "px";

          setDateboxShift(
            card,
            true,
            nowMobile
          );
        } else {
          setDateboxShift(
            card,
            false,
            nowMobile
          );
        }
      });
    });
  }

  // ==================================================
  // GROUP EVENTS BY LOCAL MONTH
  // ==================================================

  function renderFromNormalized(
    normalized,
    isMobile
  ) {
    if (!normalized.length) {
      renderEmpty();
      return;
    }

    const groups = new Map();

    for (const x of normalized) {
      const key = monthKey(x.d);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

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

    bindInteractions(isMobile);

    const panels = app.querySelectorAll(
      "[data-panel]"
    );

    panels.forEach((p) => {
      setExpanded(p, false);
    });

    const cards = app.querySelectorAll(
      "[data-card]"
    );

    cards.forEach((c) => {
      setDateboxShift(c, false, isMobile);
    });
  }

  // ==================================================
  // INITIALIZATION
  // ==================================================

  async function init() {
    try {
      const res = await fetch(
        CFG.jsonPath,
        { cache: "no-cache" }
      );

      if (!res.ok) {
        throw new Error(
          `Failed to load ${CFG.jsonPath}`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "live.json must be an array"
        );
      }

      const today = startOfToday();

      const normalized = data
        .map((it) => convertEventToLocal(it))
        .filter((x) => x !== null)
        .filter((x) => (
          x.d instanceof Date &&
          !isNaN(x.d.getTime())
        ))
        .filter((x) => (
          x.d.getTime() >= today.getTime()
        ))
        .sort((a, b) => (
          a.d.getTime() - b.d.getTime()
        ));

      renderFromNormalized(
        normalized,
        mq.matches
      );

      const onChange = () => {
        renderFromNormalized(
          normalized,
          mq.matches
        );
      };

      if (mq.addEventListener) {
        mq.addEventListener(
          "change",
          onChange
        );
      } else {
        mq.addListener(onChange);
      }

    } catch (err) {
      console.error(err);
      renderEmpty();
    }
  }

  init();

})();