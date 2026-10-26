/* =========================================================
   SONG PAGE – REWOD

   DATA SOURCES:
   /data/database.json
   /data/schedule.json
   /backstage/backstage-edit-data/releasetime.json

   FEATURES:
   - Dynamic song page by ?id=
   - NON-DAILY releases only
   - Latest NON-DAILY fallback
   - Latest from database.json
   - Upcoming from schedule.json
   - Music releases only for Upcoming
   - Home blocks
   - Tape mode
   - Description + signature
   - Dynamic cover rules
   - Dynamic full-page background
   - Budapest release time (CET / CEST)
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const CONFIG = {
  dataUrl: "/data/database.json",

  scheduleUrl: "/data/schedule.json",

  releaseTimeUrl:
    "/backstage/backstage-edit-data/releasetime.json",

  releaseTimezone: "Europe/Budapest",

  kofiUrl: "https://ko-fi.com/rewodmusic",

  signatureUrl: "/img/signature.png",

  covers: {
    latest: "/img/latest.jpg",
    upcoming: "/img/upcoming.jpg",
    original: "/img/profile_original.jpg",
    feat: "/img/profile_feat.jpg",
    tape: "/img/profile_tape.jpg",
    default: "/img/profile.jpg"
  },

  newsletterDir: "/newsletter",
  newsletterExt: ".jpg"
};


/* =========================================================
   HELPERS
   ========================================================= */

function safeText(s) {
  return (s ?? "").toString();
}


function hasText(s) {
  return safeText(s).trim().length > 0;
}


function pick(row, keys, fallback = "") {

  for (const key of keys) {

    if (hasText(row?.[key])) {
      return safeText(row[key]).trim();
    }

  }

  return fallback;
}


/* =========================================================
   DAILY FILTER
   ========================================================= */

function isDaily(row) {

  return (
    safeText(row?.daily)
      .trim()
      .toLowerCase() === "x"
  );

}


/* =========================================================
   RELEASE DATE
   ========================================================= */

function parseReleaseDate(value) {

  const text = safeText(value).trim();

  const match = text.match(
    /^(\d{4})_(\d{2})_(\d{2})$/
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
   LATEST NON-DAILY RELEASE
   ========================================================= */

function pickLatestRelease(rows) {

  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }

  const regularRows = rows.filter(
    row => row && !isDaily(row)
  );

  if (!regularRows.length) {
    return null;
  }

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
   NEXT MUSIC RELEASE – SCHEDULE.JSON
   ========================================================= */

function pickNextMusicRelease(rows, releaseTime) {

  if (!Array.isArray(rows)) {
    return null;
  }

  const now = Date.now();

  const upcoming = rows
    .filter(row =>
      row &&
      hasText(row.title) &&
      hasText(row.artist)
    )
    .map(row => {

      const customTime = hasText(row.hour)
        ? parseReleaseTime(row.hour)
        : null;

      const time = customTime || releaseTime;

      if (!time) return null;

      const timestamp = budapestReleaseMs(
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
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp
    );

  return upcoming.length
    ? upcoming[0]
    : null;
}


/* =========================================================
   DYNAMIC SONG BACKGROUND
   ========================================================= */

function syncSongBackground() {

  const cover =
    document.getElementById("latestCover");

  const bg =
    document.getElementById("songPageBg");

  if (!cover || !bg) return;


  function updateBackground() {

    if (
      !cover.complete ||
      cover.naturalWidth === 0
    ) {
      return;
    }

    const src = cover.currentSrc || cover.src;

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


  const observer = new MutationObserver(
    updateBackground
  );

  observer.observe(cover, {
    attributes: true,
    attributeFilter: ["src"]
  });

}


/* =========================================================
   ID NORMALIZATION
   ========================================================= */

function normId(s) {

  return safeText(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

}


function slugify(s) {

  return safeText(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

}


function isOriginalComposition(row) {

  const artist = pick(
    row,
    ["newmusicartist", "artist"],
    ""
  ).toLowerCase();

  return artist === "original composition";

}


/* =========================================================
   BUILD ROW ID
   ========================================================= */

function buildRowId(row) {

  const title = pick(
    row,
    [
      "title",
      "newmusictitle",
      "musictitle"
    ]
  );

  if (isOriginalComposition(row)) {
    return slugify(title);
  }

  const artist = pick(
    row,
    [
      "artist",
      "newmusicartist",
      "musicartist"
    ]
  );

  return (
    `${slugify(artist)}-${slugify(title)}`
  ).replace(/^-+|-+$/g, "");

}


function getQueryId() {

  const params = new URLSearchParams(
    window.location.search
  );

  return safeText(
    params.get("id")
  ).trim();

}


/* =========================================================
   SERVICE BUTTONS
   ========================================================= */

function setBtn(btn, url) {

  if (!btn) return;

  const u = safeText(url).trim();

  if (u && u !== "#") {

    btn.href = u;
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";

  } else {

    btn.href = "#";
    btn.style.opacity = "0.45";
    btn.style.pointerEvents = "none";

  }

}


/* =========================================================
   SONG TITLE
   ========================================================= */

function buildTitle(row) {

  const title = pick(
    row,
    ["title", "newmusictitle"],
    "..."
  );

  const feat = pick(
    row,
    ["feat"],
    ""
  );

  const tape = pick(
    row,
    ["tape"],
    ""
  ).toLowerCase();


  if (tape === "x") {

    const artist = pick(
      row,
      ["artist", "newmusicartist"],
      "REWOD"
    );

    return `${artist} - ${title}`;

  }


  if (feat) {
    return `REWOD ft. ${feat} - ${title}`;
  }

  return `REWOD - ${title}`;

}


/* =========================================================
   TAPE MODE
   ========================================================= */

function setTapeMode(isTape) {

  const root =
    document.querySelector(".latest-release") ||
    document.body;

  root.classList.toggle(
    "is-tape",
    !!isTape
  );


  const rowSpotify =
    document.querySelector(
      ".latest-release .service-row.spotify"
    );

  const rowApple =
    document.querySelector(
      ".latest-release .service-row.apple"
    );

  const rowMMS =
    document.querySelector(
      ".latest-release .service-row.mms"
    );


  [rowSpotify, rowApple, rowMMS].forEach(el => {

    if (el) {
      el.style.display = "";
    }

  });


  if (isTape) {

    if (rowSpotify) {
      rowSpotify.style.display = "none";
    }

    if (rowApple) {
      rowApple.style.display = "none";
    }

    if (rowMMS) {
      rowMMS.style.display = "none";
    }

  }

}


/* =========================================================
   DESCRIPTION + SIGNATURE
   ========================================================= */

let _latestDescrNode = null;


function setDescr(row) {

  const services =
    document.getElementById("latestServices");

  const wrap =
    document.getElementById("latestDescr");

  const text =
    document.getElementById("latestDescrText");

  if (!services || !wrap || !text) return;


  const description = pick(
    row,
    ["descr", "description"],
    ""
  );


  /* NO DESCRIPTION */

  if (!description) {

    services.classList.remove(
      "has-descr"
    );

    wrap.hidden = true;

    if (wrap.parentElement) {
      _latestDescrNode = wrap;
      wrap.remove();
    }

    return;

  }


  /* DESCRIPTION EXISTS */

  if (!wrap.parentElement) {

    services.appendChild(
      _latestDescrNode || wrap
    );

  }

  services.classList.add(
    "has-descr"
  );

  wrap.hidden = false;

  text.textContent =
    `"${description}"\n- REWOD`;


  /* SIGNATURE */

  let signature =
    document.getElementById(
      "latestSignature"
    );

  if (!signature) {

    signature = document.createElement(
      "img"
    );

    signature.id =
      "latestSignature";

    signature.className =
      "latest-descr-signature";

    signature.alt =
      "REWOD signature";

    wrap.appendChild(signature);

  }


  const signatureUrl = pick(
    row,
    ["signatureUrl", "signatureurl"],
    CONFIG.signatureUrl
  );

  signature.src = signatureUrl;
  signature.loading = "lazy";
  signature.decoding = "async";

}


/* =========================================================
   RELEASE TIME JSON
   ========================================================= */

function parseReleaseTime(value) {

  const text = safeText(value).trim();

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
    CONFIG.releaseTimeUrl,
    {
      cache: "no-store"
    }
  );

  if (!response.ok) {

    throw new Error(
      `Failed to load ${CONFIG.releaseTimeUrl}: ${response.status}`
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
      "Invalid releasetime.json value. Expected HH:MM."
    );

  }

  return releaseTime;

}


/* =========================================================
   BUDAPEST TIMEZONE HELPERS
   ========================================================= */

const budapestFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    timeZone: CONFIG.releaseTimezone,
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

function budapestReleaseMs(
  dateStr,
  releaseTime
) {

  const text = safeText(dateStr).trim();

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


  const utcGuess = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    0,
    0
  );


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
   HOME BLOCK HELPERS
   ========================================================= */

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


function artistContainsRewod(artistStr) {

  return safeText(artistStr)
    .toLowerCase()
    .includes("rewod");

}


function appendFeatIfNeeded(
  title,
  feat,
  artistStr
) {

  const t = safeText(title).trim();
  const f = safeText(feat).trim();

  if (!t || !f) return t;

  if (artistContainsRewod(artistStr)) {
    return t;
  }

  return `${t} ft. ${f}`;

}


/* =========================================================
   HOME BLOCKS
   ========================================================= */

function initHomeBlocks(
  databaseRows,
  scheduleRows,
  releaseTime
) {

  const hasAny =
    document.getElementById("homeLatestTitle") ||
    document.getElementById("homeComingTitle") ||
    document.getElementById("homeComingCountdown");

  if (!hasAny) return;


  /* =========================================================
     LATEST BLOCK – DATABASE.JSON
     ========================================================= */

  const latest = pickLatestRelease(
    databaseRows
  );


  if (latest) {

    const latestTitleEl =
      document.getElementById(
        "homeLatestTitle"
      );

    const latestArtistEl =
      document.getElementById(
        "homeLatestArtist"
      );


    const latestTitle = pick(
      latest,
      ["newmusictitle", "title"],
      ""
    );

    const latestArtist = pick(
      latest,
      ["newmusicartist", "artist"],
      ""
    );

    const latestFeat = pick(
      latest,
      ["feat"],
      ""
    );


    if (latestTitleEl) {

      latestTitleEl.textContent =
        appendFeatIfNeeded(
          latestTitle,
          latestFeat,
          latestArtist
        );

    }


    if (latestArtistEl) {

      latestArtistEl.textContent =
        latestArtist;

    }


    /* LATEST COVER */

    const latestCoverEl =
      document.getElementById(
        "homeLatestCover"
      );

    const latestCoverUrl = pick(
      latest,
      [
        "coverUrl",
        "coverurl",
        "cover",
        "image",
        "img"
      ],
      ""
    );


    if (
      latestCoverEl &&
      latestCoverUrl
    ) {

      latestCoverEl.src =
        latestCoverUrl;

    }


    /* LATEST BUTTON */

    const latestBtn =
      document.getElementById(
        "homeLatestListenBtn"
      );

    if (latestBtn) {
      latestBtn.href = "/latest/";
    }

  }


  /* =========================================================
     UPCOMING BLOCK – SCHEDULE.JSON
     ========================================================= */

  const comingTitleEl =
    document.getElementById(
      "homeComingTitle"
    );

  const comingArtistEl =
    document.getElementById(
      "homeComingArtist"
    );

  const comingCoverEl =
    document.getElementById(
      "homeComingCover"
    );

  const countdownEl =
    document.getElementById(
      "homeComingCountdown"
    );


  const nextRelease = pickNextMusicRelease(
    scheduleRows,
    releaseTime
  );


  /* NO UPCOMING RELEASE */

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


  const coming =
    nextRelease.row;


  const comingTitle =
    safeText(
      coming.title
    ).trim();

  const comingArtist =
    safeText(
      coming.artist
    ).trim();

  const comingFeat =
    safeText(
      coming.feat
    ).trim();


  /* UPCOMING TITLE */

  if (comingTitleEl) {

    comingTitleEl.textContent =
      appendFeatIfNeeded(
        comingTitle,
        comingFeat,
        comingArtist
      );

  }


  /* UPCOMING ARTIST */

  if (comingArtistEl) {

    comingArtistEl.textContent =
      comingArtist;

  }


  /* UPCOMING COVER */

  if (comingCoverEl) {

    const coverUrl = pick(
      coming,
      [
        "coverUrl",
        "coverurl"
      ],
      CONFIG.covers.upcoming
    );

    comingCoverEl.src =
      coverUrl;

  }


  /* =========================================================
     UPCOMING COUNTDOWN
     ========================================================= */

  if (!countdownEl) return;


  const targetTimestamp =
    nextRelease.timestamp;


  function tick() {

    countdownEl.innerHTML =
      formatCountdownText(
        targetTimestamp - Date.now()
      );

  }


  tick();

  window.setInterval(
    tick,
    1000
  );

}


/* =========================================================
   DYNAMIC COVER RULES
   ========================================================= */

function setImgWithFallback(
  imgEl,
  preferredSrc,
  fallbackSrc
) {

  imgEl.onerror = () => {

    imgEl.onerror = null;

    imgEl.src =
      fallbackSrc;

  };

  imgEl.src =
    preferredSrc;

}


/* =========================================================
   SET DYNAMIC COVER
   ========================================================= */

function setDynamicCover(
  row,
  latestRow
) {

  const coverEl =
    document.getElementById(
      "latestCover"
    );

  if (!coverEl) return;


  let src =
    CONFIG.covers.default;


  const rowKey = normId(
    buildRowId(row)
  );

  const latestKey = latestRow
    ? normId(
        buildRowId(latestRow)
      )
    : "";


  const isLatestPage =
    !!latestRow &&
    rowKey &&
    latestKey &&
    rowKey === latestKey;


  /* LATEST COVER */

  if (isLatestPage) {

    coverEl.src =
      CONFIG.covers.latest;

    coverEl.alt =
      "REWOD cover";

    return;

  }


  /* NON-LATEST COVER */

  const tape = pick(
    row,
    ["tape"],
    ""
  ).toLowerCase();

  const feat = pick(
    row,
    ["feat"],
    ""
  );

  const artist = pick(
    row,
    ["newmusicartist", "artist"],
    ""
  ).toLowerCase();

  const titleSlug = slugify(
    pick(
      row,
      ["newmusictitle", "title"],
      ""
    )
  );


  /* TAPE */

  if (tape === "x") {

    coverEl.src =
      CONFIG.covers.tape;

    coverEl.alt =
      "REWOD cover";

    return;

  }


  /* ORIGINAL / FEAT */

  const isOriginal =
    artist === "original composition";

  const isFeat =
    !!feat;


  if (isOriginal || isFeat) {

    const preferred =
      `${CONFIG.newsletterDir}/` +
      `${titleSlug}` +
      `${CONFIG.newsletterExt}`;

    const fallback = isOriginal
      ? CONFIG.covers.original
      : CONFIG.covers.feat;


    setImgWithFallback(
      coverEl,
      preferred,
      fallback
    );

    coverEl.alt =
      "REWOD cover";

    return;

  }


  /* DEFAULT */

  coverEl.src =
    CONFIG.covers.default;

  coverEl.alt =
    "REWOD cover";

}


/* =========================================================
   MAIN INITIALIZATION
   ========================================================= */

async function initSong() {

  /* =========================================================
     LOAD DATABASE + SCHEDULE + RELEASE TIME
     ========================================================= */

  const [
    databaseResult,
    scheduleResult,
    releaseTimeResult
  ] = await Promise.allSettled([

    fetch(
      CONFIG.dataUrl,
      {
        cache: "no-store"
      }
    ),

    fetch(
      CONFIG.scheduleUrl,
      {
        cache: "no-store"
      }
    ),

    loadReleaseTime()

  ]);


  /* =========================
     DATABASE.JSON
     ========================= */

  if (
    databaseResult.status !== "fulfilled"
  ) {
    throw databaseResult.reason;
  }


  const databaseResponse =
    databaseResult.value;


  if (!databaseResponse.ok) {

    throw new Error(
      `Failed to load ${CONFIG.dataUrl}: ${databaseResponse.status}`
    );

  }


  const data =
    await databaseResponse.json();


  /* =========================
     SCHEDULE.JSON
     ========================= */

  let scheduleRows = [];


  if (
    scheduleResult.status === "fulfilled"
  ) {

    const scheduleResponse =
      scheduleResult.value;


    if (scheduleResponse.ok) {

      const scheduleData =
        await scheduleResponse.json();

      if (Array.isArray(scheduleData)) {
        scheduleRows = scheduleData;
      }

    } else {

      console.error(
        "Song Page: Could not load schedule:",
        scheduleResponse.status
      );

    }

  } else {

    console.error(
      "Song Page: Could not load schedule:",
      scheduleResult.reason
    );

  }


  /* =========================
     RELEASE TIME
     ========================= */

  let releaseTime = null;


  if (
    releaseTimeResult.status === "fulfilled"
  ) {

    releaseTime =
      releaseTimeResult.value;

  } else {

    console.error(
      "Song Page: Could not load release time:",
      releaseTimeResult.reason
    );

  }


  /* =========================
     VALIDATE DATABASE
     ========================= */

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return;
  }


  /* =========================
     REMOVE ALL DAILY ENTRIES
     ========================= */

  const regularRows = data.filter(
    row => row && !isDaily(row)
  );


  if (!regularRows.length) {

    console.warn(
      "Song Page: No non-daily releases found."
    );

    return;

  }


  /* =========================
     FIND LATEST REGULAR RELEASE
     ========================= */

  const latestRow =
    pickLatestRelease(
      regularRows
    );

  if (!latestRow) return;


  /* =========================
     HOME BLOCKS
     ========================= */

  try {

    initHomeBlocks(
      regularRows,
      scheduleRows,
      releaseTime
    );

  } catch (error) {

    console.error(
      "Home blocks error:",
      error
    );

  }


  /* =========================
     PICK SONG BY ?id=
     ========================= */

  const wantedRaw =
    getQueryId();

  const wanted =
    normId(wantedRaw);

  let row = null;


  if (wanted) {

    row =

      regularRows.find(
        r => normId(r.id) === wanted
      ) ||

      regularRows.find(
        r => normId(r.slug) === wanted
      ) ||

      regularRows.find(
        r =>
          normId(
            buildRowId(r)
          ) === wanted
      ) ||

      regularRows.find(
        r =>
          isOriginalComposition(r) &&
          normId(
            slugify(
              pick(
                r,
                ["newmusictitle", "title"]
              )
            )
          ) === wanted
      ) ||

      regularRows.find(
        r =>
          normId(
            slugify(
              pick(
                r,
                ["newmusicartist", "artist"]
              )
            ) +
            slugify(
              pick(
                r,
                ["newmusictitle", "title"]
              )
            )
          ) === wanted
      );

  }


  /* =========================
     INVALID URL FALLBACK
     ========================= */

  if (!row) {
    row = latestRow;
  }


  /* =========================
     DYNAMIC COVER
     ========================= */

  setDynamicCover(
    row,
    latestRow
  );


  /* =========================
     SONG TITLE
     ========================= */

  const titleEl =
    document.getElementById(
      "latestTitle"
    );

  const titleStr =
    buildTitle(row);


  if (titleEl) {
    titleEl.textContent = titleStr;
  }


  /* =========================
     TAPE MODE
     ========================= */

  const isTape =
    pick(
      row,
      ["tape"],
      ""
    ).toLowerCase() === "x";

  setTapeMode(isTape);


  /* =========================
     SERVICE BUTTONS
     ========================= */

  setBtn(
    document.getElementById(
      "btnSpotify"
    ),
    pick(
      row,
      [
        "spotifyurl",
        "spotifyUrl",
        "spotify"
      ],
      ""
    )
  );


  setBtn(
    document.getElementById(
      "btnApple"
    ),
    pick(
      row,
      [
        "appleurl",
        "appleUrl",
        "apple"
      ],
      ""
    )
  );


  setBtn(
    document.getElementById(
      "btnYouTube"
    ),
    pick(
      row,
      [
        "youtubeurl",
        "youtubeUrl",
        "youtube"
      ],
      ""
    )
  );


  setBtn(
    document.getElementById(
      "btnMMS"
    ),
    pick(
      row,
      [
        "mymusicurl",
        "mymusicUrl",
        "sheeturl",
        "sheetUrl"
      ],
      ""
    )
  );


  /* =========================
     KO-FI
     ========================= */

  const kofiBtn =
    document.getElementById(
      "btnKofi"
    );


  if (kofiBtn) {

    kofiBtn.href =
      CONFIG.kofiUrl;

    kofiBtn.target =
      "_blank";

    kofiBtn.rel =
      "noopener";

  }


  /* =========================
     DESCRIPTION + SIGNATURE
     ========================= */

  setDescr(row);


  /* =========================
     BROWSER TAB TITLE
     ========================= */

  document.title =
    titleStr;

}


/* =========================================================
   START
   ========================================================= */

syncSongBackground();

initSong().catch(
  console.error
);