const DATA_URL = "/data/admin.json";

function safeText(v) {
  return (v ?? "").toString().trim();
}

function buildArtistLine(a1, a2) {
  const A = safeText(a1);
  const B = safeText(a2);
  if (A && B) return `${A}, ${B}`;
  return A || "";
}

function buildTitleWithFeat(title, feat) {
  const t = safeText(title);
  const f = safeText(feat);
  if (!t) return "";
  return f ? `${t} ft. ${f}` : t;
}

/**
 * Countdown to UTC 00:00
 * Accepts BOTH: YYYY-MM-DD and YYYY_MM_DD
 */
function utcMidnightMs(dateStr) {
  const s = safeText(dateStr);
  if (!s) return null;

  const normalized = s.replace(/_/g, "-");
  const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);

  return Date.UTC(y, mo, da, 0, 0, 0);
}

/**
 * ✅ SIMPLE TEXT (no HTML)
 * Example: "42 days 19 hours 10 minutes 41 seconds"
 */
function formatCountdownText(msLeft) {
  if (msLeft <= 0) return "Out now";

  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return (
    `${days} days ${hours} hours<br>` +
    `${minutes} minutes ${seconds} seconds`
  );
}

async function init() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const rows = await res.json();

  // ✅ ALWAYS FIRST ROW
  const data = Array.isArray(rows) ? (rows[0] || {}) : (rows || {});

  // LATEST
  const latestTitle = buildTitleWithFeat(data.newmusictitle, data.feat);
  const latestArtist = buildArtistLine(data.newmusicartist, data.newmusicartist2);

  const latestTitleEl = document.getElementById("latestTitle");
  const latestArtistEl = document.getElementById("latestArtist");

  if (latestTitleEl) latestTitleEl.textContent = latestTitle || "";
  if (latestArtistEl) latestArtistEl.textContent = latestArtist || "";

  const latestListenBtn = document.getElementById("latestListenBtn");
  if (latestListenBtn) {
    latestListenBtn.href = "latest.html";
    latestListenBtn.style.opacity = "";
    latestListenBtn.style.pointerEvents = "";
  }

  // UPCOMING
  const comingTitle = buildTitleWithFeat(data.comingmusictitle, data.comingfeat);
  const comingArtist = safeText(data.comingmusicartist);

  const comingTitleEl = document.getElementById("comingTitle");
  const comingArtistEl = document.getElementById("comingArtist");
  const countdownEl = document.getElementById("comingCountdown");

  if (comingTitleEl) comingTitleEl.textContent = comingTitle || "";
  if (comingArtistEl) comingArtistEl.textContent = comingArtist || "";

  // COUNTDOWN
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

init().catch(console.error);