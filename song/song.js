/* =========================
   SONG PAGE – dynamic by ?id=
   Based on latest.js (SAFE)
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png"
};

function safeText(s) { return (s ?? "").toString(); }
function hasText(s) { return safeText(s).trim().length > 0; }

function slugify(s) {
  return safeText(s)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// rugalmas mező-lookup (mert nálad többféle kulcsnév is lehet)
function pick(row, keys, fallback = "") {
  for (const k of keys) {
    if (hasText(row?.[k])) return safeText(row[k]).trim();
  }
  return fallback;
}

// id = "artist-title"
function buildRowId(row) {
  // ezekből próbálunk dolgozni (ha később átnevezed a JSON kulcsokat, itt csak bővítesz)
  const artist = pick(row, ["artist", "newmusicartist", "musicartist", "comingmusicartist"]);
  const title  = pick(row, ["title", "newmusictitle", "musictitle", "comingmusictitle"]);
  return `${slugify(artist)}-${slugify(title)}`.replace(/^-+|-+$/g, "");
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
  const a = pick(row, ["artist", "newmusicartist"], "REWOD");
  const tape = pick(row, ["tape"], "").toLowerCase();

  // ha "original composition" van nálad artistként, akkor is szép marad
  if (tape === "x") return `${a} - ${t}`;
  if (f) return `REWOD ft. ${f} - ${t}`;
  // ha az artist nem REWOD (cover), akkor is REWOD-ozzuk (ahogy a latest oldalon)
  return `REWOD - ${t}`;
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
  const services = document.getElementById("latestServices");
  const wrap = document.getElementById("latestDescr");
  const text = document.getElementById("latestDescrText");

  if (!services || !wrap || !text) return;

  const d = pick(row, ["descr", "description"], "");

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

  const sigUrl = pick(row, ["signatureUrl", "signatureurl"], CONFIG.signatureUrl);
  sig.src = sigUrl;
  sig.loading = "lazy";
  sig.decoding = "async";
}

function getQueryId() {
  const params = new URLSearchParams(window.location.search);
  return safeText(params.get("id")).trim();
}

async function initSong() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return;

  const wantedId = getQueryId();

  // keresés: vagy explicit row.id / row.slug, vagy generált artist-title
  let row =
    data.find(r => safeText(r.id).trim() === wantedId) ||
    data.find(r => safeText(r.slug).trim() === wantedId) ||
    data.find(r => buildRowId(r) === wantedId);

  // fallback: ha nincs id vagy nem találjuk, mutassuk a legfrissebbet (data[0])
  if (!row) row = data[0];

  // cover
  const coverEl = document.getElementById("latestCover");
  const coverUrl = pick(row, ["coverUrl", "cover", "image", "img"], "");
  if (coverEl && coverUrl) coverEl.src = coverUrl;

  // title
  const titleEl = document.getElementById("latestTitle");
  if (titleEl) titleEl.textContent = buildTitle(row);

  // tape
  const isTape = pick(row, ["tape"], "").toLowerCase() === "x";
  setTapeMode(isTape);

  // buttons (több lehetséges kulcsnévvel)
  setBtn(document.getElementById("btnSpotify"), pick(row, ["spotifyurl", "spotifyUrl", "spotify"], ""));
  setBtn(document.getElementById("btnApple"),  pick(row, ["appleurl", "appleUrl", "apple"], ""));
  setBtn(document.getElementById("btnYouTube"), pick(row, ["youtubeurl", "youtubeUrl", "youtube"], ""));
  setBtn(document.getElementById("btnMMS"),    pick(row, ["mymusicurl", "mymusicUrl", "sheeturl", "sheetUrl"], ""));

  const kofiBtn = document.getElementById("btnKofi");
  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.target = "_blank";
    kofiBtn.rel = "noopener";
  }

  setDescr(row);
}

initSong().catch(console.error);