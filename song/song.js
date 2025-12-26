/* =========================
   SONG PAGE – JS (query id + linktree + home blocks) ✅ SAFE
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

/** "Bruno Mars" -> "brunomars", "Die With A Smile" -> "diewithasmile" */
function compactSlug(s) {
  return safeText(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "") // keep only a-z0-9
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

/* -------- HOME blocks helpers (latest/upcoming) -------- */

function buildArtistLine(a1, a2) {
  const A = safeText(a1).trim();
  const B = safeText(a2).trim();
  if (A && B) return `${A}, ${B}`;
  return A || "";
}
function buildTitleWithFeat(title, feat) {
  const t = safeText(title).trim();
  const f = safeText(feat).trim();
  if (!t) return "";
  return f ? `${t} ft. ${f}` : t;
}
function utcMidnightMs(dateStr) {
  const s = safeText(dateStr).trim();
  if (!s) return null;
  const normalized = s.replace(/_/g, "-");
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  return Date.UTC(y, mo, da, 0, 0, 0);
}
function formatCountdownText(msLeft) {
  if (msLeft <= 0) return "Out now";
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return `${days} days ${hours} hours<br>${minutes} minutes ${seconds} seconds`;
}

function initHomeBlocks(rows) {
  const data = Array.isArray(rows) ? (rows[0] || {}) : (rows || {});

  // LATEST (home)
  const latestTitle = buildTitleWithFeat(data.newmusictitle, data.feat);
  const latestArtist = buildArtistLine(data.newmusicartist, data.newmusicartist2);

  const latestTitleEl = document.getElementById("homeLatestTitle");
  const latestArtistEl = document.getElementById("homeLatestArtist");
  if (latestTitleEl) latestTitleEl.textContent = latestTitle || "";
  if (latestArtistEl) latestArtistEl.textContent = latestArtist || "";

  const latestCoverEl = document.getElementById("homeLatestCover");
  if (latestCoverEl && hasText(data.coverUrl)) latestCoverEl.src = data.coverUrl;

  const btn = document.getElementById("homeLatestListenBtn");
  if (btn) {
    // ha akarod: mindig a globál "latest/" legyen, vagy lehetne id-link is.
    btn.href = "/latest/";
    btn.style.opacity = "";
    btn.style.pointerEvents = "";
  }

  // UPCOMING (home)
  const comingTitle = buildTitleWithFeat(data.comingmusictitle, data.comingfeat);
  const comingArtist = safeText(data.comingmusicartist).trim();

  const comingTitleEl = document.getElementById("homeComingTitle");
  const comingArtistEl = document.getElementById("homeComingArtist");
  if (comingTitleEl) comingTitleEl.textContent = comingTitle || "";
  if (comingArtistEl) comingArtistEl.textContent = comingArtist || "";

  const comingCoverEl = document.getElementById("homeComingCover");
  if (comingCoverEl && hasText(data.comingCoverUrl)) comingCoverEl.src = data.comingCoverUrl;

  const countdownEl = document.getElementById("homeComingCountdown");
  if (!countdownEl) return;

  const targetUtc = utcMidnightMs(data.comingmusicdate);
  if (!targetUtc) {
    countdownEl.textContent = "--";
    return;
  }

  function tick() {
    const msLeft = targetUtc - Date.now();
    countdownEl.innerHTML = formatCountdownText(msLeft);
  }
  tick();
  window.setInterval(tick, 1000);
}

/* -------- MAIN -------- */

async function initSong() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return;

  // 1) fill home blocks (latest/upcoming/playlists)
  initHomeBlocks(rows);

  // 2) find song by ?id=
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

  // buttons
  setBtn(document.getElementById("btnSpotify"), row.spotifyurl);
  setBtn(document.getElementById("btnApple"),  row.appleurl);
  setBtn(document.getElementById("btnYouTube"), row.youtubeurl);
  setBtn(document.getElementById("btnMMS"),    row.mymusicurl);

  const kofiBtn = document.getElementById("btnKofi");
  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.target = "_blank";
    kofiBtn.rel = "noopener";
  }

  // descr + signature
  setDescr(row);

  // page <title> (browser tab)
  document.title = buildTitle(row);
}

initSong().catch(console.error);