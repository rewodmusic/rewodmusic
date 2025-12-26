/* =========================
   LATEST PAGE – JS (TAPE + DESCR + SIGNATURE) ✅ SAFE
   ========================= */

const CONFIG = {
  dataUrl: "/data/admin.json",
  kofiUrl: "https://ko-fi.com/rewodmusic",
  signatureUrl: "/img/signature.png"
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

  if (u && u !== "#") {
    btn.href = u;
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.style.opacity = "1";
    btn.style.pointerEvents = "auto";
  } else {
    btn.href = "#";
    btn.style.opacity = "0.45";
    btn.style.pointerEvents = "none";
  }
}

function buildTitle(row) {
  const t = safeText(row.newmusictitle).trim();
  const f = safeText(row.feat).trim();
  const a = safeText(row.newmusicartist).trim();
  const tape = safeText(row.tape).trim().toLowerCase();

  if (tape === "x") return `${a} - ${t}`;
  if (f) return `REWOD ft. ${f} - ${t}`;
  return `REWOD - ${t}`;
}

/* --- TAPE UI: hide/show rows safely --- */
function setTapeMode(isTape) {
  const root = document.querySelector(".latest-release") || document.body;
  root.classList.toggle("is-tape", !!isTape);

  const rowSpotify = document.querySelector(".latest-release .service-row.spotify");
  const rowApple   = document.querySelector(".latest-release .service-row.apple");
  const rowMMS     = document.querySelector(".latest-release .service-row.mms");

  [rowSpotify, rowApple, rowMMS].forEach(el => {
    if (!el) return;
    el.style.display = "";
  });

  if (isTape) {
    if (rowSpotify) rowSpotify.style.display = "none";
    if (rowApple)   rowApple.style.display = "none";
    if (rowMMS)     rowMMS.style.display = "none";
  }
}

/* --- DESCR block: DOM remove/restore + hidden fix + signature --- */
let _latestDescrNode = null;

function setDescr(row) {
  const services = document.getElementById("latestServices"); // gray box
  const wrap = document.getElementById("latestDescr");
  const text = document.getElementById("latestDescrText");

  if (!services || !wrap || !text) return;

  const d = safeText(row.descr).trim();

  // NO descr => remove from DOM (so Ko-fi divider disappears even on mobile)
  if (!d) {
    services.classList.remove("has-descr");
    wrap.hidden = true; // important
    if (wrap.parentElement) {
      _latestDescrNode = wrap;
      wrap.remove();
    }
    return;
  }

  // descr exists => ensure it's inside gray box (as LAST child)
  if (!wrap.parentElement) {
    services.appendChild(_latestDescrNode || wrap);
  }

  services.classList.add("has-descr");

  // ✅ UNHIDE (THIS was missing)
  wrap.hidden = false;

  // ✅ Same logic as Music: descr + ENTER + "- REWOD"
  text.textContent = `"${d}"\n- REWOD`;

  // ✅ Signature (create if missing)
  let sig = document.getElementById("latestSignature");
  if (!sig) {
    sig = document.createElement("img");
    sig.id = "latestSignature";
    sig.className = "latest-descr-signature";
    sig.alt = "REWOD signature";
    wrap.appendChild(sig);
  }

  const sigUrl = safeText(row.signatureUrl || row.signatureurl).trim() || CONFIG.signatureUrl;
  sig.src = sigUrl;
  sig.loading = "lazy";
  sig.decoding = "async";
}

async function initLatest() {
  const res = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return;

  const row = data[0];

  // cover
  const coverEl = document.getElementById("latestCover");
  if (coverEl && hasText(row.coverUrl)) coverEl.src = row.coverUrl;

  // title
  const titleEl = document.getElementById("latestTitle");
  if (titleEl) titleEl.textContent = buildTitle(row);

  // tape
  const isTape = safeText(row.tape).trim().toLowerCase() === "x";
  setTapeMode(isTape);

  // buttons
  setBtn(document.getElementById("btnSpotify"), row.spotifyurl);
  setBtn(document.getElementById("btnApple"),  row.appleurl);
  setBtn(document.getElementById("btnYouTube"), row.youtubeurl);
  setBtn(document.getElementById("btnMMS"),    row.mymusicurl);

  const kofiBtn = document.getElementById("btnKofi");
  if (kofiBtn) {
    kofiBtn.href = CONFIG.kofiUrl;
    kofiBtn.target = "_blank";
    kofiBtn.rel = "noopener";
  }

  // descr + signature
  setDescr(row);
}

initLatest().catch(console.error);