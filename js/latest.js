/* LATEST PAGE – reads FIRST ROW from /data/latest.json (no date sorting) */

const CONFIG = {
  dataUrl: "data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic"
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

  if (u.length > 0 && u !== "#") {
    btn.href = u;
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  } else {
    // “disabled” state (still looks same, but non-clickable)
    btn.href = "#";
    btn.style.opacity = "0.45";
    btn.style.pointerEvents = "none";
  }
}

function buildTitle(title, feat) {
  const t = safeText(title).trim();
  const f = safeText(feat).trim();

  // REWOD ft. X - Title  (if feat exists)
  if (f.length > 0) return `REWOD ft. ${f} - ${t}`;
  return `REWOD - ${t}`;
}

async function initLatest() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) return;

  // IMPORTANT: always FIRST row
  const row = data[0] || {};

  // cover
  const coverEl = document.getElementById("latestCover");
  if (coverEl && hasText(row.coverUrl)) coverEl.src = row.coverUrl;

  // title
  const titleEl = document.getElementById("latestTitle");
  if (titleEl) titleEl.textContent = buildTitle(row.newmusictitle, row.feat);

  // links
  setBtn(document.getElementById("btnSpotify"), row.spotifyurl);
  setBtn(document.getElementById("btnApple"), row.appleurl);
  setBtn(document.getElementById("btnYouTube"), row.youtubeurl);
  setBtn(document.getElementById("btnMMS"), row.mymusicurl);

  // Ko-fi always fixed
  const kofiBtn = document.getElementById("btnKofi");
  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.target = "_blank";
    kofiBtn.rel = "noopener";
    kofiBtn.style.opacity = "1";
    kofiBtn.style.pointerEvents = "auto";
  }
}

initLatest().catch(console.error);