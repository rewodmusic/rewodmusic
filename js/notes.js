const DATA_URL = "data/notes.json";

// desktop / mobile detection
const isMobile = window.matchMedia("(max-width: 768px)").matches;

// limits
const INITIAL_COUNT = isMobile ? 15 : 6;
const LOAD_MORE_COUNT = 5;

let allNotes = [];
let visibleCount = 0;

function formatDate(d) {
  return d.replace(/-/g, ".");
}

function createNoteEl(note) {
  const el = document.createElement("div");
  el.className = "note-entry";

  el.innerHTML = `
    <div class="note-date">${formatDate(note.notesDate)}</div>
    <div class="note-text">${note.notespost}</div>
  `;

  return el;
}

function renderNotes({ onlyAppendNew = false, slowAnimateNew = false } = {}) {
  const container = document.getElementById("notesApp");

  if (!onlyAppendNew) {
    container.innerHTML = "";
    const slice = allNotes.slice(0, visibleCount);
    slice.forEach(note => container.appendChild(createNoteEl(note)));
    return;
  }

  // append only newly revealed notes
  const alreadyRendered = container.querySelectorAll(".note-entry").length;
  const slice = allNotes.slice(alreadyRendered, visibleCount);

  slice.forEach((note, i) => {
    const el = createNoteEl(note);

    if (slowAnimateNew) {
      el.classList.add("is-new");
      el.style.animationDelay = `${i * 120}ms`;
    }

    container.appendChild(el);
  });
}

async function initNotes() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  allNotes = await res.json();

  // newest first
  allNotes.sort((a, b) => new Date(b.notesDate) - new Date(a.notesDate));

  visibleCount = Math.min(INITIAL_COUNT, allNotes.length);
  renderNotes();

  const loadMoreBtn = document.getElementById("loadMore");

  // MOBILE: nincs Load More
  if (isMobile) {
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  // DESKTOP: Load More működik
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