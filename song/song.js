/* =========================
   SONG PAGE – JS (query id + linktree) ✅ SAFE
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png",
  openLinksInNewTab: false // ✅ itt tudod szabályozni
};

function safeText(s) {
  return (s ?? "").toString();
}
function hasText(s) {
  return safeText(s).trim().length > 0;
}

/** "Bruno Mars" -> "brunomars", "Die With A Smile" -> "diewithasmile" */
function compactSlug(s) {
  return safeText(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
function rowId(row) {
  const a = compactSlug(row.newmusicartist);
  const t = compactSlug(row.newmusictitle);
  if (!a || !t) return "";
  return `${a}-${t}`;
}
function getQueryId() {
  const p = new URLSearchParams(location.search);
  return safeText(p.get("id")).trim().toLowerCase();
}

function setBtn(btn, url, forceSameTab = true) {
  if (!btn) return;
  const u = safeText(url).trim();

  if (u && u !== "#") {
    btn.href = u;

    // ✅ ne nyisson új ablakot (alapból)
    if (CONFIG.openLinksInNewTab && !forceSameTab) {
      btn.target = "_blank";
      btn.rel = "noopener";
    } else {
      btn.removeAttribute("target");
      btn.removeAttribute("rel");
    }

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

/* --- TAPE UI --- */
function setTapeMode(isTape) {
  const root = document.querySelector(".latest-release") || document.body;
  root.classList.toggle("is-tape", !!isTape);

  const rowSpotify = document.querySelector(".latest-release .service-row.spotify");
  const rowApple   = document.querySelector(".latest-release .service-row.apple");
  const rowMMS     = document.querySelector(".latest-release .service-row.mms");

  [rowSpotify, rowApple, rowMMS].forEach(el => { if (el) el.style.display = ""; });

  if (isTape) {
    if (rowSpotify) rowSpotify.style.display = "none";
    if (rowApple)   rowApple.style.display = "none";
    if (rowMMS)     rowMMS.style.display = "none";
  }
}

/* --- DESCR block --- */
let _latestDescrNode = null;

function setDescr(row) {
  const services = document.getElementById("latestServices");
  const wrap = document.getElementById("latestDescr");
  const text = document.getElementById("latestDescrText");
  if (!services || !wrap || !text) return;

  const d = safeText(row.descr).trim();

  if (!d) {
    services.classList.remove("has-descr");
    wrap.hidden = true;
    if (wrap.parentElement) {
      _latestDescrNode = wrap;
      wrap.remove();
    }
    return;
  }

  if (!wrap.parentElement) services.appendChild(_latestDescrNode || wrap);
  services.classList.add("has-descr");
  wrap.hidden = false;

  text.textContent = `"${d}"\n- REWOD`;

  let sig = document.getElementById("latestSignature");
  if (!sig) {
    sig = document.createElement("img");
    sig.id = "latestSignature";
    sig.className = "latest-descr-signature";
    sig.alt = "REWOD signature";
    wrap.appendChild(sig);
  }

  const sigUrl = safeText(row.signatureUrl || row.signatureurl).trim() || CONFIG.signatureUrl;
  sig.src = sigUrl;
  sig.loading = "lazy";
  sig.decoding = "async";
}

/* -------- HOME blocks helpers (only if elements exist) -------- */

function initHomeBlocks(rows) {
  // ✅ csak akkor fusson, ha tényleg home elemek vannak ezen az oldalon
  const hasHome =
    document.getElementById("homeLatestTitle") ||
    document.getElementById("homeComingTitle") ||
    document.getElementById("homeLatestListenBtn");

  if (!hasHome) return;

  const data = Array.isArray(rows) ? (rows[0] || {}) : (rows || {});

  const latestTitleEl = document.getElementById("homeLatestTitle");
  const latestArtistEl = document.getElementById("homeLatestArtist");
  if (latestTitleEl) latestTitleEl.textContent = safeText(data.newmusictitle).trim();
  if (latestArtistEl) latestArtistEl.textContent = safeText(data.newmusicartist).trim();

  const btn = document.getElementById("homeLatestListenBtn");
  if (btn) btn.href = "/latest/";
}

/* -------- MAIN -------- */

async function initSong() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return;

  // ✅ home block csak ha van ilyen a DOM-ban
  initHomeBlocks(rows);

  // ✅ find song by ?id=
  const qid = getQueryId();
  let row = rows[0];

  if (qid) {
    const found = rows.find(r => rowId(r) === qid);
    if (found) row = found;
  }

  // title
  const titleEl = document.getElementById("latestTitle");
  if (titleEl) titleEl.textContent = buildTitle(row);

  // tape
  const isTape = safeText(row.tape).trim().toLowerCase() === "x";
  setTapeMode(isTape);

  // buttons (✅ same tab by default)
  setBtn(document.getElementById("btnSpotify"), row.spotifyurl, true);
  setBtn(document.getElementById("btnApple"),  row.appleurl, true);
  setBtn(document.getElementById("btnYouTube"), row.youtubeurl, true);
  setBtn(document.getElementById("btnMMS"),    row.mymusicurl, true);

  const kofiBtn = document.getElementById("btnKofi");
  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.removeAttribute("target");
    kofiBtn.removeAttribute("rel");
  }

  // descr + signature
  setDescr(row);

  // page <title>
  document.title = buildTitle(row);
}

initSong().catch(console.error);