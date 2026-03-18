const DATA_URL = "/data/notes.json";

// desktop / mobile detection
const isMobile = window.matchMedia("(max-width: 768px)").matches;

// limits
const INITIAL_COUNT = isMobile ? 5 : 6;
const LOAD_MORE_COUNT = 5;

const DEFAULT_HEADPHONE_ICON = "/img/emoji_headphone_dark.png";
const ACTIVE_HEADPHONE_ICON = "/img/emoji_headphone.png";

let allNotes = [];
let visibleCount = 0;
let activeTrackIndex = null;

const notesApp = document.getElementById("notesApp");
const loadMoreBtn = document.getElementById("loadMore");
const stickyShell = document.getElementById("notesStickyShell");
const stickyEmbed = document.getElementById("notesStickyEmbed");
const stickyPlaceholder = document.getElementById("notesStickyPlaceholder");

function formatDate(dateString) {
  return String(dateString || "").replace(/-/g, ".");
}

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim().replace(/^#/, "");
  const isValid = /^[0-9a-fA-F]{6}$/.test(raw);
  return `#${isValid ? raw : fallback}`;
}

function extractSpotifyTrackId(songlink) {
  if (!songlink) return null;

  const raw = String(songlink).trim();

  const uriMatch = raw.match(/^spotify:track:([a-zA-Z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  const urlMatch = raw.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/i);
  if (urlMatch) return urlMatch[1];

  return null;
}

function getSpotifyEmbedUrl(songlink) {
  const trackId = extractSpotifyTrackId(songlink);
  if (!trackId) return null;
  return `https://open.spotify.com/embed/track/${trackId}`;
}

function createTrackButton(note, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "note-track-btn";
  button.dataset.noteIndex = String(index);
  button.setAttribute("aria-pressed", "false");

  const icon = document.createElement("img");
  icon.className = "note-track-btn-icon";
  icon.src = DEFAULT_HEADPHONE_ICON;
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.className = "note-track-btn-label";
  label.textContent = `PLAY - ${note.songname || "Untitled"}`;

  button.appendChild(icon);
  button.appendChild(label);

  button.addEventListener("click", () => {
    handleTrackButtonClick(index);
  });

  return button;
}

function createNoteEl(note, index) {
  const el = document.createElement("article");
  el.className = "note-entry";
  el.dataset.noteIndex = String(index);

  const hasTrack = Boolean(note.songname && note.songlink);

  if (hasTrack) {
    el.classList.add("has-track");
  }

  const head = document.createElement("div");
  head.className = "note-head";

  const dateEl = document.createElement("div");
  dateEl.className = "note-date";
  dateEl.textContent = formatDate(note.notesDate);

  head.appendChild(dateEl);

  if (hasTrack) {
    const trackButton = createTrackButton(note, index);
    head.appendChild(trackButton);
  }

  const textEl = document.createElement("div");
  textEl.className = "note-text";
  textEl.innerHTML = (note.notespost || "").replace(/<br\s*\/?>/gi, "<br>");

  el.appendChild(head);
  el.appendChild(textEl);

  return el;
}

function updateButtonVisual(button, note, isActive) {
  if (!button || !note) return;

  const label = button.querySelector(".note-track-btn-label");
  const icon = button.querySelector(".note-track-btn-icon");
  if (!label || !icon) return;

  if (isActive) {
    const bgColor = normalizeHex(note.buttoncolor, "6dcff6");
    const fontColor = normalizeHex(note.fontcolor, "ffffff");

    button.classList.add("is-active");
    button.style.backgroundColor = bgColor;
    button.style.color = fontColor;
    button.style.opacity = "1";
    button.setAttribute("aria-pressed", "true");

    icon.src = ACTIVE_HEADPHONE_ICON;
    label.textContent = `STOP - ${note.songname || "Untitled"}`;
  } else {
    button.classList.remove("is-active");
    button.style.backgroundColor = "";
    button.style.color = "";
    button.style.opacity = "";
    button.setAttribute("aria-pressed", "false");

    icon.src = DEFAULT_HEADPHONE_ICON;
    label.textContent = `PLAY - ${note.songname || "Untitled"}`;
  }
}

function syncAllButtonStates() {
  const buttons = notesApp.querySelectorAll(".note-track-btn");

  buttons.forEach((button) => {
    const noteIndex = Number(button.dataset.noteIndex);
    const note = allNotes[noteIndex];
    const isActive = noteIndex === activeTrackIndex;
    updateButtonVisual(button, note, isActive);
  });
}

function showPlaceholder() {
  if (!stickyPlaceholder || !stickyEmbed) return;

  stickyPlaceholder.hidden = false;
  stickyPlaceholder.style.display = "flex";

  stickyEmbed.hidden = true;
  stickyEmbed.style.display = "none";
  stickyEmbed.innerHTML = "";
}

function showEmbed(embedUrl) {
  if (!stickyPlaceholder || !stickyEmbed) return;

  stickyEmbed.innerHTML = `
    <iframe
      src="${embedUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player"
    ></iframe>
  `;

  stickyPlaceholder.hidden = true;
  stickyPlaceholder.style.display = "none";

  stickyEmbed.hidden = false;
  stickyEmbed.style.display = "block";
}

function renderStickyPlaceholder() {
  if (!stickyShell) return;

  stickyShell.classList.add("is-placeholder");
  stickyShell.classList.remove("is-embed-active");
  showPlaceholder();
}

function renderStickyEmbed(note) {
  if (!stickyShell) return;

  const embedUrl = getSpotifyEmbedUrl(note.songlink);

  if (!embedUrl) {
    console.warn("Invalid Spotify link:", note.songlink);
    renderStickyPlaceholder();
    return;
  }

  stickyShell.classList.remove("is-placeholder");
  stickyShell.classList.add("is-embed-active");

  showEmbed(embedUrl);
}

function handleTrackButtonClick(index) {
  const note = allNotes[index];
  if (!note || !note.songlink) return;

  if (activeTrackIndex === index) {
    activeTrackIndex = null;
    syncAllButtonStates();
    renderStickyPlaceholder();
    return;
  }

  activeTrackIndex = index;
  syncAllButtonStates();
  renderStickyEmbed(note);
}

function renderNotes({ onlyAppendNew = false, slowAnimateNew = false } = {}) {
  if (!notesApp) return;

  if (!onlyAppendNew) {
    notesApp.innerHTML = "";
    const slice = allNotes.slice(0, visibleCount);

    slice.forEach((note, index) => {
      notesApp.appendChild(createNoteEl(note, index));
    });

    syncAllButtonStates();
    return;
  }

  const alreadyRendered = notesApp.querySelectorAll(".note-entry").length;
  const slice = allNotes.slice(alreadyRendered, visibleCount);

  slice.forEach((note, localIndex) => {
    const globalIndex = alreadyRendered + localIndex;
    const el = createNoteEl(note, globalIndex);

    if (slowAnimateNew) {
      el.classList.add("is-new");
      el.style.animationDelay = `${localIndex * 120}ms`;
    }

    notesApp.appendChild(el);
  });

  syncAllButtonStates();
}

async function initNotes() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  allNotes = await res.json();

  allNotes.sort((a, b) => new Date(b.notesDate) - new Date(a.notesDate));

  visibleCount = Math.min(INITIAL_COUNT, allNotes.length);
  renderNotes();
  renderStickyPlaceholder();

if (!loadMoreBtn) return;

loadMoreBtn.style.display = visibleCount >= allNotes.length ? "none" : "";

loadMoreBtn.addEventListener("click", () => {
  const prev = visibleCount;

  visibleCount = Math.min(
    visibleCount + LOAD_MORE_COUNT,
    allNotes.length
  );

  if (visibleCount === prev) return;

  renderNotes({ onlyAppendNew: true, slowAnimateNew: true });

  if (visibleCount >= allNotes.length) {
    loadMoreBtn.style.display = "none";
  }
});
}

initNotes().catch(console.error);