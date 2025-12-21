const DATA_URL = "/data/notes.json";
const INITIAL_COUNT = 6;
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

  // append only the new ones
  const alreadyRendered = container.querySelectorAll(".note-entry").length;
  const slice = allNotes.slice(alreadyRendered, visibleCount);

  slice.forEach((note, i) => {
    const el = createNoteEl(note);

    if (slowAnimateNew) {
      el.classList.add("is-new");                 // special slower anim
      el.style.animationDelay = `${i * 120}ms`;   // pici stagger, elegant
    }

    container.appendChild(el);
  });
}

async function initNotes() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  allNotes = await res.json();

  allNotes.sort((a, b) => new Date(b.notesDate) - new Date(a.notesDate));

  visibleCount = INITIAL_COUNT;
  renderNotes();

  document.getElementById("loadMore").addEventListener("click", () => {
    const prev = visibleCount;
    visibleCount = Math.min(visibleCount + LOAD_MORE_COUNT, allNotes.length);

    if (visibleCount === prev) return;

    // NO SCROLL. Just append + slow fade for new ones.
    renderNotes({ onlyAppendNew: true, slowAnimateNew: true });

    // optional: ha elfogy, tüntessük el a Load More-t
    if (visibleCount >= allNotes.length) {
      document.getElementById("loadMore").style.display = "none";
    }
  });
}

initNotes().catch(console.error);