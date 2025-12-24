/* =========================
   MEDIA PAGE – Stable state machine
   data/media.json alapján
   + fade reflow before scroll
   + HEIGHT LOCK (prevents footer jump)
   ========================= */

const MEDIA_JSON = "data/media.json";

const FOLDERS = {
  photo: "img/0_media/photo/",
  art: "img/0_media/art/",
  short: "img/0_media/short/",
};

// preferencia sorrend (ha több formátum is létezik)
const EXT = {
  photo: ["jpg","jpeg","png","webp","JPG","JPEG","PNG","WEBP"],
  art:   ["mp4","mov","MP4","MOV"],
  short: ["mp4","mov","MP4","MOV"],
};

// icons
const ICON_MUTED = "img/audio-muted.png";
const ICON_ACTIVE = "img/audio-active.png";

let mediaData = [];
let activeType = ""; // "", "photo", "art", "short"

// SHORT audio state (only one video audible)
let currentSound = { videoEl: null };

// transition lock (ne lehessen duplán kattintani)
let isTransitioning = false;

document.addEventListener("DOMContentLoaded", () => {
  // jelöljük: van JS (page enter / no-fouc jelleghez)
  document.documentElement.classList.add("js");
  initMedia().catch(console.error);
});

/* ---------- helpers ---------- */

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("_").map(Number);
  return new Date(y, (m - 1), d);
}

function daysDiffFromToday(dateObj) {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const ms = a - b;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatLastUpdated(dateKey) {
  const d = parseDateKey(dateKey);
  const diff = daysDiffFromToday(d);
  if (diff === 0) return "Last updated today";
  if (diff === 1) return "Last updated yesterday";
  if (diff > 1) return `Last updated ${diff} days ago`;
  if (diff === -1) return "Last updated tomorrow";
  return `Last updated ${Math.abs(diff)} days from now`;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}

async function urlExists(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function findExistingFile(basePath, dateKey, extList) {
  for (const ext of extList) {
    const url = `${basePath}${dateKey}.${ext}`;
    if (await urlExists(url)) return url;
  }
  return null;
}

function isDesktop() {
  return window.matchMedia("(min-width: 769px)").matches;
}

function smoothScrollTo(targetY, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start;

  function step(ts) {
    if (!start) start = ts;
    const t = ts - start;
    const p = Math.min(t / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
    window.scrollTo(0, startY + diff * ease);
    if (p < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function scrollToTopDesktopOnly() {
  if (!isDesktop()) return;      // ✅ MOBILE: nincs scroll-to-top
  smoothScrollTo(0, 1100);       // 👈 sebesség (ms)
}

function getItemsForType(type) {
  const filtered = mediaData
    .filter(it => (it?.[type] || "").toLowerCase() === "x")
    .filter(it => typeof it.date === "string" && it.date.includes("_"));

  filtered.sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date));
  return filtered;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => r()));
}

/* ---------- HEIGHT LOCK (prevents footer jump) ---------- */

/**
 * Lockolja a MEDIA tartalom szekció magasságát az átmenet idejére,
 * hogy a hidden=true ne csukja össze a layoutot (footer felugrás bug).
 */
function lockMediaHeight() {
  const wrap = document.querySelector(".media-wrap");
  if (!wrap) return () => {};

  const h = Math.ceil(wrap.getBoundingClientRect().height);
  // min-height lock: nem esik össze a szekció
  wrap.style.minHeight = `${h}px`;
  wrap.classList.add("is-height-locked");

  return () => {
    wrap.style.minHeight = "";
    wrap.classList.remove("is-height-locked");
  };
}

/* ---------- MEDIA fade transition (before scroll) ---------- */

function getMediaGridEl() {
  return document.getElementById("mediaGrid") || document.querySelector(".media-wrap");
}

/**
 * Fade-out -> DOM update -> Fade-in
 * + Height lock a reflow idejére, hogy a footer ne ugorjon fel.
 * A scroll-t CSAK ezután hívjuk.
 */
async function withMediaReflowTransition(runDomUpdate) {
  const grid = getMediaGridEl();

  const isDesk = isDesktop();
  const reduce = prefersReducedMotion();

  // timingok
  const DESK_OUT = 520;
  const DESK_IN  = 1920;

  const MOB_OUT  = 280;   // finom, gyors
  const MOB_IN   = 2060;

  // ha nincs grid vagy reduced motion -> sima DOM update
  if (!grid || reduce) {
    const y = window.scrollY;          // ✅ mobil “ne csússzon”
    await runDomUpdate();
    if (!isDesk) window.scrollTo(0, y);
    return;
  }

  // ha már fut, ne engedjük a spam-et
  if (isTransitioning) return;
  isTransitioning = true;

  // ✅ lock BEFORE we hide/show anything (footer ne ugorjon)
  const unlock = lockMediaHeight();
  const yBefore = window.scrollY;

  try {
    // ===== MOBILE: kisebb fade, nincs desktop-scroll logika =====
    if (!isDesk) {
      grid.classList.add("is-media-fading-out");
      await nextFrame();
      await wait(MOB_OUT);

      await runDomUpdate();

      grid.offsetHeight; // reflow kick
      grid.classList.remove("is-media-fading-out");
      grid.classList.add("is-media-fading-in");

      // ✅ ne gördüljön le a DOM reflow miatt
      window.scrollTo(0, yBefore);

      await wait(MOB_IN);
      grid.classList.remove("is-media-fading-in");
      await nextFrame();
      return;
    }

    // ===== DESKTOP: a te jelenlegi stabil verziód =====
    grid.classList.add("is-media-fading-out");
    await nextFrame();
    await wait(DESK_OUT);

    await runDomUpdate();

    grid.offsetHeight;

    grid.classList.remove("is-media-fading-out");
    grid.classList.add("is-media-fading-in");

    await wait(DESK_IN);
    grid.classList.remove("is-media-fading-in");

    await nextFrame();
  } finally {
    unlock();
    isTransitioning = false;
  }
}

/* ---------- DOM setters ---------- */

async function setMainPreview(type, item) {
  const updatedEl = document.getElementById(`${type}Updated`);
  const mainEl = document.getElementById(`${type}Main`);
  if (!updatedEl || !mainEl) return;

  if (!item) {
    updatedEl.textContent = "Last updated —";
    mainEl.innerHTML = "";
    return;
  }

  updatedEl.textContent = formatLastUpdated(item.date);

  const fileUrl = await findExistingFile(FOLDERS[type], item.date, EXT[type]);
  mainEl.innerHTML = "";
  if (!fileUrl) return;

  if (type === "photo") {
    const img = document.createElement("img");
    img.src = fileUrl;
    img.alt = "Latest photo";
    img.loading = "lazy";
    mainEl.appendChild(img);
  } else {
    const v = document.createElement("video");
    v.src = fileUrl;
    v.autoplay = true;
    v.loop = true;
    v.playsInline = true;
    v.muted = true;
    v.preload = "metadata";
    mainEl.appendChild(v);

    if (type === "short") {
      const btn = makeAudioButton(v);
      mainEl.appendChild(btn);
    }
  }
}

function showMainHideMore(type) {
  const mainEl = document.getElementById(`${type}Main`);
  const moreEl = document.getElementById(`${type}More`);
  if (mainEl) mainEl.hidden = false;
  if (moreEl) {
    moreEl.hidden = true;
    moreEl.innerHTML = "";
  }
}

function showMoreHideMain(type) {
  const mainEl = document.getElementById(`${type}Main`);
  const moreEl = document.getElementById(`${type}More`);
  if (mainEl) mainEl.hidden = true;     // ✅ no duplication
  if (moreEl) moreEl.hidden = false;
}

function setButtonsClosed(type) {
  const loadBtn = document.getElementById(`${type}LoadMore`);
  const ctaBtn = document.getElementById(`${type}CTA`);
  if (loadBtn) loadBtn.style.display = "";
  if (ctaBtn) {
    ctaBtn.style.display = "none";
    ctaBtn.classList.remove("is-visible"); // ✅ CTA anim reset
  }
}

function setButtonsOpen(type) {
  const loadBtn = document.getElementById(`${type}LoadMore`);
  const ctaBtn = document.getElementById(`${type}CTA`);
  if (loadBtn) loadBtn.style.display = "none";
  if (ctaBtn) {
    ctaBtn.style.display = "inline-flex";
    // ✅ CTA appear anim (CSS)
    requestAnimationFrame(() => ctaBtn.classList.add("is-visible"));
  }
}

function clearExpanded(type) {
  showMainHideMore(type);
  setButtonsClosed(type);
}

async function renderTop3IntoMore(type, items) {
  const moreEl = document.getElementById(`${type}More`);
  if (!moreEl) return;

  const top3 = items.slice(0, 3);
  moreEl.innerHTML = "";

  for (const it of top3) {
    const cell = document.createElement("div");
    cell.className = "media-cell";

    const fileUrl = await findExistingFile(FOLDERS[type], it.date, EXT[type]);
    if (!fileUrl) {
      cell.style.minHeight = "40px";
      moreEl.appendChild(cell);
      continue;
    }

    if (type === "photo") {
      const img = document.createElement("img");
      img.src = fileUrl;
      img.alt = "Photo";
      img.loading = "lazy";
      cell.appendChild(img);
    } else {
      const v = document.createElement("video");
      v.src = fileUrl;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      v.muted = true;
      v.preload = "metadata";
      cell.appendChild(v);

      if (type === "short") {
        const btn = makeAudioButton(v);
        cell.appendChild(btn);
      }
    }

    moreEl.appendChild(cell);
  }
}

/* ---------- SHORT audio system ---------- */

function makeAudioButton(videoEl) {
  const btn = document.createElement("button");
  btn.className = "audio-toggle";
  btn.type = "button";
  btn.setAttribute("aria-label", "Toggle audio");

  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = ICON_MUTED;
  btn.appendChild(icon);

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.blur(); // iOS scroll bug ellen

  // ✅ iOS/Safari: ne fókuszoljon az <a>, mert attól lejjebb scrollolhat
  btn.blur();

  if (isTransitioning) return;
  // ✅ fade mindkét platformon, de scroll csak desktopon
  await withMediaReflowTransition(async () => {
    await openTypeDomOnly(type);
  });
  

  // MOBILE: csak DOM update, és SEMMI scroll
  if (!isDesktop()) {
    await openTypeDomOnly(type);
    return;
  }

  // DESKTOP: fade + scroll (ahogy már jó)
  await withMediaReflowTransition(async () => {
    await openTypeDomOnly(type);
    // scroll indulhat a fade-in elején
    scrollToTopDesktopOnly();
  });


    
    await setOnlyThisVideoAudible(videoEl);
  });

  return btn;
}

function getAllShortVideosWithButtons() {
  const root = document.getElementById("shortBlock");
  if (!root) return [];
  const videos = root.querySelectorAll("video");
  const result = [];
  videos.forEach(v => {
    const btn = v.parentElement?.querySelector(".audio-toggle");
    const icon = btn?.querySelector("img");
    if (btn && icon) result.push({ v, icon });
  });
  return result;
}

function refreshAllShortIcons() {
  const all = getAllShortVideosWithButtons();
  all.forEach(({ v, icon }) => {
    const isOn = (currentSound.videoEl === v) && !v.muted;
    icon.src = isOn ? ICON_ACTIVE : ICON_MUTED;
  });
}

async function setOnlyThisVideoAudible(videoEl) {
  const all = getAllShortVideosWithButtons();

  all.forEach(({ v }) => {
    if (v !== videoEl) v.muted = true;
  });

  const willEnable = videoEl.muted === true;
  videoEl.muted = !willEnable;

  try { await videoEl.play(); } catch {}

  currentSound.videoEl = willEnable ? videoEl : null;
  refreshAllShortIcons();
}

/* ---------- state machine ---------- */

function setActive(type) {
  activeType = type || "";
  const grid = document.getElementById("mediaGrid");
  if (grid) grid.dataset.active = activeType;

  // ✅ MOBILE: ne csukjunk be semmit automatikusan
  if (!isDesktop()) return;

  // ✅ DESKTOP: single-active logika marad
  ["photo", "art", "short"].forEach(t => {
    if (t !== activeType) clearExpanded(t);
  });
}

/**
 * DOM-only open (NEM scrolloz)
 */
async function openTypeDomOnly(type) {
  setActive(type);

  const items = getItemsForType(type);

  // keep updated text correct
  if (items[0]) {
    const updatedEl = document.getElementById(`${type}Updated`);
    if (updatedEl) updatedEl.textContent = formatLastUpdated(items[0].date);
  }

  // OPEN = hide main, show more, render top3 in more
  showMoreHideMain(type);
  await renderTop3IntoMore(type, items);
  setButtonsOpen(type);

  // SHORT: ha előtte volt hang ON, tartsuk az open view első videóján
  if (type === "short") {
    const hadSound = !!currentSound.videoEl && !currentSound.videoEl.muted;

    refreshAllShortIcons();

    if (hadSound) {
      const all = getAllShortVideosWithButtons();
      if (all.length) {
        await setOnlyThisVideoAudible(all[0].v);
      }
    }
  }
}

async function closeAll() {
  setActive("");
  ["photo", "art", "short"].forEach(t => clearExpanded(t));
}

/* ---------- init + wiring ---------- */

async function initMedia() {
  mediaData = await fetchJson(MEDIA_JSON);

  // initial main previews only
  await setMainPreview("photo", getItemsForType("photo")[0] || null);
  await setMainPreview("art", getItemsForType("art")[0] || null);
  await setMainPreview("short", getItemsForType("short")[0] || null);

  // closed by default
  await closeAll();

  wireButtons();
  refreshAllShortIcons();

  // MEDIA page enter (NO FOUC): engedjük látszani
  document.body.classList.add("media-ready");
}

function wireButtons() {
  const map = [
    { type: "photo", btnId: "photoLoadMore" },
    { type: "art", btnId: "artLoadMore" },
    { type: "short", btnId: "shortLoadMore" },
  ];

  map.forEach(({ type, btnId }) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

btn.addEventListener("click", async (e) => {
  e.preventDefault();
  if (isTransitioning) return;

  await withMediaReflowTransition(async () => {
    await openTypeDomOnly(type);

    // ⬅️ SCROLL MÁR A FADE-IN ELEJÉN
    scrollToTopDesktopOnly();
      });

      // ✅ csak ezután scroll (desktop only)
      scrollToTopDesktopOnly();
    });
  });

  window.addEventListener("resize", () => {
    refreshAllShortIcons();
  });
}