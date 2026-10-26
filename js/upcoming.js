/* =========================================================
   UPCOMING PAGE – REWOD

   DATA SOURCE:
   /data/schedule.json

   Only upcoming MUSIC RELEASES are displayed.

   Music releases require:
   - title
   - artist

   Photo, video promo, review and vlog
   entries are completely ignored.

   Always selects the nearest future
   music release.

   + DYNAMIC FULL PAGE COVER BACKGROUND
   ========================================================= */


const CONFIG = {
  dataUrl: "/data/schedule.json",

  releaseTimeUrl:
    "/backstage/backstage-edit-data/releasetime.json",

  fallbackCover: "/img/upcoming.jpg",

  timezone: "Europe/Budapest"
};


/* =========================================================
   HELPERS
   ========================================================= */

function safeText(v) {
  return (v ?? "").toString().trim();
}


/* =========================================================
   DYNAMIC UPCOMING BACKGROUND
   ========================================================= */

function syncUpcomingBackground() {

  const cover =
    document.getElementById("upcomingCover");

  const bg =
    document.getElementById("upcomingPageBg");

  if (!cover || !bg) return;


  function updateBackground() {

    const src =
      cover.currentSrc || cover.src;

    if (!src) return;

    bg.style.backgroundImage =
      `url("${src}")`;

  }


  if (
    cover.complete &&
    cover.naturalWidth > 0
  ) {
    updateBackground();
  }


  cover.addEventListener(
    "load",
    updateBackground
  );


  const observer =
    new MutationObserver(() => {

      if (
        cover.complete &&
        cover.naturalWidth > 0
      ) {
        updateBackground();
      }

    });


  observer.observe(cover, {
    attributes: true,
    attributeFilter: ["src"]
  });

}


/* =========================================================
   DATE PARSER
   ========================================================= */

function parseDateFlexible(s) {

  if (!s) return null;

  const trimmed = safeText(s);

  const match = trimmed.match(
    /^(\d{4})[_\-.](\d{2})[_\-.](\d{2})\.?$/
  );

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;

}


/* =========================================================
   DATE FORMATTER
   ========================================================= */

function formatToYYYYMMDDDots(d) {

  const yyyy = d.getUTCFullYear();

  const mm = String(
    d.getUTCMonth() + 1
  ).padStart(2, "0");

  const dd = String(
    d.getUTCDate()
  ).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}.`;

}


/* =========================================================
   TIME PARSER
   ========================================================= */

function parseTime(value) {

  const text = safeText(value);

  const match = text.match(
    /^([01]?\d|2[0-3]):([0-5]\d)$/
  );

  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };

}


/* =========================================================
   CENTRAL RELEASE TIME
   ========================================================= */

async function loadReleaseTime() {

  const res = await fetch(
    CONFIG.releaseTimeUrl,
    {
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to load ${CONFIG.releaseTimeUrl}: ${res.status}`
    );
  }

  const data = await res.json();

  if (
    !Array.isArray(data) ||
    !data.length
  ) {
    throw new Error(
      "Invalid releasetime.json."
    );
  }

  const releaseTime = parseTime(
    data[0]?.releasetime
  );

  if (!releaseTime) {
    throw new Error(
      "Invalid release time."
    );
  }

  return releaseTime;

}


/* =========================================================
   BUDAPEST TIMEZONE HELPERS
   ========================================================= */

const budapestFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: CONFIG.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }
  );


function getBudapestParts(date) {

  const parts =
    budapestFormatter.formatToParts(date);

  const values = {};

  parts.forEach(part => {
    if (part.type !== "literal") {
      values[part.type] =
        Number(part.value);
    }
  });

  return values;

}


function getTimezoneOffsetMs(date) {

  const values =
    getBudapestParts(date);

  const asUTC = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  const timestampWithoutMs =
    Math.floor(
      date.getTime() / 1000
    ) * 1000;

  return asUTC - timestampWithoutMs;

}


/* =========================================================
   BUILD BUDAPEST RELEASE DATETIME
   ========================================================= */

function buildBudapestDateTime(
  dateString,
  hour,
  minute
) {

  const date =
    parseDateFlexible(dateString);

  if (!date) return null;

  const year =
    date.getUTCFullYear();

  const month =
    date.getUTCMonth();

  const day =
    date.getUTCDate();


  const utcGuess = Date.UTC(
    year,
    month,
    day,
    hour,
    minute,
    0,
    0
  );


  const offsets = [
    getTimezoneOffsetMs(
      new Date(utcGuess)
    ),

    getTimezoneOffsetMs(
      new Date(
        utcGuess - 86400000
      )
    ),

    getTimezoneOffsetMs(
      new Date(
        utcGuess + 86400000
      )
    )
  ];


  const candidates = offsets
    .map(offset =>
      new Date(utcGuess - offset)
    )
    .filter(candidate => {

      const parts =
        getBudapestParts(candidate);

      return (
        parts.year === year &&
        parts.month === month + 1 &&
        parts.day === day &&
        parts.hour === hour &&
        parts.minute === minute
      );

    })
    .sort((a, b) => a - b);


  return candidates[0] || null;

}


/* =========================================================
   MUSIC RELEASE DETECTION
   ========================================================= */

function isMusicRelease(row) {

  return Boolean(
    safeText(row?.title) &&
    safeText(row?.artist)
  );

}


/* =========================================================
   PICK NEAREST UPCOMING MUSIC RELEASE
   ========================================================= */

function pickRow(rows, releaseTime) {

  if (
    !Array.isArray(rows) ||
    !rows.length
  ) {
    return null;
  }

  const now = new Date();


  const upcoming = rows
    .filter(isMusicRelease)
    .map(row => {

      const time =
        safeText(row.hour)
          ? parseTime(row.hour)
          : releaseTime;

      if (!time) return null;

      const dateTime =
        buildBudapestDateTime(
          row.date,
          time.hour,
          time.minute
        );

      if (!dateTime) return null;

      return {
        row,
        dateTime
      };

    })
    .filter(item =>
      item &&
      item.dateTime > now
    )
    .sort(
      (a, b) =>
        a.dateTime - b.dateTime
    );


  return upcoming.length
    ? upcoming[0].row
    : null;

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(id, value) {

  const el =
    document.getElementById(id);

  if (el) {
    el.textContent = value;
  }

}


/* =========================================================
   INITIALIZE UPCOMING CONTENT
   ========================================================= */

function initUpcoming(row) {

  const title =
    safeText(row.title);

  const artist =
    safeText(row.artist);

  const feat =
    safeText(row.feat);

  const dateRaw =
    safeText(row.date);


  /* =========================
     UPCOMING DATE
     ========================= */

  const d =
    parseDateFlexible(dateRaw);

  setText(
    "upcomingDate",
    d
      ? formatToYYYYMMDDDots(d)
      : (dateRaw || "—")
  );


  /* =========================
     UPCOMING ARTIST
     ========================= */

  setText(
    "upcomingArtist",
    artist || "—"
  );


  /* =========================
     UPCOMING TITLE
     ========================= */

  setText(
    "upcomingTitle",
    title || "—"
  );


  /* =========================
     UPCOMING FEAT
     ========================= */

  const featEl =
    document.getElementById(
      "upcomingFeat"
    );

  if (featEl) {

    if (feat) {

      featEl.style.display =
        "block";

      featEl.textContent =
        `REWOD feat. ${feat}`;

    } else {

      featEl.style.display =
        "none";

      featEl.textContent = "";

    }

  }


  /* =========================
     UPCOMING COVER
     ========================= */

  const coverEl =
    document.getElementById(
      "upcomingCover"
    );

  if (coverEl) {

    const cover =
      safeText(row.coverUrl);

    coverEl.src =
      cover
        ? cover
        : CONFIG.fallbackCover;

  }

}


/* =========================================================
   LOAD UPCOMING
   ========================================================= */

async function loadUpcoming() {

  const [scheduleResponse, releaseTime] =
    await Promise.all([
      fetch(
        CONFIG.dataUrl,
        {
          cache: "no-store"
        }
      ),

      loadReleaseTime()
    ]);


  if (!scheduleResponse.ok) {

    throw new Error(
      `Failed to load ${CONFIG.dataUrl}: ${scheduleResponse.status}`
    );

  }


  const rows =
    await scheduleResponse.json();


  const row =
    pickRow(rows, releaseTime);


  if (!row) {

    console.warn(
      "Upcoming: No future music releases found."
    );

    return;

  }


  initUpcoming(row);

}


/* =========================================================
   INIT
   ========================================================= */

syncUpcomingBackground();

loadUpcoming().catch(
  console.error
);