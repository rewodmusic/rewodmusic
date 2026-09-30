/* =========================
   SONG PAGE – dynamic by ?id=
   + HOME blocks (latest/upcoming) SAFE
   + PROFILE IMAGE on top (always)
   + DYNAMIC FULL PAGE COVER BACKGROUND
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png",

  // cover images by rule
  covers: {
    latest: "/img/latest.jpg",
    original: "/img/profile_original.jpg",
    feat: "/img/profile_feat.jpg",
    tape: "/img/profile_tape.jpg",
    default: "/img/profile.jpg"
  },

  // newsletter folder for release images (originals + feats)
  newsletterDir: "/newsletter",
  newsletterExt: ".jpg"
};

function safeText(s) {
  return (s ?? "").toString();
}

function hasText(s) {
  return safeText(s).trim().length > 0;
}

/* =========================
   DYNAMIC SONG BACKGROUND
   ========================= */

function syncSongBackground() {
  const cover = document.getElementById("latestCover");
  const bg = document.getElementById("songPageBg");

  if (!cover || !bg) return;

  function updateBackground() {
    const src = cover.currentSrc || cover.src;

    if (!src) return;

    bg.style.backgroundImage = `url("${src}")`;
  }

  // ha a kép már betöltődött
  if (cover.complete && cover.src) {
    updateBackground();
  }

  // normál betöltéskor
  cover.addEventListener("load", updateBackground);

  // ha JS később megváltoztatja a src-t
  const observer = new MutationObserver(updateBackground);

  observer.observe(cover, {
    attributes: true,
    attributeFilter: ["src"]
  });
}

/** erős normalizálás id-k összehasonlításához */
function normId(s) {
  return safeText(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** klasszikus slug (artist-title) */
function slugify(s) {
  return safeText(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** rugalmas mező-lookup */
function pick(row, keys, fallback = "") {
  for (const k of keys) {
    if (hasText(row?.[k])) return safeText(row[k]).trim();
  }

  return fallback;
}

/* detect originals */
function isOriginalComposition(row) {
  const a = pick(
    row,
    ["newmusicartist", "artist"],
    ""
  ).toLowerCase().trim();

  return a === "original composition";
}

/**
 * id = "artist-title"
 *
 * RULE:
 * - if original composition -> ONLY "title"
 */
function buildRowId(row) {
  const title = pick(
    row,
    ["title", "newmusictitle", "musictitle"]
  );

  if (isOriginalComposition(row)) {
    return `${slugify(title)}`.replace(/^-+|-+$/g, "");
  }

  const artist = pick(
    row,
    ["artist", "newmusicartist", "musicartist"]
  );

  return `${slugify(artist)}-${slugify(title)}`
    .replace(/^-+|-+$/g, "");
}

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return safeText(params.get("id")).trim();
}

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

function buildTitle(row) {
  const t = pick(row, ["title", "newmusictitle"], "...");
  const f = pick(row, ["feat"], "");
  const tape = pick(row, ["tape"], "").toLowerCase();

  if (tape === "x") {
    const a = pick(
      row,
      ["artist", "newmusicartist"],
      "REWOD"
    );

    return `${a} - ${t}`;
  }

  if (f) return `REWOD ft. ${f} - ${t}`;

  return `REWOD - ${t}`;
}

/* =========================
   TAPE UI
   ========================= */

function setTapeMode(isTape) {
  const root =
    document.querySelector(".latest-release") ||
    document.body;

  root.classList.toggle("is-tape", !!isTape);

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
    if (el) el.style.display = "";
  });

  if (isTape) {
    if (rowSpotify) rowSpotify.style.display = "none";
    if (rowApple) rowApple.style.display = "none";
    if (rowMMS) rowMMS.style.display = "none";
  }
}

/* =========================
   DESCR BLOCK
   ========================= */

let _latestDescrNode = null;

function setDescr(row) {
  const services =
    document.getElementById("latestServices");

  const wrap =
    document.getElementById("latestDescr");

  const text =
    document.getElementById("latestDescrText");

  if (!services || !wrap || !text) return;

  const d = pick(
    row,
    ["descr", "description"],
    ""
  );

  if (!d) {
    services.classList.remove("has-descr");

    wrap.hidden = true;

    if (wrap.parentElement) {
      _latestDescrNode = wrap;
      wrap.remove();
    }

    return;
  }

  if (!wrap.parentElement) {
    services.appendChild(
      _latestDescrNode || wrap
    );
  }

  services.classList.add("has-descr");

  wrap.hidden = false;

  text.textContent =
    `"${d}"\n- REWOD`;

  let sig =
    document.getElementById("latestSignature");

  if (!sig) {
    sig = document.createElement("img");
    sig.id = "latestSignature";
    sig.className = "latest-descr-signature";
    sig.alt = "REWOD signature";

    wrap.appendChild(sig);
  }

  const sigUrl = pick(
    row,
    ["signatureUrl", "signatureurl"],
    CONFIG.signatureUrl
  );

  sig.src = sigUrl;
  sig.loading = "lazy";
  sig.decoding = "async";
}

/* =========================
   HOME BLOCKS
   ========================= */

function utcMidnightMs(dateStr) {
  const s = safeText(dateStr).trim();

  if (!s) return null;

  const normalized =
    s.replace(/_/g, "-");

  const m =
    normalized.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!m) return null;

  return Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    0,
    0,
    0
  );
}

function formatCountdownText(msLeft) {
  if (msLeft <= 0) return "Out now";

  const totalSec =
    Math.floor(msLeft / 1000);

  const days =
    Math.floor(totalSec / 86400);

  const hours =
    Math.floor(
      (totalSec % 86400) / 3600
    );

  const minutes =
    Math.floor(
      (totalSec % 3600) / 60
    );

  const seconds =
    totalSec % 60;

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

  if (!t) return "";
  if (!f) return t;

  if (artistContainsRewod(artistStr)) {
    return t;
  }

  return `${t} ft. ${f}`;
}

function initHomeBlocks(rows) {
  const hasAny =
    document.getElementById("homeLatestTitle") ||
    document.getElementById("homeComingTitle") ||
    document.getElementById("homeComingCountdown");

  if (!hasAny) return;

  const latest =
    rows?.[0] || {};

  /* ---------- LATEST ---------- */

  const latestTitleEl =
    document.getElementById("homeLatestTitle");

  const latestArtistEl =
    document.getElementById("homeLatestArtist");

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

  const latestBtn =
    document.getElementById(
      "homeLatestListenBtn"
    );

  if (latestBtn) {
    latestBtn.href = "/latest/";
  }

  /* ---------- UPCOMING ---------- */

  const comingTitleEl =
    document.getElementById(
      "homeComingTitle"
    );

  const comingArtistEl =
    document.getElementById(
      "homeComingArtist"
    );

  const comingTitle = pick(
    latest,
    ["comingmusictitle"],
    ""
  );

  const comingArtist = pick(
    latest,
    ["comingmusicartist"],
    ""
  );

  const comingFeat = pick(
    latest,
    ["comingfeat"],
    ""
  );

  if (comingTitleEl) {
    comingTitleEl.textContent =
      appendFeatIfNeeded(
        comingTitle,
        comingFeat,
        comingArtist
      );
  }

  if (comingArtistEl) {
    comingArtistEl.textContent =
      comingArtist;
  }

  const comingCoverEl =
    document.getElementById(
      "homeComingCover"
    );

  const comingCoverUrl = pick(
    latest,
    [
      "comingCoverUrl",
      "comingcoverurl"
    ],
    ""
  );

  if (
    comingCoverEl &&
    comingCoverUrl
  ) {
    comingCoverEl.src =
      comingCoverUrl;
  }

  const countdownEl =
    document.getElementById(
      "homeComingCountdown"
    );

  if (!countdownEl) return;

  const targetUtc =
    utcMidnightMs(
      pick(
        latest,
        ["comingmusicdate"],
        ""
      )
    );

  if (!targetUtc) {
    countdownEl.textContent = "--";
    return;
  }

  function tick() {
    countdownEl.innerHTML =
      formatCountdownText(
        targetUtc - Date.now()
      );
  }

  tick();

  window.setInterval(
    tick,
    1000
  );
}

/* =========================
   DYNAMIC COVER RULES
   ========================= */

function setImgWithFallback(
  imgEl,
  preferredSrc,
  fallbackSrc
) {
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = fallbackSrc;
  };

  imgEl.src = preferredSrc;
}

function setDynamicCover(
  row,
  allRows
) {
  const coverEl =
    document.getElementById(
      "latestCover"
    );

  if (!coverEl) return;

  let src =
    CONFIG.covers.default;

  const latestRow =
    allRows?.[0] || null;

  const rowKey =
    normId(buildRowId(row));

  const latestKey =
    latestRow
      ? normId(buildRowId(latestRow))
      : "";

  const isLatestPage =
    !!latestRow &&
    rowKey &&
    latestKey &&
    rowKey === latestKey;

  /* ---------- LATEST ---------- */

  if (isLatestPage) {
    coverEl.src =
      CONFIG.covers.latest;

    coverEl.alt =
      "REWOD cover";

    return;
  }

  /* ---------- NON-LATEST ---------- */

  const tape = pick(
    row,
    ["tape"],
    ""
  ).toLowerCase();

  const feat = pick(
    row,
    ["feat"],
    ""
  ).trim();

  const artist = pick(
    row,
    ["newmusicartist", "artist"],
    ""
  ).toLowerCase().trim();

  const titleSlug =
    slugify(
      pick(
        row,
        ["newmusictitle", "title"]
      )
    );

  /* ---------- TAPE ---------- */

  if (tape === "x") {
    src =
      CONFIG.covers.tape;

    coverEl.src = src;
    coverEl.alt =
      "REWOD cover";

    return;
  }

  /* ---------- ORIGINAL / FEAT ---------- */

  const isOriginal =
    artist ===
    "original composition";

  const isFeat =
    !!feat;

  if (isOriginal || isFeat) {
    const preferred =
      `${CONFIG.newsletterDir}/` +
      `${titleSlug}` +
      `${CONFIG.newsletterExt}`;

    const fallback =
      isOriginal
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

  /* ---------- DEFAULT ---------- */

  coverEl.src =
    CONFIG.covers.default;

  coverEl.alt =
    "REWOD cover";
}

/* =========================
   MAIN
   ========================= */

async function initSong() {
  const res =
    await fetch(
      CONFIG.dataUrl,
      {
        cache: "no-store"
      }
    );

  const data =
    await res.json();

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return;
  }

  /* HOME BLOCKS */

  try {
    initHomeBlocks(data);
  } catch (e) {
    console.error(
      "home blocks error:",
      e
    );
  }

  /* PICK ROW BY ?id= */

  const wantedRaw =
    getQueryId();

  const wanted =
    normId(wantedRaw);

  let row = null;

  if (wanted) {
    row =
      data.find(
        r =>
          normId(r?.id) ===
          wanted
      ) ||

      data.find(
        r =>
          normId(r?.slug) ===
          wanted
      ) ||

      data.find(
        r =>
          normId(
            buildRowId(r)
          ) === wanted
      ) ||

      data.find(
        r =>
          isOriginalComposition(r) &&
          normId(
            slugify(
              pick(
                r,
                [
                  "newmusictitle",
                  "title"
                ]
              )
            )
          ) === wanted
      ) ||

      data.find(
        r =>
          normId(
            slugify(
              pick(
                r,
                [
                  "newmusicartist",
                  "artist"
                ]
              )
            ) +
            slugify(
              pick(
                r,
                [
                  "newmusictitle",
                  "title"
                ]
              )
            )
          ) === wanted
      );
  }

  if (!row) {
    row = data[0];
  }

  /* DYNAMIC COVER */

  setDynamicCover(
    row,
    data
  );

  /* SONG CONTENT */

  const titleEl =
    document.getElementById(
      "latestTitle"
    );

  const titleStr =
    buildTitle(row);

  if (titleEl) {
    titleEl.textContent =
      titleStr;
  }

  const isTape =
    pick(
      row,
      ["tape"],
      ""
    ).toLowerCase() === "x";

  setTapeMode(isTape);

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

  setDescr(row);

  /* BROWSER TAB TITLE */

  document.title =
    titleStr;
}

/*
 * FONTOS:
 * előbb bekötjük a cover figyelését,
 * utána indul az initSong().
 *
 * Így bármilyen cover kerül a #latestCover-re,
 * ugyanaz lesz az oldal háttere is.
 */
syncSongBackground();

initSong().catch(
  console.error
);