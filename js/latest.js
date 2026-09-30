/* =========================
   LATEST PAGE – JS
   TAPE + DESCR + SIGNATURE + DYNAMIC BACKGROUND
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png"
};

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


/* =========================
   DYNAMIC PAGE BACKGROUND
   Uses the ACTUAL loaded cover image
   ========================= */

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


/* =========================
   TAPE UI
   ========================= */

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


/* =========================
   DESCRIPTION + SIGNATURE
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


/* =========================
   MAIN INIT
   ========================= */

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

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return;
  }

  const row = data[0];


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


/* =========================
   START
   ========================= */

initLatest().catch(console.error);