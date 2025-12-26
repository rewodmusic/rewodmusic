/* WEBSHOP – JSON-driven from /data/admin.json
   Desktop: 8 cards
   Mobile: 5 cards
*/

const DATA_URL = "/data/admin.json";

const MAX_ITEMS_DESKTOP = 8;
const MAX_ITEMS_MOBILE = 5;

const PREVIEW_DIR = "/img/0_sheetmusic"; // ide pakolod a previewket
const MYMUSICFIVE_URL = "https://www.mymusicfive.com/rewodmusic";

function safeText(v) {
  return (v ?? "").toString().trim();
}

function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function getMaxItems() {
  return isMobile() ? MAX_ITEMS_MOBILE : MAX_ITEMS_DESKTOP;
}

// YYYY_MM_DD -> Date (local midnight)
function parseYYYY_MM_DD(s) {
  const m = safeText(s).match(/^(\d{4})_(\d{2})_(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function daysDiffFromToday(dateObj) {
  if (!dateObj) return null;
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const ms = a - b;
  return Math.round(ms / 86400000);
}

function formatAddedLabel(dateObj) {
  const diff = daysDiffFromToday(dateObj);
  if (diff === null) return "Added —";
  if (diff === 0) return "Added today";
  if (diff === 1) return "Added yesterday";
  if (diff > 1) return `Added ${diff} days ago`;
  if (diff === -1) return "Added tomorrow";
  return `Added ${Math.abs(diff)} days from now`;
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

function priceFor(artist) {
  // "original composition" => $5, everything else => $7
  return safeText(artist).toLowerCase() === "original composition" ? 5 : 7;
}

function makeCard(row) {
  const dateStr = safeText(row.newmusicdate);
  const d = parseYYYY_MM_DD(dateStr);
const addedLabel = formatAddedLabel(d);

  const title = buildTitleWithFeat(row.newmusictitle, row.feat);
  const artistLine = buildArtistLine(row.newmusicartist, row.newmusicartist2);

  const price = priceFor(row.newmusicartist);
  const cartUrl = safeText(row.mymusicurl) || MYMUSICFIVE_URL;

  // preview file name is newmusicdate.jpg
  const previewSrc = dateStr ? `${PREVIEW_DIR}/${dateStr}.jpg` : "";

  const article = document.createElement("article");
  article.className = "ws-card";

  article.innerHTML = `
    <div class="ws-added">${addedLabel}</div>

    <div class="ws-text">
      <div class="ws-title">${title || "—"}</div>
      <div class="ws-sub">${artistLine || "—"}</div>
    </div>

    <a class="ws-preview" href="${cartUrl}" target="_blank" rel="noopener" aria-label="Open item">
      <img class="ws-preview-img" src="${previewSrc}" alt="Sheet preview">
    </a>

    <div class="ws-bottom">
      <div class="ws-price">$${price}</div>
      <a class="ws-btn" href="${cartUrl}" target="_blank" rel="noopener">Add to cart</a>
    </div>
  `;

  // ✅ if image missing -> keep empty space, hide broken icon
  const img = article.querySelector(".ws-preview-img");
  const previewLink = article.querySelector(".ws-preview");
  if (img) {
    img.addEventListener("error", () => {
      img.removeAttribute("src");
      img.style.display = "none";
      if (previewLink) previewLink.classList.add("is-missing");
    });
  }

  return article;
}

let _cachedRows = null;
let _lastMax = null;

function renderWebshop(rows) {
  const grid = document.getElementById("webshopGrid");
  if (!grid) return;

  const maxItems = getMaxItems();
  _lastMax = maxItems;

  const list = Array.isArray(rows) ? rows.slice(0, maxItems) : [];
  grid.innerHTML = "";
  list.forEach(r => grid.appendChild(makeCard(r)));
}

async function initWebshop() {
  // CTA always points to mymusicfive
  const cta = document.getElementById("wsLoadMoreBtn");
  if (cta) cta.href = MYMUSICFIVE_URL;

  const grid = document.getElementById("webshopGrid");
  if (!grid) return;

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const rows = await res.json();

  _cachedRows = rows;
  renderWebshop(rows);
}

// re-render on breakpoint change (devtools resize safe)
window.addEventListener("resize", () => {
  const maxItems = getMaxItems();
  if (_cachedRows && maxItems !== _lastMax) {
    renderWebshop(_cachedRows);
  }
});

initWebshop().catch(console.error);