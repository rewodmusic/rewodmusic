/* =========================
   SONG PAGE – JS (LINKTREE + HOME SECTIONS) ✅ SAFE
   /song/?id=bruno-mars-die-with-a-smile
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

/* --- slug/id helpers --- */
function slugify(str) {
  const s = safeText(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove accents

  return s
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function rowId(row) {
  const a = safeText(row.newmusicartist).trim();
  const t = safeText(row.newmusictitle).trim();
  return slugify(`${a}-${t}`);
}

function getQueryId() {
  const p = new URLSearchParams(window.location.search);
  return safeText(p.get("id")).trim();
}

/* --- TAPE UI: hide/show rows safely --- */
function setTapeMode(isTape) {
  const root = document.querySelector(".latest-release") || document.body;
  root.classList.toggle("is-tape", !!isTape);

  const rowSpotify = document.querySelector(".latest-release .service-row.spotify");
  const rowApple   = document.querySelector(".latest-release .service-row.apple");
  const rowMMS     = document.querySelector(".latest-release .service-row.mms");

  [rowSpotify, rowApple, rowMMS].forEach(el => {
    if (!el) return;
    el.style.display = "";
  });

  if (isTape) {
    if (rowSpotify) rowSpotify.style.display = "none";
    if (rowApple)   rowApple.style.display = "none";
    if (rowMMS)     rowMMS.style.display = "none";
  }
}

/* --- DESCR block: DOM remove/restore + hidden fix + signature --- */
let _latestDescrNode = null;

function setDescr(row) {
  const services = document.getElementById("latestServices"); // gray box
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

  if (!wrap.parentElement) {
    services.appendChild(_latestDescrNode || wrap);
  }

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

/* --- HOME releases helpers --- */
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

/**
 * Countdown to UTC 00:00
 * Accepts BOTH: YYYY-MM-DD and YYYY_MM_DD
 */
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

function renderHomeSections(homeRow) {
  if (!homeRow) return;

  // LATEST
  const latestTitle = buildTitleWithFeat(homeRow.newmusictitle, homeRow.feat);
  const latestArtist = buildArtistLine(homeRow.newmusicartist, homeRow.newmusicartist2);

  const homeLatestTitleEl = document.getElementById("homeLatestTitle");
  const homeLatestArtistEl = document.getElementById("homeLatestArtist");
  const homeLatestListenBtn = document.getElementById("homeLatestListenBtn");

  if (homeLatestTitleEl) homeLatestTitleEl.textContent = latestTitle || "";
  if (homeLatestArtistEl) homeLatestArtistEl.textContent = latestArtist || "";
  if (homeLatestListenBtn) homeLatestListenBtn.href = "/latest/";

  // UPCOMING
  const comingTitle = buildTitleWithFeat(homeRow.comingmusictitle, homeRow.comingfeat);
  const comingArtist = safeText(homeRow.comingmusicartist).trim();

  const homeComingTitleEl = document.getElementById("homeComingTitle");
  const homeComingArtistEl = document.getElementById("homeComingArtist");
  const homeCountdownEl = document.getElementById("homeComingCountdown");

  if (homeComingTitleEl) homeComingTitleEl.textContent = comingTitle || "";
  if (homeComingArtistEl) homeComingArtistEl.textContent = comingArtist || "";

  if (!homeCountdownEl) return;

  const targetUtc = utcMidnightMs(homeRow.comingmusicdate);
  if (!targetUtc) {
    homeCountdownEl.textContent = "--";
    return;
  }

  function tick() {
    const msLeft = targetUtc - Date.now();
    homeCountdownEl.innerHTML = formatCountdownText(msLeft);
  }

  tick();
  window.setInterval(tick, 1000);
}

function renderSong(row) {
  if (!row) return;

  // title
  const titleEl = document.getElementById("latestTitle");
  const titleText = buildTitle(row);
  if (titleEl) titleEl.textContent = titleText;

  // (nice to have) browser tab title
  if (titleText) document.title = `${titleText} – REWOD`;

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
}

async function initSong() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) return;

  // HOME sections always use FIRST row (same as Home logic)
  renderHomeSections(rows[0]);

  // SONG row by ?id=
  const id = getQueryId();
  let row = rows[0];

  if (id) {
    const found = rows.find(r => rowId(r) === id);
    if (found) row = found;
  }

  renderSong(row);
}

initSong().catch(console.error);