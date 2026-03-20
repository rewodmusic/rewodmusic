/* MUSIC PAGE – JSON loader + accordion (HEIGHT animation, CSS chevron arrow)
   + TAPE RECORDINGS support (tape: "x")
   + TAPE RECORDINGS: ONLY YOUTUBE in service panel (no extra rows)
   + DESCR support:
     if item.descr has text -> service panel gets extra "descr view" block (text + signature)
     + inserts a dedicated divider-gap element so the divider can be moved down via CSS
*/

const CONFIG = {
  dataUrl: "/data/admin.json",
  playIcon: "/img/playbutton.png",
  signatureImg: "/img/signature.png",
  serviceIcons: {
    spotify: "/linktree/linktree_spotify.svg",
    apple: "/linktree/linktree_applemusic.svg",
    youtube: "/linktree/linktree_youtube.svg",
    mms: "/linktree/linktree_mms.png"
  }
};

function toISODate(d) {
  return new Date(d + "T00:00:00");
}

function upper(s) {
  return (s || "").toString().toUpperCase();
}

function safeText(s) {
  return (s || "").toString();
}

function isTapeItem(item) {
  return safeText(item.tape).trim().toLowerCase() === "x";
}

function hasDescr(item) {
  return safeText(item.descr).trim().length > 0;
}

function buildDisplayTitle(item) {
  const base = safeText(item.newmusictitle).trim();
  const feat = safeText(item.feat).trim();
  if (feat.length > 0) return `${base} feat. ${feat}`;
  return base;
}

function buildTapeTitle(item) {
  const artist = safeText(item.newmusicartist).trim();
  const title = safeText(item.newmusictitle).trim();
  if (!artist && !title) return "";
  if (!artist) return title;
  if (!title) return artist;
  return `${artist} - ${title}`;
}

function normalizeItem(raw) {
  return {
    date: raw.newmusicdate || raw.date,
    newmusictitle: raw.newmusictitle,
    newmusicartist: raw.newmusicartist,
    newmusicartist2: raw.newmusicartist2,
    feat: raw.feat,
    tape: raw.tape,
    descr: raw.descr,
    mymusicurl: raw.mymusicurl,
    youtubeurl: raw.youtubeurl,
    spotifyurl: raw.spotifyurl,
    appleurl: raw.appleurl
  };
}

function sortByDateDesc(a, b) {
  return toISODate(b.date) - toISODate(a.date);
}

function sortTapeABC(a, b) {
  const aa = safeText(a.newmusicartist).trim();
  const ba = safeText(b.newmusicartist).trim();
  const at = safeText(a.newmusictitle).trim();
  const bt = safeText(b.newmusictitle).trim();

  const c1 = aa.localeCompare(ba, "en", { sensitivity: "base" });
  if (c1 !== 0) return c1;
  return at.localeCompare(bt, "en", { sensitivity: "base" });
}

function groupData(items) {
  const originals = [];
  const features = [];
  const tape = [];
  const artists = new Map();

  for (const it of items) {
    const artist = (it.newmusicartist || "").trim();

    if (isTapeItem(it)) {
      tape.push(it);
      continue;
    }

    if (it.feat && it.feat.trim().length > 0) {
      features.push(it);
      continue;
    }

    if (artist.toLowerCase() === "original composition") {
      originals.push(it);
      continue;
    }

    if (!artists.has(artist)) artists.set(artist, []);
    artists.get(artist).push(it);
  }

  originals.sort(sortByDateDesc);
  features.sort(sortByDateDesc);
  tape.sort(sortTapeABC);

  const artistKeys = Array.from(artists.keys()).sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" })
  );

  const artistGroups = artistKeys.map(k => ({
    label: k,
    items: artists.get(k).sort(sortByDateDesc)
  }));

  return {
    top: [
      { id: "originals", label: "ORIGINALS", items: originals, mode: "normal" },
      { id: "features", label: "FEATURES", items: features, mode: "normal" },
      { id: "tape", label: "TAPE RECORDINGS", items: tape, mode: "tape" }
    ],
    artists: artistGroups
  };
}

/* =========================
   HEIGHT ANIMATION HELPERS
   ========================= */

function forceReflow(el) {
  el.getBoundingClientRect();
}

function openHeight(el, innerForMeasure = el) {
  el.style.height = "0px";
  forceReflow(el);

  let offset = 0;
  const descrMode = el.classList && el.classList.contains("has-descr");
  if (descrMode) {
    const cssVal = getComputedStyle(document.documentElement)
      .getPropertyValue("--descr-open-offset")
      .trim();
    offset = parseFloat(cssVal) || 0;
  }

  const target = Math.max(0, innerForMeasure.scrollHeight + offset);
  el.style.height = `${target}px`;

  const onEnd = (e) => {
    if (e.propertyName !== "height") return;
    el.removeEventListener("transitionend", onEnd);

    if (!descrMode) {
      el.style.height = "auto";
    } else {
      el.style.height = `${target}px`;
    }
  };
  el.addEventListener("transitionend", onEnd);
}

function closeHeight(el) {
  const current = el.scrollHeight;
  el.style.height = `${current}px`;
  forceReflow(el);
  el.style.height = "0px";
}

/* =========================
   CATEGORY ACCORDION
   ========================= */

function setCatOpenState(catRow, panel, open) {
  if (open) {
    catRow.classList.add("is-open");
    panel.classList.add("is-open");
    panel.style.height = "0px";
    requestAnimationFrame(() => openHeight(panel, panel));
  } else {
    catRow.classList.remove("is-open");
    panel.classList.remove("is-open");

    if (panel.style.height === "auto" || getComputedStyle(panel).height !== "0px") {
      closeHeight(panel);
    } else {
      panel.style.height = "0px";
    }
  }
}

function closeAllCategories(appEl) {
  const cats = appEl.querySelectorAll(".music-cat");
  cats.forEach(cat => {
    const panel = cat.nextElementSibling;
    if (panel && panel.classList.contains("music-panel")) {
      setCatOpenState(cat, panel, false);
    }
  });
}

/* =========================
   SERVICES (song accordion)
   ========================= */

function closeAllServicePanels(appEl) {
  const wraps = appEl.querySelectorAll(".music-services-wrap");
  wraps.forEach(wrap => {
    closeHeight(wrap);
    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      wrap.removeEventListener("transitionend", onEnd);
      wrap.remove();
    };
    wrap.addEventListener("transitionend", onEnd);
  });

  appEl.querySelectorAll(".music-play").forEach(img => img.classList.remove("is-hidden"));
}

function renderServicePanel(item, mode = "normal") {
  const wrap = document.createElement("div");
  wrap.className = "music-services-wrap";
  wrap.style.height = "0px";

  const inner = document.createElement("div");
  inner.className = "music-services-inner";

  const descrOn = hasDescr(item);

  // classes for CSS + openHeight offset logic
  if (descrOn) wrap.classList.add("has-descr");
  if (mode === "tape") wrap.classList.add("is-tape");
  if (descrOn && mode === "tape") wrap.classList.add("has-descr-tape");

  let rows = [
    { key: "spotify", url: item.spotifyurl, label: "Play" },
    { key: "apple", url: item.appleurl, label: "Play" },
    { key: "youtube", url: item.youtubeurl, label: "Watch" },
    { key: "mms", url: item.mymusicurl, label: "Buy" }
  ];

  // TAPE: ONLY YOUTUBE
  if (mode === "tape") {
    rows = rows.filter(r => r.key === "youtube");
  }

  for (const r of rows) {
    const row = document.createElement("div");
    row.className = `music-service-row ${r.key}`;

    const icon = document.createElement("img");
    icon.className = "music-service-icon";
    icon.src = CONFIG.serviceIcons[r.key];
    icon.alt = r.key;

    const spacer = document.createElement("div");

    const btn = document.createElement("a");
    btn.className = "music-service-btn";
    btn.textContent = r.label;

    if (r.url && r.url.trim().length > 0) {
      btn.href = r.url;
      btn.target = "_blank";
      btn.rel = "noopener";
    } else {
      btn.href = "#";
      btn.style.opacity = "0.45";
      btn.style.pointerEvents = "none";
    }

    row.appendChild(icon);
    row.appendChild(spacer);
    row.appendChild(btn);
    inner.appendChild(row);
  }

  if (descrOn) {
    // ONLY TAPE: insert divider-gap element (line can be moved via CSS)
    if (mode === "tape") {
      const dividerGap = document.createElement("div");
      dividerGap.className = "music-descr-divider-gap";
      inner.appendChild(dividerGap);
    }

    const descrWrap = document.createElement("div");
    descrWrap.className = "music-descr";

    const text = document.createElement("div");
    text.className = "music-descr-text";
    text.textContent = `"${safeText(item.descr).trim()}"`;

    const by = document.createElement("div");
    by.className = "music-descr-by";
    by.textContent = "- REWOD";

    const sig = document.createElement("img");
    sig.className = "music-descr-signature";
    sig.src = CONFIG.signatureImg;
    sig.alt = "REWOD signature";

    descrWrap.appendChild(text);
    descrWrap.appendChild(by);
    descrWrap.appendChild(sig);

    inner.appendChild(descrWrap);
  }

  wrap.appendChild(inner);
  return { wrap, inner };
}

function toggleServicesForSong(songEl, item, mode = "normal") {
  const appEl = songEl.closest("#musicApp");
  if (!appEl) return;

  const play = songEl.querySelector(".music-play");
  const existing = songEl.nextElementSibling;

  // close if already open
  if (existing && existing.classList.contains("music-services-wrap")) {
    if (play) play.classList.remove("is-hidden");

    closeHeight(existing);
    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      existing.removeEventListener("transitionend", onEnd);
      existing.remove();
    };
    existing.addEventListener("transitionend", onEnd);
    return;
  }

  // close any other open service panels
  closeAllServicePanels(appEl);

  // open new one
  const { wrap, inner } = renderServicePanel(item, mode);
  songEl.insertAdjacentElement("afterend", wrap);

  if (play) play.classList.add("is-hidden");

  requestAnimationFrame(() => {
    forceReflow(wrap);
    openHeight(wrap, inner);
  });
}

/* =========================
   RENDER
   ========================= */

function renderSongs(panelEl, items, { mode = "normal" } = {}) {
  panelEl.innerHTML = "";

  items.forEach((it, idx) => {
    const song = document.createElement("div");
    song.className = `music-song ${idx % 2 === 0 ? "music-song--odd" : "music-song--even"}`;
    song.setAttribute("role", "button");
    song.setAttribute("tabindex", "0");

    const title = document.createElement("div");
    title.className = "music-song-title";

    if (mode === "tape") {
      title.textContent = buildTapeTitle(it);
    } else {
      title.textContent = upper(buildDisplayTitle(it));
    }

    const right = document.createElement("div");
    right.className = "music-song-right";

    const play = document.createElement("img");
    play.className = "music-play";
    play.src = CONFIG.playIcon;
    play.alt = "Play";

    // click on icon
    play.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleServicesForSong(song, it, mode);
    });

    // click on row
    song.addEventListener("click", () => toggleServicesForSong(song, it, mode));

    // keyboard
    song.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleServicesForSong(song, it, mode);
      }
    });

    right.appendChild(play);
    song.appendChild(title);
    song.appendChild(right);

    panelEl.appendChild(song);
  });
}

function renderCategory(appEl, cat) {
  const catRow = document.createElement("div");
  catRow.className = "music-cat";
  catRow.setAttribute("role", "button");
  catRow.setAttribute("tabindex", "0");

  if (cat.id === "tape") catRow.classList.add("music-cat--tape");

  const label = document.createElement("div");
  label.className = "music-cat-label";
  label.textContent = upper(cat.label);

  const arrow = document.createElement("span");
  arrow.className = "music-cat-arrow";
  arrow.setAttribute("aria-hidden", "true");

  const panel = document.createElement("div");
  panel.className = "music-panel";
  panel.style.height = "0px";

  renderSongs(panel, cat.items, { mode: cat.mode || "normal" });

  function toggleCategory() {
    const isOpen = panel.classList.contains("is-open");
    closeAllCategories(appEl);
    closeAllServicePanels(appEl);
    if (!isOpen) setCatOpenState(catRow, panel, true);
  }

  catRow.addEventListener("click", toggleCategory);
  catRow.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCategory();
    }
  });

  catRow.appendChild(label);
  catRow.appendChild(arrow);

  appEl.appendChild(catRow);
  appEl.appendChild(panel);
}

async function init() {
  const appEl = document.getElementById("musicApp");
  if (!appEl) return;

  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`JSON fetch failed: ${res.status}`);

  const raw = await res.json();
  const items = raw.map(normalizeItem).filter(x => x.date);

  const grouped = groupData(items);

  grouped.top.forEach(cat => renderCategory(appEl, cat));
  grouped.artists.forEach(g => {
    renderCategory(appEl, {
      id: `artist:${g.label}`,
      label: g.label,
      items: g.items,
      mode: "normal"
    });
  });
}

init().catch(console.error);