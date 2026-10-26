/* =========================================================
   REWOD HOMEPAGE – RELEASES

   + LATEST NON-DAILY RELEASE
   + UPCOMING FROM LATEST NON-DAILY RELEASE
   + LIVE COUNTDOWN
   + DYNAMIC RELEASES BACKGROUND

   Daily Sheet Music entries are completely ignored.

   RELEASE TIME:
   Loaded dynamically from releasetime.json.

   All release times are interpreted
   in Europe/Budapest timezone.

   Automatically handles CET / CEST.
   ========================================================= */


const DATA_URL = "data/admin.json";

const RELEASE_TIME_URL =
  "/backstage/backstage-edit-data/releasetime.json";

const RELEASE_TIMEZONE = "Europe/Budapest";


/* =========================================================
   HELPERS
   ========================================================= */

function safeText(v) {
  return (v ?? "").toString().trim();
}

function buildArtistLine(a1, a2) {
  const A = safeText(a1);
  const B = safeText(a2);

  if (A && B) {
    return `${A}, ${B}`;
  }

  return A || "";
}


/* =========================================================
   DAILY CHECK
   ========================================================= */

/*
 * "daily": "x"  -> Daily Sheet Music
 * "daily": ""   -> Regular music release
 * Missing daily -> Regular music release
 */

function isDaily(row) {
  return (
    safeText(row?.daily).toLowerCase() === "x"
  );
}


/* =========================================================
   RELEASE DATE PARSER
   ========================================================= */

/*
 * Expected:
 * YYYY_MM_DD
 *
 * Example:
 * 2026_10_26
 */

function parseReleaseDate(value) {
  const text = safeText(value);

  const match = text.match(
    /^(\d{4})_(\d{2})_(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  /* Reject invalid dates */

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
   PICK LATEST NON-DAILY RELEASE
   ========================================================= */

function pickLatestRelease(rows) {

  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }


  /* STEP 1: Ignore Daily entries */

  const regularRows = rows.filter(
    row => row && !isDaily(row)
  );

  if (!regularRows.length) {
    return null;
  }


  /* STEP 2: Sort newest first */

  regularRows.sort((a, b) => {

    const dateA = parseReleaseDate(
      a.newmusicdate
    );

    const dateB = parseReleaseDate(
      b.newmusicdate
    );

    const timeA = dateA
      ? dateA.getTime()
      : -Infinity;

    const timeB = dateB
      ? dateB.getTime()
      : -Infinity;

    return timeB - timeA;

  });


  /* STEP 3: Return latest regular release */

  return regularRows[0];

}


/* =========================================================
   TITLE + FEAT
   ========================================================= */

/*
 * If artist line already mentions REWOD,
 * don't add "ft. X" to the title.
 */

function artistContainsRewod(artistStr) {
  return safeText(artistStr)
    .toLowerCase()
    .includes("rewod");
}

function buildTitleWithFeat(
  title,
  feat,
  artistStr = ""
) {
  const t = safeText(title);
  const f = safeText(feat);

  if (!t) {
    return "";
  }

  if (!f) {
    return t;
  }

  if (artistContainsRewod(artistStr)) {
    return t;
  }

  return `${t} ft. ${f}`;
}


/* =========================================================
   RELEASE TIME JSON
   ========================================================= */

/*
 * Source:
 *
 * /backstage/backstage-edit-data/releasetime.json
 *
 * Expected JSON:
 *
 * [
 *   {
 *     "releasetime": "12:00"
 *   }
 * ]
 *
 * The time is ALWAYS Budapest local time.
 *
 * Examples:
 *
 * 12:00 -> 12:00 Budapest
 * 13:00 -> 13:00 Budapest
 * 18:30 -> 18:30 Budapest
 *
 * No hardcoded release hour is used.
 */

function parseReleaseTime(value) {

  const text = safeText(value);

  const match = text.match(
    /^([01]\d|2[0-3]):([0-5]\d)$/
  );

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}


async function loadReleaseTime() {

  const response = await fetch(
    RELEASE_TIME_URL,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load ${RELEASE_TIME_URL}: ${response.status}`
    );
  }

  const data = await response.json();

  if (
    !Array.isArray(data) ||
    !data.length
  ) {
    throw new Error(
      "releasetime.json must contain a non-empty array."
    );
  }

  const releaseTime = parseReleaseTime(
    data[0]?.releasetime
  );

  if (!releaseTime) {
    throw new Error(
      "Invalid releasetime.json value. Expected HH:MM (00:00–23:59)."
    );
  }

  return releaseTime;
}


/* =========================================================
   BUDAPEST TIMEZONE HELPERS
   ========================================================= */

/*
 * Converts a Budapest wall-clock date/time
 * into an absolute JavaScript timestamp.
 *
 * Handles CET / CEST automatically.
 *
 * Example:
 *
 * JSON release date:
 * 2026_11_05
 *
 * releasetime.json:
 * 13:00
 *
 * Means:
 *
 * November 5, 2026
 * 13:00 in Budapest
 *
 * NOT UTC time.
 * NOT visitor-local time.
 */

const budapestFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    timeZone: RELEASE_TIMEZONE,
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


function getBudapestOffsetMs(date) {

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


/*
 * Validate that the calculated instant
 * really corresponds to the requested
 * Budapest calendar date and time.
 */

function matchesBudapestTime(
  date,
  target,
  hour,
  minute
) {

  const parts =
    getBudapestParts(date);

  return (
    parts.year === target.year &&
    parts.month === target.month &&
    parts.day === target.day &&
    parts.hour === hour &&
    parts.minute === minute
  );
}


/* =========================================================
   RELEASE COUNTDOWN TARGET
   ========================================================= */

/*
 * Accepts:
 *
 * YYYY_MM_DD
 * YYYY-MM-DD
 *
 * The target hour and minute come
 * exclusively from releasetime.json.
 *
 * Returns an absolute Unix timestamp
 * in milliseconds.
 */

function budapestReleaseMs(
  dateStr,
  releaseTime
) {

  const text = safeText(dateStr);

  if (!text || !releaseTime) {
    return null;
  }

  const hour = releaseTime.hour;
  const minute = releaseTime.minute;

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const normalized =
    text.replace(/-/g, "_");

  const match = normalized.match(
    /^(\d{4})_(\d{2})_(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const validationDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() + 1 !== month ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  const target = {
    year,
    month,
    day
  };


  /*
   * Initial UTC guess.
   */

  const utcGuess = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );


  /*
   * Determine Budapest UTC offsets.
   */

  const firstOffset =
    getBudapestOffsetMs(
      new Date(utcGuess)
    );

  const firstTimestamp =
    utcGuess - firstOffset;

  const secondOffset =
    getBudapestOffsetMs(
      new Date(firstTimestamp)
    );


  /*
   * Check multiple possible offsets.
   *
   * This handles CET / CEST changes.
   *
   * If a local time is ambiguous during
   * the autumn DST transition, the earlier
   * matching instant is selected.
   *
   * Nonexistent local times during the
   * spring transition are rejected.
   */

  const offsets = [
    firstOffset,
    secondOffset,

    getBudapestOffsetMs(
      new Date(
        utcGuess - 24 * 60 * 60 * 1000
      )
    ),

    getBudapestOffsetMs(
      new Date(
        utcGuess + 24 * 60 * 60 * 1000
      )
    )
  ];


  const candidates = offsets
    .map(offset =>
      new Date(utcGuess - offset)
    )
    .filter(candidate =>
      matchesBudapestTime(
        candidate,
        target,
        hour,
        minute
      )
    )
    .sort((a, b) => a - b);


  if (!candidates.length) {
    return null;
  }

  return candidates[0].getTime();
}


/* =========================================================
   COUNTDOWN FORMAT
   ========================================================= */

/*
 * Example:
 *
 * 42 days 19 hours
 * 10 minutes 41 seconds
 */

function formatCountdownText(msLeft) {

  if (msLeft <= 0) {
    return "Out now";
  }

  const totalSec = Math.floor(
    msLeft / 1000
  );

  const days = Math.floor(
    totalSec / 86400
  );

  const hours = Math.floor(
    (totalSec % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSec % 3600) / 60
  );

  const seconds = totalSec % 60;

  return (
    `${days} days ${hours} hours<br>` +
    `${minutes} minutes ${seconds} seconds`
  );
}


/* =========================================================
   RELEASES DYNAMIC BACKGROUND
   ========================================================= */

function syncReleasesBackground() {

  const cover = document.getElementById(
    "latestCover"
  );

  const bg = document.getElementById(
    "releasesBg"
  );

  if (!cover || !bg) {
    return;
  }


  function updateBackground() {

    const src = cover.currentSrc || cover.src;

    if (!src) {
      return;
    }

    bg.style.backgroundImage =
      `url("${src}")`;

  }


  /* Set immediately */

  updateBackground();


  /* Update when image finishes loading */

  cover.addEventListener(
    "load",
    updateBackground
  );


  /* Watch future src changes */

  const observer = new MutationObserver(
    updateBackground
  );

  observer.observe(cover, {
    attributes: true,
    attributeFilter: ["src"]
  });

}


/* =========================================================
   MAIN INIT
   ========================================================= */

async function init() {

  /* =========================
     LOAD ADMIN JSON + RELEASE TIME
     ========================= */

  /*
   * Both files are loaded before the
   * countdown target is calculated.
   *
   * This ensures that the release time
   * always comes from releasetime.json.
   */

  const [adminResponse, releaseTimeResult] =
    await Promise.allSettled([
      fetch(
        DATA_URL,
        {
          cache: "no-store"
        }
      ),
      loadReleaseTime()
    ]);


  if (
    adminResponse.status !== "fulfilled"
  ) {
    throw adminResponse.reason;
  }

  const res = adminResponse.value;

  if (!res.ok) {
    throw new Error(
      `Failed to load ${DATA_URL}: ${res.status}`
    );
  }

  const rows = await res.json();


  /*
   * Release time is optional for
   * displaying release titles and covers,
   * but mandatory for the countdown.
   */

  let releaseTime = null;

  if (
    releaseTimeResult.status === "fulfilled"
  ) {
    releaseTime = releaseTimeResult.value;
  } else {
    console.error(
      "Homepage: Could not load release time:",
      releaseTimeResult.reason
    );
  }


  /* =========================
     SELECT LATEST NON-DAILY
     ========================= */

  const data = pickLatestRelease(rows);

  if (!data) {
    console.warn(
      "Homepage: No non-daily releases found."
    );
    return;
  }


  /* =========================
     LATEST RELEASE
     ========================= */

  const latestArtist = buildArtistLine(
    data.newmusicartist,
    data.newmusicartist2
  );

  const latestTitle = buildTitleWithFeat(
    data.newmusictitle,
    data.feat,
    latestArtist
  );

  const latestTitleEl =
    document.getElementById(
      "latestTitle"
    );

  const latestArtistEl =
    document.getElementById(
      "latestArtist"
    );

  if (latestTitleEl) {
    latestTitleEl.textContent =
      latestTitle || "";
  }

  if (latestArtistEl) {
    latestArtistEl.textContent =
      latestArtist || "";
  }


  /* =========================
     LATEST LISTEN BUTTON
     ========================= */

  const latestListenBtn =
    document.getElementById(
      "latestListenBtn"
    );

  if (latestListenBtn) {
    latestListenBtn.href = "latest/";
    latestListenBtn.style.opacity = "";
    latestListenBtn.style.pointerEvents = "";
  }


  /* =========================
     UPCOMING RELEASE
     ========================= */

  /*
   * Upcoming information comes from
   * the SAME latest non-daily release.
   */

  const comingArtist = safeText(
    data.comingmusicartist
  );

  const comingTitle = buildTitleWithFeat(
    data.comingmusictitle,
    data.comingfeat,
    comingArtist
  );

  const comingTitleEl =
    document.getElementById(
      "comingTitle"
    );

  const comingArtistEl =
    document.getElementById(
      "comingArtist"
    );

  const countdownEl =
    document.getElementById(
      "comingCountdown"
    );

  if (comingTitleEl) {
    comingTitleEl.textContent =
      comingTitle || "";
  }

  if (comingArtistEl) {
    comingArtistEl.textContent =
      comingArtist || "";
  }


  /* =========================
     UPCOMING COUNTDOWN
     ========================= */

  if (countdownEl) {

    /*
     * Date:
     * admin.json -> comingmusicdate
     *
     * Time:
     * releasetime.json -> releasetime
     *
     * Timezone:
     * Europe/Budapest
     */

    const targetTimestamp =
      budapestReleaseMs(
        data.comingmusicdate,
        releaseTime
      );

    if (targetTimestamp === null) {

      countdownEl.textContent = "--";

    } else {

      function tick() {

        const msLeft =
          targetTimestamp - Date.now();

        countdownEl.innerHTML =
          formatCountdownText(msLeft);

      }

      tick();

      window.setInterval(
        tick,
        1000
      );

    }

  }

}


/* =========================================================
   START
   ========================================================= */

/*
 * Start background synchronization immediately.
 *
 * This watches #latestCover for image changes.
 */

syncReleasesBackground();


/*
 * Load JSON-driven homepage data.
 */

init().catch(
  console.error
);