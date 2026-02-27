/* =========================
   SONG PAGE – dynamic by ?id=
   + HOME blocks (latest/upcoming) SAFE
   + PROFILE IMAGE on top (always)
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png",
  profileCoverUrl: "/img/profile.jpg"
};

function safeText(s) { return (s ?? "").toString(); }
function hasText(s) { return safeText(s).trim().length > 0; }

/** erős normalizálás id-k összehasonlításához */
function normId(s) {
  return safeText(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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

function pick(row, keys, fallback = "") {
  for (const k of keys) {
    if (hasText(row?.[k])) return safeText(row[k]).trim();
  }
  return fallback;
}

/* =========================
   🔧 NEW: feat display rule
   ========================= */

function shouldAppendFeat(artist) {
  return !safeText(artist).toLowerCase().includes("rewod");
}

function buildTitleWithFeat(title, feat, artist) {
  if (!hasText(feat)) return title;
  if (!shouldAppendFeat(artist)) return title;
  return `${title} ft. ${feat}`;
}

/* ========================= */

function utcMidnightMs(dateStr) {
  const s = safeText(dateStr).trim();
  if (!s) return null;
  const normalized = s.replace(/_/g, "-");
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
}

function formatCountdownText(msLeft) {
  if (msLeft <= 0) return "Out now";
  const t = Math.floor(msLeft / 1000);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${d} days ${h} hours<br>${m} minutes ${s} seconds`;
}

/* =========================
   HOME BLOCKS (UPDATED)
   ========================= */

function initHomeBlocks(rows) {
  if (!rows?.length) return;
  const latest = rows[0];

  // ---- LATEST ----
  const artist = pick(latest, ["newmusicartist"]);
  const title  = pick(latest, ["newmusictitle"]);
  const feat   = pick(latest, ["feat"]);

  const latestArtistEl = document.getElementById("homeLatestArtist");
  const latestTitleEl  = document.getElementById("homeLatestTitle");

  if (latestArtistEl) latestArtistEl.textContent = artist;
  if (latestTitleEl)  latestTitleEl.innerHTML =
    buildTitleWithFeat(title, feat, artist);

  // ---- UPCOMING ----
  const comingArtist = pick(latest, ["comingmusicartist"]);
  const comingTitle  = pick(latest, ["comingmusictitle"]);
  const comingFeat   = pick(latest, ["comingfeat"]);

  const comingArtistEl = document.getElementById("homeComingArtist");
  const comingTitleEl  = document.getElementById("homeComingTitle");

  if (comingArtistEl) comingArtistEl.textContent = comingArtist;
  if (comingTitleEl)  comingTitleEl.innerHTML =
    buildTitleWithFeat(comingTitle, comingFeat, comingArtist);

  // countdown
  const countdownEl = document.getElementById("homeComingCountdown");
  const targetUtc = utcMidnightMs(pick(latest, ["comingmusicdate"]));
  if (countdownEl && targetUtc) {
    const tick = () =>
      countdownEl.innerHTML = formatCountdownText(targetUtc - Date.now());
    tick();
    setInterval(tick, 1000);
  }
}

/* =========================
   MAIN
   ========================= */

async function initSong() {
  const coverEl = document.getElementById("latestCover");
  if (coverEl) coverEl.src = CONFIG.profileCoverUrl;

  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) return;

  initHomeBlocks(data);
}

initSong().catch(console.error);