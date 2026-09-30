/* =========================
   MEDIA PAGE – Stable state machine
   data/media.json alapján
   + fade reflow before scroll
   + HEIGHT LOCK (prevents footer jump)
   + BACKSTAGE-STYLE PAGE REVEAL
   + STRONG VIDEO AUTOPLAY
   ========================= */

const MEDIA_JSON = "/data/media.json";

const FOLDERS = {
  photo: "/img/0_media/photo/",
  art: "/img/0_media/art/",
  short: "/img/0_media/short/",
};

// preferencia sorrend (ha több formátum is létezik)
const EXT = {
  photo: ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"],
  art: ["mp4", "mov", "MP4", "MOV"],
  short: ["mp4", "mov", "MP4", "MOV"],
};

// icons
const ICON_MUTED = "/img/audio-muted.png";
const ICON_ACTIVE = "/img/audio-active.png";

let mediaData = [];
let activeType = ""; // "", "photo", "art", "short"

// SHORT audio state (only one video audible)
let currentSound = { videoEl: null };

// transition lock (ne lehessen duplán kattintani)
let isTransitioning = false;

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("js");
  initMedia().catch((error) => {
    console.error(error);

    // Hiba esetén se maradjon örökre rejtve az oldal.
    revealMediaPage();
  });
});


/* ============================================================
   PAGE REVEAL
   ============================================================ */

function revealMediaPage() {
  const page =
    document.querySelector(".media-page") ||
    document.querySelector("body");

  if (!page) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add("media-ready");
    });
  });
}


/* ============================================================
   VIDEO AUTOPLAY
   Backstage-style aggressive autoplay handling
   ============================================================ */

function prepareMediaVideo(video) {
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.loop = true;

  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("autoplay", "");
  video.setAttribute("loop", "");

  function tryPlay() {
    const playPromise = video.play();

    if (
      playPromise &&
      typeof playPromise.catch === "function"
    ) {
      playPromise.catch(() => {});
    }
  }

  tryPlay();

  video.addEventListener("loadeddata", tryPlay);
  video.addEventListener("canplay", tryPlay);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && video.paused) {
      tryPlay();
    }
  });

  let unlocked = false;

  function unlockVideo() {
    if (unlocked) return;

    unlocked = true;
    tryPlay();

    document.removeEventListener("touchstart", unlockVideo);
    document.removeEventListener("pointerdown", unlockVideo);
    document.removeEventListener("click", unlockVideo);
  }

  document.addEventListener("touchstart", unlockVideo, {
    passive: true,
    once: true,
  });

  document.addEventListener("pointerdown", unlockVideo, {
    once: true,
  });

  document.addEventListener("click", unlockVideo, {
    once: true,
  });
}


/* ---------- helpers ---------- */

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("_").map(Number);
  return new Date(y, m - 1, d);
}

function daysDiffFromToday(dateObj) {
  const now = new Date();

  const a = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const b = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );

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
  const res = await fetch(url, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Failed to load ${url} (${res.status})`
    );
  }

  return res.json();
}


// GitHub Pages + Safari néha furán kezeli a HEAD-et,
// ezért GET fallback
async function urlExists(url) {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    if (head.ok) return true;
  } catch {}

  try {
    const get = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    return get.ok;
  } catch {
    return false;
  }
}


async function findExistingFile(
  basePath,
  dateKey,
  extList
) {
  for (const ext of extList) {
    const url = `${basePath}${dateKey}.${ext}`;

    if (await urlExists(url)) {
      return url;
    }
  }

  return null;
}


function isDesktop() {
  return window
    .matchMedia("(min-width: 769px)")
    .matches;
}


function prefersReducedMotion() {
  return window
    .matchMedia("(prefers-reduced-motion: reduce)")
    .matches;
}


function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}


function smoothScrollTo(targetY, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;

  let start;

  function step(ts) {
    if (!start) start = ts;

    const t = ts - start;
    const p = Math.min(t / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);

    window.scrollTo(
      0,
      startY + diff * ease
    );

    if (p < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}


function scrollToTopDesktopOnly() {
  if (!isDesktop()) return;

  smoothScrollTo(0, 1100);
}


function getItemsForType(type) {
  const filtered = mediaData
    .filter(
      (it) =>
        (it?.[type] || "").toLowerCase() === "x"
    )
    .filter(
      (it) =>
        typeof it.date === "string" &&
        it.date.includes("_")
    );

  filtered.sort(
    (a, b) =>
      parseDateKey(b.date) -
      parseDateKey(a.date)
  );

  return filtered;
}


/* ============================================================
   HEIGHT LOCK
   prevents footer jump
   ============================================================ */

function lockMediaHeight() {
  const wrap =
    document.querySelector(".media-wrap");

  if (!wrap) return () => {};

  const h = Math.ceil(
    wrap.getBoundingClientRect().height
  );

  wrap.style.minHeight = `${h}px`;
  wrap.classList.add("is-height-locked");

  return () => {
    wrap.style.minHeight = "";
    wrap.classList.remove(
      "is-height-locked"
    );
  };
}


/* ============================================================
   FADE STATE CLEANUP
   anti-stuck
   ============================================================ */

function clearFadeState() {
  const grid =
    document.getElementById("mediaGrid");

  const wrap =
    document.querySelector(".media-wrap");

  [grid, wrap].forEach((el) => {
    if (!el) return;

    el.classList.remove(
      "is-media-fading-out",
      "is-media-fading-in"
    );

    el.style.opacity = "";
  });
}


/* ============================================================
   MEDIA SWITCH TRANSITION
   ============================================================ */

function getMediaGridEl() {
  return (
    document.getElementById("mediaGrid") ||
    document.querySelector(".media-wrap")
  );
}


/**
 * Fade-out -> DOM update -> Fade-in
 * + Height lock a reflow idejére,
 *   hogy a footer ne ugorjon fel.
 *
 * Desktopon:
 * scroll indulhat a fade-in elején.
 *
 * Mobilon:
 * nincs switch animáció.
 */

async function withMediaReflowTransition(
  runDomUpdate
) {
  if (!isDesktop()) {
    await runDomUpdate();
    return;
  }

  const grid = getMediaGridEl();
  const desk = isDesktop();
  const reduce = prefersReducedMotion();

  const DESK_OUT = 520;
  const DESK_IN = 1920;

  if (!grid || reduce) {
    const y = window.scrollY;

    await runDomUpdate();

    if (!desk) {
      window.scrollTo(0, y);
    }

    return;
  }

  if (isTransitioning) return;

  isTransitioning = true;

  const unlock = lockMediaHeight();
  const yBefore = window.scrollY;

  try {
    // DESKTOP
    grid.classList.add(
      "is-media-fading-out"
    );

    await nextFrame();
    await wait(DESK_OUT);

    await runDomUpdate();

    // force reflow
    grid.offsetHeight;

    grid.classList.remove(
      "is-media-fading-out"
    );

    grid.classList.add(
      "is-media-fading-in"
    );

    scrollToTopDesktopOnly();

    await wait(DESK_IN);

    grid.classList.remove(
      "is-media-fading-in"
    );

    await nextFrame();
  } finally {
    unlock();

    clearFadeState();

    isTransitioning = false;
  }
}


/* ============================================================
   DOM SETTERS
   ============================================================ */

async function setMainPreview(type, item) {
  const updatedEl =
    document.getElementById(
      `${type}Updated`
    );

  const mainEl =
    document.getElementById(
      `${type}Main`
    );

  if (!updatedEl || !mainEl) return;

  if (!item) {
    updatedEl.textContent =
      "Last updated —";

    mainEl.innerHTML = "";

    return;
  }

  updatedEl.textContent =
    formatLastUpdated(item.date);

  const fileUrl =
    await findExistingFile(
      FOLDERS[type],
      item.date,
      EXT[type]
    );

  mainEl.innerHTML = "";

  if (!fileUrl) return;

  if (type === "photo") {
    const img =
      document.createElement("img");

    img.src = fileUrl;
    img.alt = "Latest photo";
    img.loading = "eager";

    mainEl.appendChild(img);

    return;
  }

  const video =
    document.createElement("video");

  video.src = fileUrl;
  video.preload = "auto";

  prepareMediaVideo(video);

  mainEl.appendChild(video);

  if (type === "short") {
    const btn =
      makeAudioButton(video);

    mainEl.appendChild(btn);
  }
}


function showMainHideMore(type) {
  const mainEl =
    document.getElementById(
      `${type}Main`
    );

  const moreEl =
    document.getElementById(
      `${type}More`
    );

  if (mainEl) {
    mainEl.hidden = false;
  }

  if (moreEl) {
    moreEl.hidden = true;
    moreEl.innerHTML = "";
  }
}


function showMoreHideMain(type) {
  const mainEl =
    document.getElementById(
      `${type}Main`
    );

  const moreEl =
    document.getElementById(
      `${type}More`
    );

  if (mainEl) {
    mainEl.hidden = true;
  }

  if (moreEl) {
    moreEl.hidden = false;
  }
}


function setButtonsClosed(type) {
  const loadBtn =
    document.getElementById(
      `${type}LoadMore`
    );

  const ctaBtn =
    document.getElementById(
      `${type}CTA`
    );

  if (loadBtn) {
    loadBtn.style.display = "";
  }

  if (ctaBtn) {
    ctaBtn.style.display = "none";

    ctaBtn.classList.remove(
      "is-visible"
    );
  }
}


function setButtonsOpen(type) {
  const loadBtn =
    document.getElementById(
      `${type}LoadMore`
    );

  const ctaBtn =
    document.getElementById(
      `${type}CTA`
    );

  if (loadBtn) {
    loadBtn.style.display = "none";
  }

  if (ctaBtn) {
    ctaBtn.style.display =
      "inline-flex";

    requestAnimationFrame(() => {
      ctaBtn.classList.add(
        "is-visible"
      );
    });
  }
}


function clearExpanded(type) {
  showMainHideMore(type);
  setButtonsClosed(type);
}


async function renderTop3IntoMore(
  type,
  items
) {
  const moreEl =
    document.getElementById(
      `${type}More`
    );

  if (!moreEl) return;

  const top3 = items.slice(0, 3);

  moreEl.innerHTML = "";

  for (const item of top3) {
    const cell =
      document.createElement("div");

    cell.className = "media-cell";

    const fileUrl =
      await findExistingFile(
        FOLDERS[type],
        item.date,
        EXT[type]
      );

    if (!fileUrl) {
      cell.style.minHeight = "40px";
      moreEl.appendChild(cell);
      continue;
    }

    if (type === "photo") {
      const img =
        document.createElement("img");

      img.src = fileUrl;
      img.alt = "Photo";
      img.loading = "lazy";

      cell.appendChild(img);
    } else {
      const video =
        document.createElement("video");

      video.src = fileUrl;
      video.preload = "auto";

      prepareMediaVideo(video);

      cell.appendChild(video);

      if (type === "short") {
        const btn =
          makeAudioButton(video);

        cell.appendChild(btn);
      }
    }

    moreEl.appendChild(cell);
  }
}


/* ============================================================
   SHORT AUDIO SYSTEM
   ============================================================ */

function makeAudioButton(videoEl) {
  const btn =
    document.createElement("button");

  btn.className = "audio-toggle";
  btn.type = "button";

  btn.setAttribute(
    "aria-label",
    "Toggle audio"
  );

  const icon =
    document.createElement("img");

  icon.alt = "";
  icon.src = ICON_MUTED;

  btn.appendChild(icon);

  btn.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      btn.blur();

      // soha ne fadeljen ki
      // audio tap/click miatt
      clearFadeState();

      await setOnlyThisVideoAudible(
        videoEl
      );
    }
  );

  return btn;
}


function getAllShortVideosWithButtons() {
  const root =
    document.getElementById(
      "shortBlock"
    );

  if (!root) return [];

  const videos =
    root.querySelectorAll("video");

  const result = [];

  videos.forEach((video) => {
    const btn =
      video.parentElement?.querySelector(
        ".audio-toggle"
      );

    const icon =
      btn?.querySelector("img");

    if (btn && icon) {
      result.push({
        v: video,
        icon,
      });
    }
  });

  return result;
}


function refreshAllShortIcons() {
  const all =
    getAllShortVideosWithButtons();

  all.forEach(({ v, icon }) => {
    const isOn =
      currentSound.videoEl === v &&
      !v.muted;

    icon.src = isOn
      ? ICON_ACTIVE
      : ICON_MUTED;
  });
}


async function setOnlyThisVideoAudible(
  videoEl
) {
  const all =
    getAllShortVideosWithButtons();

  // mute all others
  all.forEach(({ v }) => {
    if (v !== videoEl) {
      v.muted = true;
    }
  });

  const willEnable =
    videoEl.muted === true;

  videoEl.muted = !willEnable;

  try {
    await videoEl.play();
  } catch {}

  currentSound.videoEl =
    willEnable
      ? videoEl
      : null;

  refreshAllShortIcons();
}


/* ============================================================
   STATE MACHINE
   ============================================================ */

function setActive(type) {
  activeType = type || "";

  const grid =
    document.getElementById(
      "mediaGrid"
    );

  if (grid) {
    grid.dataset.active =
      activeType;
  }

  // MOBILE:
  // ne csukjunk be semmit automatikusan
  if (!isDesktop()) return;

  // DESKTOP:
  // single-active logika
  ["photo", "art", "short"].forEach(
    (t) => {
      if (t !== activeType) {
        clearExpanded(t);
      }
    }
  );
}


async function openTypeDomOnly(type) {
  setActive(type);

  const items =
    getItemsForType(type);

  if (items[0]) {
    const updatedEl =
      document.getElementById(
        `${type}Updated`
      );

    if (updatedEl) {
      updatedEl.textContent =
        formatLastUpdated(
          items[0].date
        );
    }
  }

  showMoreHideMain(type);

  await renderTop3IntoMore(
    type,
    items
  );

  setButtonsOpen(type);

  if (type === "short") {
    const hadSound =
      !!currentSound.videoEl &&
      !currentSound.videoEl.muted;

    refreshAllShortIcons();

    if (hadSound) {
      const all =
        getAllShortVideosWithButtons();

      if (all.length) {
        await setOnlyThisVideoAudible(
          all[0].v
        );
      }
    }
  }
}


async function closeAll() {
  setActive("");

  ["photo", "art", "short"].forEach(
    (type) => {
      clearExpanded(type);
    }
  );
}


/* ============================================================
   INIT
   ============================================================ */

async function initMedia() {
  /*
   * FONTOS:
   *
   * A page reveal megvárja:
   * 1. media.json betöltését
   * 2. a tényleges fájlok megkeresését
   * 3. a három initial preview létrehozását
   *
   * Nincs mesterséges hosszú page-open delay.
   */

  mediaData =
    await fetchJson(MEDIA_JSON);

  await Promise.all([
    setMainPreview(
      "photo",
      getItemsForType("photo")[0] ||
        null
    ),

    setMainPreview(
      "art",
      getItemsForType("art")[0] ||
        null
    ),

    setMainPreview(
      "short",
      getItemsForType("short")[0] ||
        null
    ),
  ]);

  await closeAll();

  wireButtons();

  refreshAllShortIcons();

  revealMediaPage();
}


/* ============================================================
   BUTTON WIRING
   ============================================================ */

function wireButtons() {
  const map = [
    {
      type: "photo",
      btnId: "photoLoadMore",
    },
    {
      type: "art",
      btnId: "artLoadMore",
    },
    {
      type: "short",
      btnId: "shortLoadMore",
    },
  ];

  map.forEach(
    ({ type, btnId }) => {
      const btn =
        document.getElementById(
          btnId
        );

      if (!btn) return;

      btn.addEventListener(
        "click",
        async (e) => {
          e.preventDefault();

          btn.blur();

          if (isTransitioning) {
            return;
          }

          await withMediaReflowTransition(
            async () => {
              await openTypeDomOnly(
                type
              );
            }
          );
        }
      );
    }
  );

  window.addEventListener(
    "resize",
    () => {
      refreshAllShortIcons();
    }
  );
}