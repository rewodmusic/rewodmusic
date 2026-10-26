/* =========================================================
   LATEST PAGE – REWOD

   Latest NON-DAILY music release
   + TAPE
   + DESCRIPTION
   + SIGNATURE
   + DYNAMIC BACKGROUND

   DAILY entries are completely ignored.
   ========================================================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png"
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
  const t = safeText(row.newmusictitle).trim();
  const f = safeText(row.feat).trim();
  const a = safeText(row.newmusicartist).trim();
  const tape = safeText(row.tape).trim().toLowerCase();

  if (tape === "x") return `${a} - ${t}`;
  if (f) return `REWOD ft. ${f} - ${t}`;

  return `REWOD - ${t}`;
}


/* =========================================================
   DAILY CHECK
   ========================================================= */

function isDaily(row) {
  return safeText(row.daily).trim().toLowerCase() === "x";
}


/* =========================================================
   DATE PARSER
   ========================================================= */

/*
 * Expected format:
 * YYYY_MM_DD
 *
 * Example:
 * 2026_10_26
 */

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

  // Reject invalid dates such as 2026_02_31
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

function pickLatestRelease(data) {

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  /* Remove ALL Daily entries */

  const regularReleases = data.filter(
    row => row && !isDaily(row)
  );

  if (regularReleases.length === 0) {
    return null;
  }

  /* Sort by release date, newest first */

  regularReleases.sort((a, b) => {

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

  return regularReleases[0];
}


/* =========================================================
   DYNAMIC PAGE BACKGROUND
   Uses the ACTUAL loaded cover image
   ========================================================= */

function setLatestBackgroundFromCover() {
  const cover = document.getElementById("latestCover");
  const bg = document.getElementById("latestPageBg");

  if (!cover || !bg) return;

  function applyBackground() {
    const src = cover.currentSrc || cover.src;

    if (!src) return;

    bg.style.backgroundImage = `url("${src}")`;
  }

  /*
   * If the image is already loaded,
   * apply it immediately.
   */
  if (cover.complete && cover.naturalWidth > 0) {
    applyBackground();
  } else {
    /*
     * Otherwise wait until the browser has
     * actually loaded the cover.
     */
    cover.addEventListener("load", applyBackground, {
      once: true
    });
  }
}


/* =========================================================
   TAPE UI
   ========================================================= */

function setTapeMode(isTape) {
  const root =
    document.querySelector(".latest-release") ||
    document.body;

  root.classList.toggle("is-tape", !!isTape);

  const rowSpotify =
    document.querySelector(".latest-release .service-row.spotify");

  const rowApple =
    document.querySelector(".latest-release .service-row.apple");

  const rowMMS =
    document.querySelector(".latest-release .service-row.mms");

  [rowSpotify, rowApple, rowMMS].forEach(el => {
    if (!el) return;

    el.style.display = "";
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

  const d = safeText(row.descr).trim();


  /* =========================
     NO DESCRIPTION
     ========================= */

  if (!d) {
    services.classList.remove("has-descr");

    wrap.hidden = true;

    if (wrap.parentElement) {
      _latestDescrNode = wrap;
      wrap.remove();
    }

    return;
  }


  /* =========================
     DESCRIPTION EXISTS
     ========================= */

  if (!wrap.parentElement) {
    services.appendChild(
      _latestDescrNode || wrap
    );
  }

  services.classList.add("has-descr");

  wrap.hidden = false;

  text.textContent =
    `"${d}"\n- REWOD`;


  /* =========================
     SIGNATURE
     ========================= */

  let sig =
    document.getElementById("latestSignature");

  if (!sig) {
    sig = document.createElement("img");

    sig.id = "latestSignature";
    sig.className = "latest-descr-signature";
    sig.alt = "REWOD signature";

    wrap.appendChild(sig);
  }

  const sigUrl =
    safeText(
      row.signatureUrl ||
      row.signatureurl
    ).trim() ||
    CONFIG.signatureUrl;

  sig.src = sigUrl;
  sig.loading = "lazy";
  sig.decoding = "async";
}


/* =========================================================
   MAIN INIT
   ========================================================= */

async function initLatest() {

  /* LOAD ADMIN JSON */

  const res = await fetch(
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

  const data = await res.json();

  /* Select latest NON-DAILY release */

  const row = pickLatestRelease(data);

  if (!row) {
    console.warn(
      "Latest Release: No non-daily releases found."
    );
    return;
  }


  /* =========================
     COVER
     ========================= */

  const coverEl =
    document.getElementById("latestCover");

  const coverUrl =
    safeText(row.coverUrl).trim();

  if (coverEl && coverUrl) {

    /*
     * FIRST attach the load listener.
     *
     * This is important because we want
     * the background to use the image
     * AFTER the browser has loaded it.
     */

    coverEl.addEventListener(
      "load",
      () => {
        setLatestBackgroundFromCover();
      },
      {
        once: true
      }
    );

    /*
     * THEN change the cover URL.
     */

    coverEl.src = coverUrl;


    /*
     * Browser cache case:
     * if the image is already available,
     * load may complete immediately.
     */

    if (
      coverEl.complete &&
      coverEl.naturalWidth > 0
    ) {
      setLatestBackgroundFromCover();
    }

  } else {

    /*
     * Fallback:
     * use whatever image is already
     * inside #latestCover.
     */

    setLatestBackgroundFromCover();
  }


  /* =========================
     TITLE
     ========================= */

  const titleEl =
    document.getElementById("latestTitle");

  if (titleEl) {
    titleEl.textContent =
      buildTitle(row);
  }


  /* =========================
     TAPE
     ========================= */

  const isTape =
    safeText(row.tape)
      .trim()
      .toLowerCase() === "x";

  setTapeMode(isTape);


  /* =========================
     SERVICE BUTTONS
     ========================= */

  setBtn(
    document.getElementById("btnSpotify"),
    row.spotifyurl
  );

  setBtn(
    document.getElementById("btnApple"),
    row.appleurl
  );

  setBtn(
    document.getElementById("btnYouTube"),
    row.youtubeurl
  );

  setBtn(
    document.getElementById("btnMMS"),
    row.mymusicurl
  );


  /* =========================
     KO-FI
     ========================= */

  const kofiBtn =
    document.getElementById("btnKofi");

  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.target = "_blank";
    kofiBtn.rel = "noopener";
  }


  /* =========================
     DESCRIPTION + SIGNATURE
     ========================= */

  setDescr(row);
}


/* =========================================================
   START
   ========================================================= */

initLatest().catch(console.error);