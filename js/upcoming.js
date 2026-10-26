/* =========================================================
   UPCOMING PAGE – REWOD

   Loads the latest NON-DAILY music release from admin.json
   and displays its upcoming music information.

   DAILY entries are completely ignored.

   + DYNAMIC FULL PAGE COVER BACKGROUND
   ========================================================= */


const CONFIG = {
  dataUrl: "/data/admin.json",
  fallbackCover: "/img/upcoming.jpg"
};


/* =========================================================
   HELPERS
   ========================================================= */

function safeText(v) {
  return (v ?? "").toString().trim();
}


/* =========================================================
   DAILY CHECK
   ========================================================= */

function isDaily(row) {

  return (
    safeText(row.daily).toLowerCase() === "x"
  );

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


  /* Image already loaded */

  if (
    cover.complete &&
    cover.naturalWidth > 0
  ) {
    updateBackground();
  }


  /* Image load listener */

  cover.addEventListener(
    "load",
    updateBackground
  );


  /* Detect future src changes */

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

/*
 * Supports:
 *
 * 2026_11_01
 * 2026.11.01.
 * 2026-11-01
 *
 * Uses UTC to avoid timezone shifts.
 */

function parseDateFlexible(s) {

  if (!s) return null;

  const trimmed =
    safeText(s);


  /* YYYY_MM_DD */

  const m0 = trimmed.match(
    /^(\d{4})_(\d{2})_(\d{2})$/
  );

  if (m0) {

    return new Date(
      Date.UTC(
        Number(m0[1]),
        Number(m0[2]) - 1,
        Number(m0[3])
      )
    );

  }


  /* YYYY.MM.DD. */

  const m1 = trimmed.match(
    /^(\d{4})\.(\d{2})\.(\d{2})\.?$/
  );

  if (m1) {

    return new Date(
      Date.UTC(
        Number(m1[1]),
        Number(m1[2]) - 1,
        Number(m1[3])
      )
    );

  }


  /* YYYY-MM-DD */

  const m2 = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (m2) {

    return new Date(
      Date.UTC(
        Number(m2[1]),
        Number(m2[2]) - 1,
        Number(m2[3])
      )
    );

  }


  /* Legacy fallback */

  const t =
    Date.parse(trimmed);

  if (!Number.isNaN(t)) {

    const d =
      new Date(t);

    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate()
      )
    );

  }

  return null;

}


/* =========================================================
   DATE FORMATTER
   ========================================================= */

function formatToYYYYMMDDDots(d) {

  const yyyy =
    d.getUTCFullYear();

  const mm =
    String(
      d.getUTCMonth() + 1
    ).padStart(2, "0");

  const dd =
    String(
      d.getUTCDate()
    ).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}.`;

}


/* =========================================================
   PICK LATEST NON-DAILY RELEASE
   ========================================================= */

/*
 * IMPORTANT:
 *
 * We sort by newmusicdate,
 * NOT by comingmusicdate.
 *
 * This ensures that the Upcoming page always
 * uses the upcoming information belonging to
 * the latest regular music release.
 */

function pickRow(rows) {

  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }


  /* STEP 1: Remove all DAILY entries */

  const regularRows = rows.filter(
    row => !isDaily(row)
  );


  if (!regularRows.length) {
    return null;
  }


  /* STEP 2: Parse release dates */

  const withDate = regularRows
    .map(row => ({
      row,
      date: parseDateFlexible(
        row.newmusicdate
      )
    }))
    .filter(item =>
      item.date instanceof Date &&
      !Number.isNaN(
        item.date.getTime()
      )
    );


  /* Fallback if no valid dates exist */

  if (!withDate.length) {
    return regularRows[0];
  }


  /* STEP 3: Sort newest first */

  withDate.sort(
    (a, b) =>
      b.date.getTime() -
      a.date.getTime()
  );


  /* STEP 4: Return latest regular release */

  return withDate[0].row;

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
    safeText(
      row.comingmusictitle
    );

  const artist =
    safeText(
      row.comingmusicartist
    );

  const feat =
    safeText(
      row.comingfeat
    );

  const dateRaw =
    safeText(
      row.comingmusicdate
    );


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

  const res =
    await fetch(
      CONFIG.dataUrl,
      {
        cache: "no-store"
      }
    );


  if (!res.ok) {

    throw new Error(
      `Failed to load ${CONFIG.dataUrl}: ${res.status}`
    );

  }


  const rows =
    await res.json();


  /* Select latest NON-DAILY release */

  const row =
    pickRow(rows);


  if (!row) {

    console.warn(
      "Upcoming: No regular music releases found."
    );

    return;

  }


  /* Update page */

  initUpcoming(row);

}


/* =========================================================
   INIT
   ========================================================= */

/*
 * 1. Watch upcomingCover.
 *
 * 2. Load admin.json.
 *
 * 3. Find the latest NON-DAILY release.
 *
 * 4. Read its upcoming music fields.
 *
 * 5. Update the cover and page background.
 */

syncUpcomingBackground();

loadUpcoming().catch(
  console.error
);