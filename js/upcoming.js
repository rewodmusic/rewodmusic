/* UPCOMING PAGE – loads nearest future row from JSON (YYYY_MM_DD)
   + DYNAMIC FULL PAGE COVER BACKGROUND
*/

const CONFIG = {
  dataUrl: "/data/admin.json",
  fallbackCover: "/img/upcoming.jpg",
  pickNearestFuture: true
};

function safeText(v) {
  return (v ?? "").toString().trim();
}


/* =========================
   DYNAMIC UPCOMING BACKGROUND
   ========================= */

function syncUpcomingBackground() {
  const cover = document.getElementById("upcomingCover");
  const bg = document.getElementById("upcomingPageBg");

  if (!cover || !bg) return;

  function updateBackground() {
    const src = cover.currentSrc || cover.src;

    if (!src) return;

    bg.style.backgroundImage = `url("${src}")`;
  }

  // Ha a kép már be van töltve
  if (cover.complete && cover.naturalWidth > 0) {
    updateBackground();
  }

  // Amikor a kép ténylegesen betöltődik
  cover.addEventListener("load", updateBackground);

  // Ha később változik a cover src-je
  const observer = new MutationObserver(() => {
    if (cover.complete && cover.naturalWidth > 0) {
      updateBackground();
    }
  });

  observer.observe(cover, {
    attributes: true,
    attributeFilter: ["src"]
  });
}


/**
 * comingmusicdate: "YYYY_MM_DD"
 * -> Date object at UTC midnight
 */
function parseDateFlexible(s) {
  if (!s) return null;

  const trimmed = safeText(s);

  // YYYY_MM_DD ✅ (your standard)
  const m0 = trimmed.match(/^(\d{4})_(\d{2})_(\d{2})$/);

  if (m0) {
    const y = Number(m0[1]);
    const mo = Number(m0[2]) - 1;
    const d = Number(m0[3]);

    return new Date(
      Date.UTC(y, mo, d, 0, 0, 0)
    );
  }

  // optional legacy support
  const m1 = trimmed.match(
    /^(\d{4})\.(\d{2})\.(\d{2})\.?$/
  );

  if (m1) {
    return new Date(
      Date.UTC(
        Number(m1[1]),
        Number(m1[2]) - 1,
        Number(m1[3]),
        0,
        0,
        0
      )
    );
  }

  const m2 = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (m2) {
    return new Date(
      Date.UTC(
        Number(m2[1]),
        Number(m2[2]) - 1,
        Number(m2[3]),
        0,
        0,
        0
      )
    );
  }

  const t = Date.parse(trimmed);

  if (!Number.isNaN(t)) {
    const d = new Date(t);

    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        0,
        0,
        0
      )
    );
  }

  return null;
}


function formatToYYYYMMDDDots(d) {
  // IMPORTANT: use UTC getters so it never shifts
  const yyyy = d.getUTCFullYear();
  const mm = String(
    d.getUTCMonth() + 1
  ).padStart(2, "0");

  const dd = String(
    d.getUTCDate()
  ).padStart(2, "0");

  return `${yyyy}.${mm}.${dd}.`;
}


function pickRow(rows) {
  if (!rows.length) return null;

  if (!CONFIG.pickNearestFuture) {
    return rows[0];
  }

  const now = new Date();

  const todayUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0
  );

  const withDate = rows
    .map(r => ({
      r,
      d: parseDateFlexible(
        r.comingmusicdate
      )
    }))
    .filter(
      x =>
        x.d instanceof Date &&
        !Number.isNaN(
          x.d.getTime()
        )
    );

  if (!withDate.length) {
    return rows[0];
  }

  const future = withDate.filter(
    x =>
      x.d.getTime() >=
      todayUtcMidnight
  );

  const pool =
    future.length
      ? future
      : withDate;

  pool.sort(
    (a, b) =>
      a.d - b.d
  );

  return pool[0].r;
}


function setText(id, value) {
  const el =
    document.getElementById(id);

  if (el) {
    el.textContent = value;
  }
}


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
     DATE
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
     ARTIST / GENRE
     ========================= */

  setText(
    "upcomingArtist",
    artist || "—"
  );


  /* =========================
     TITLE
     ========================= */

  setText(
    "upcomingTitle",
    title || "—"
  );


  /* =========================
     FEAT
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
     COVER
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


/* =========================
   LOAD UPCOMING
   ========================= */

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

  const row =
    pickRow(
      Array.isArray(rows)
        ? rows
        : []
    );

  if (!row) return;

  initUpcoming(row);
}


/* =========================
   INIT
   ========================= */

/*
 * Először figyeljük az upcomingCover-t.
 * Utána a loadUpcoming() lecseréli a kép src-jét.
 *
 * Amikor az új cover betöltődik,
 * ugyanaz a kép automatikusan bekerül
 * az #upcomingPageBg hátterébe is.
 */
syncUpcomingBackground();

loadUpcoming().catch(
  console.error
);