/* =========================================================
   REWOD HOMEPAGE – RELEASES

   DATA SOURCES:
   /data/database.json
   /data/schedule.json
   /backstage/backstage-edit-data/releasetime.json

   FEATURES:
   - Latest NON-DAILY release from database.json
   - Upcoming music release from schedule.json
   - Music releases only (title + artist)
   - Custom release hour support
   - Live countdown
   - Dynamic releases background
   - Budapest timezone (CET / CEST)

   Daily Sheet Music entries are ignored
   when selecting the Latest release.

   Photo, video promo, review and vlog
   events are ignored when selecting Upcoming.
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const DATA_URL = "/data/database.json";

const SCHEDULE_URL = "/data/schedule.json";

const RELEASE_TIME_URL =
  "/backstage/backstage-edit-data/releasetime.json";

const RELEASE_TIMEZONE = "Europe/Budapest";


/* =========================================================
   HELPERS
   ========================================================= */

function safeText(value) {
  return (value ?? "").toString().trim();
}


function hasText(value) {
  return safeText(value).length > 0;
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
 *
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


  /* Ignore Daily entries */

  const regularRows = rows.filter(
    row => row && !isDaily(row)
  );

  if (!regularRows.length) {
    return null;
  }


  /* Sort newest first */

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


  return regularRows[0];

}


/* =========================================================
   TITLE + FEAT
   ========================================================= */

/*
 * If the artist line already mentions REWOD,
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
 * Expected:
 *
 * [
 *   {
 *     "releasetime": "12:00"
 *   }
 * ]
 *
 * The time is always Budapest local time.
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
 * Converts Budapest local date/time
 * into an absolute JavaScript timestamp.
 *
 * Automatically handles CET / CEST.
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


/* =========================================================
   VALIDATE BUDAPEST TIME
   ========================================================= */

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
 * The target hour comes from:
 *
 * 1. schedule.json -> hour
 * 2. releasetime.json -> releasetime
 *
 * All times are interpreted as
 * Europe/Budapest local time.
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


  /* Initial UTC guess */

  const utcGuess = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );


  /* Determine Budapest UTC offsets */

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
   * Handles CET / CEST changes.
   *
   * Ambiguous autumn times:
   * earlier matching instant is selected.
   *
   * Nonexistent spring times:
   * rejected.
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
   NEXT MUSIC RELEASE – SCHEDULE.JSON
   ========================================================= */

/*
 * A music release must have:
 *
 * title: non-empty
 * artist: non-empty
 *
 * Other schedule events are ignored.
 *
 * The nearest future music release
 * is selected.
 */

function pickNextMusicRelease(rows, releaseTime) {

  if (!Array.isArray(rows)) {
    return null;
  }

  const now = Date.now();


  const upcoming = rows

    /* Only actual music releases */

    .filter(row =>
      row &&
      hasText(row.title) &&
      hasText(row.artist)
    )

    /* Calculate release timestamps */

    .map(row => {

      const customTime = hasText(row.hour)
        ? parseReleaseTime(row.hour)
        : null;

      const time =
        customTime || releaseTime;

      if (!time) {
        return null;
      }


      const timestamp =
        budapestReleaseMs(
          row.date,
          time
        );


      if (
        timestamp === null ||
        timestamp <= now
      ) {
        return null;
      }


      return {
        row,
        timestamp
      };

    })

    .filter(Boolean)

    /* Earliest upcoming release first */

    .sort(
      (a, b) =>
        a.timestamp - b.timestamp
    );


  return upcoming.length
    ? upcoming[0]
    : null;

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

    const src =
      cover.currentSrc || cover.src;

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
   MAIN INITIALIZATION
   ========================================================= */

async function init() {

  /* =========================================================
     LOAD DATABASE + SCHEDULE + RELEASE TIME
     ========================================================= */

  const [
    databaseResult,
    scheduleResult,
    releaseTimeResult
  ] = await Promise.allSettled([

    fetch(
      DATA_URL,
      {
        cache: "no-store"
      }
    ),

    fetch(
      SCHEDULE_URL,
      {
        cache: "no-store"
      }
    ),

    loadReleaseTime()

  ]);


  /* =========================================================
     DATABASE.JSON
     ========================================================= */

  if (
    databaseResult.status !== "fulfilled"
  ) {
    throw databaseResult.reason;
  }


  const databaseResponse =
    databaseResult.value;


  if (!databaseResponse.ok) {

    throw new Error(
      `Failed to load ${DATA_URL}: ${databaseResponse.status}`
    );

  }


  const databaseRows =
    await databaseResponse.json();


  /* =========================================================
     SCHEDULE.JSON
     ========================================================= */

  let scheduleRows = [];


  if (
    scheduleResult.status === "fulfilled"
  ) {

    const scheduleResponse =
      scheduleResult.value;


    if (scheduleResponse.ok) {

      try {

        const scheduleData =
          await scheduleResponse.json();

        if (Array.isArray(scheduleData)) {
          scheduleRows = scheduleData;
        }

      } catch (error) {

        console.error(
          "Homepage: Invalid schedule.json:",
          error
        );

      }

    } else {

      console.error(
        "Homepage: Could not load schedule:",
        scheduleResponse.status
      );

    }

  } else {

    console.error(
      "Homepage: Could not load schedule:",
      scheduleResult.reason
    );

  }


  /* =========================================================
     RELEASE TIME
     ========================================================= */

  let releaseTime = null;


  if (
    releaseTimeResult.status === "fulfilled"
  ) {

    releaseTime =
      releaseTimeResult.value;

  } else {

    console.error(
      "Homepage: Could not load release time:",
      releaseTimeResult.reason
    );

  }


  /* =========================================================
     LATEST RELEASE – DATABASE.JSON
     ========================================================= */

  const latest =
    pickLatestRelease(
      databaseRows
    );


  if (latest) {

    const latestArtist =
      buildArtistLine(
        latest.newmusicartist,
        latest.newmusicartist2
      );

    const latestTitle =
      buildTitleWithFeat(
        latest.newmusictitle,
        latest.feat,
        latestArtist
      );


    /* LATEST TITLE */

    const latestTitleEl =
      document.getElementById(
        "latestTitle"
      );

    if (latestTitleEl) {

      latestTitleEl.textContent =
        latestTitle || "";

    }


    /* LATEST ARTIST */

    const latestArtistEl =
      document.getElementById(
        "latestArtist"
      );

    if (latestArtistEl) {

      latestArtistEl.textContent =
        latestArtist || "";

    }


    /* LATEST LISTEN BUTTON */

    const latestListenBtn =
      document.getElementById(
        "latestListenBtn"
      );

    if (latestListenBtn) {

      latestListenBtn.href =
        "latest/";

      latestListenBtn.style.opacity =
        "";

      latestListenBtn.style.pointerEvents =
        "";

    }

  } else {

    console.warn(
      "Homepage: No non-daily releases found."
    );

  }


  /* =========================================================
     UPCOMING RELEASE – SCHEDULE.JSON
     ========================================================= */

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


  const nextRelease =
    pickNextMusicRelease(
      scheduleRows,
      releaseTime
    );


  /* =========================================================
     NO UPCOMING RELEASE
     ========================================================= */

  if (!nextRelease) {

    if (comingTitleEl) {
      comingTitleEl.textContent = "—";
    }

    if (comingArtistEl) {
      comingArtistEl.textContent = "—";
    }

    if (countdownEl) {
      countdownEl.textContent = "--";
    }

    return;

  }


  /* =========================================================
     UPCOMING RELEASE DATA
     ========================================================= */

  const coming =
    nextRelease.row;


  const comingArtist =
    safeText(
      coming.artist
    );


  const comingTitle =
    buildTitleWithFeat(
      coming.title,
      coming.feat,
      comingArtist
    );


  /* UPCOMING TITLE */

  if (comingTitleEl) {

    comingTitleEl.textContent =
      comingTitle || "";

  }


  /* UPCOMING ARTIST */

  if (comingArtistEl) {

    comingArtistEl.textContent =
      comingArtist || "";

  }


  /* =========================================================
     LIVE COUNTDOWN
     ========================================================= */

  if (countdownEl) {

    const targetTimestamp =
      nextRelease.timestamp;


    function tick() {

      const msLeft =
        targetTimestamp - Date.now();

      countdownEl.innerHTML =
        formatCountdownText(
          msLeft
        );

    }


    tick();


    window.setInterval(
      tick,
      1000
    );

  }

}


/* =========================================================
   START
   ========================================================= */

/*
 * Start background synchronization immediately.
 *
 * Watches #latestCover for image changes.
 */

syncReleasesBackground();


/*
 * Load JSON-driven homepage data.
 */

init().catch(
  console.error
);


/* =========================================================
   HOME – NEXT 7 DAYS SCROLL REVEAL
   ========================================================= */

(function initHomeScheduleReveal() {

    const section = document.querySelector(
        "body.page-home .home-schedule"
    );

    if (!section) return;

    /* Reveal immediately if IntersectionObserver is unavailable */

    if (!("IntersectionObserver" in window)) {
        section.classList.add("is-in");
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("is-in");

                    observer.unobserve(entry.target);

                }

            });

        },
        {
            threshold: 0.12
        }
    );

    observer.observe(section);

})();