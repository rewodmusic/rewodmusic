/* =========================================================
   REWOD WEBSHOP – DYNAMIC SHEET MUSIC LIBRARY

   DATA SOURCE:
   /data/admin.json

   FEATURES:
   - Daily / Regular categories
   - Automatic pricing
   - SIMPLE VER. ribbon
   - Live search
   - REWOD / feat special searches
   - Chronological sorting
   - Real LOAD MORE
   - Preserved item count when toggling filters
   - Responsive desktop / mobile limits
   - Automatic preview image fallback
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const DATA_URL = "/data/database.json";

const MAX_ITEMS_DESKTOP = 12;
const MAX_ITEMS_MOBILE = 5;

const PREVIEW_DIR = "/img/0_sheetmusic";
const PREVIEW_FALLBACK = "/img/sample.jpg";

const MYMUSICFIVE_URL =
    "https://www.mymusicfive.com/rewodmusic";


/* =========================================================
   STATE
   ========================================================= */

let webshopRows = [];

let visibleCount = 0;

let lastPageSize = null;

let webshopSearch = "";

let showDaily = true;

let showRegular = true;


/* =========================================================
   UTILITIES
   ========================================================= */

function safeText(value) {
    return (value ?? "").toString().trim();
}


function normalizeText(value) {
    return safeText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}


function isMobile() {
    return window.matchMedia(
        "(max-width: 768px)"
    ).matches;
}


function getPageSize() {
    return isMobile()
        ? MAX_ITEMS_MOBILE
        : MAX_ITEMS_DESKTOP;
}


/* =========================================================
   DATE HANDLING
   ========================================================= */

function parseYYYY_MM_DD(value) {

    const match = safeText(value).match(
        /^(\d{4})_(\d{2})_(\d{2})$/
    );

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
        year,
        month - 1,
        day
    );

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}


function daysDiffFromToday(dateObj) {

    if (!dateObj) return null;

    const now = new Date();

    const todayUTC = Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const itemUTC = Date.UTC(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate()
    );

    return Math.round(
        (todayUTC - itemUTC) / 86400000
    );
}


function formatAddedLabel(dateObj) {

    const diff = daysDiffFromToday(dateObj);

    if (diff === null) return "Added —";

    if (diff === 0) return "Added today";

    if (diff === 1) return "Added yesterday";

    if (diff > 1) {
        return `Added ${diff} days ago`;
    }

    if (diff === -1) {
        return "Added tomorrow";
    }

    return `Added ${Math.abs(diff)} days from now`;
}


/* =========================================================
   CATEGORY DETECTION
   ========================================================= */

function isDaily(row) {

    return normalizeText(row.daily) === "x";

}


function isOriginal(row) {

    return normalizeText(
        row.newmusicartist
    ) === "original composition";

}


function hasCollaboration(row) {

    return safeText(row.feat) !== "";

}


/* =========================================================
   AUTOMATIC PRICING

   DAILY:
   $4

   ORIGINAL:
   $5

   EVERYTHING ELSE:
   $7
   ========================================================= */

function priceFor(row) {

    if (isDaily(row)) {
        return 4;
    }

    if (isOriginal(row)) {
        return 5;
    }

    return 7;

}


/* =========================================================
   TEXT BUILDERS
   ========================================================= */

function buildArtistLine(a1, a2) {

    const A = safeText(a1);
    const B = safeText(a2);

    if (A && B) {
        return `${A}, ${B}`;
    }

    return A || "";

}


function buildTitleWithFeat(title, feat) {

    const t = safeText(title);
    const f = safeText(feat);

    if (!t) return "";

    return f
        ? `${t} ft. ${f}`
        : t;

}


/* =========================================================
   CHRONOLOGICAL SORTING

   NEWEST FIRST
   ========================================================= */

function sortByDate(rows) {

    return [...rows].sort((a, b) => {

        const dateA = parseYYYY_MM_DD(
            a.newmusicdate
        );

        const dateB = parseYYYY_MM_DD(
            b.newmusicdate
        );

        const timeA = dateA
            ? dateA.getTime()
            : -Infinity;

        const timeB = dateB
            ? dateB.getTime()
            : -Infinity;

        return timeB - timeA;

    });

}


/* =========================================================
   CATEGORY FILTERS
   ========================================================= */

function passesCategoryFilter(row) {

    if (isDaily(row)) {
        return showDaily;
    }

    return showRegular;

}


/* =========================================================
   LIVE SEARCH

   SPECIAL RULES:

   REWOD:
   Searches original compositions.

   FEAT:
   Searches collaborations.

   NORMAL:
   Searches artist, title and featured artist.
   ========================================================= */

function passesSearch(row) {

    const query = normalizeText(webshopSearch);

    if (!query) {
        return true;
    }

    const title = normalizeText(row.newmusictitle);
    const artist1 = normalizeText(row.newmusicartist);
    const artist2 = normalizeText(row.newmusicartist2);
    const feat = normalizeText(row.feat);

    /* NORMAL SEARCH */

    const normalMatch = [
        title,
        artist1,
        artist2,
        feat
    ].some(text => text.includes(query));


    /* REWOD SPECIAL SEARCH */

    let rewodMatch = false;

    if ("rewod".startsWith(query)) {

        rewodMatch = isOriginal(row);

    } else if (query.startsWith("rewod")) {

        const remaining = query.slice(5).trim();

        rewodMatch = isOriginal(row) && (
            !remaining ||
            [title, artist2, feat].some(text =>
                text.includes(remaining)
            )
        );

    }


    /* FEAT SPECIAL SEARCH */

    let featMatch = false;

    if ("feat".startsWith(query)) {

        featMatch = hasCollaboration(row);

    } else if (query.startsWith("feat")) {

        const remaining = query.slice(4).trim();

        featMatch = hasCollaboration(row) && (
            !remaining ||
            [title, artist1, artist2, feat].some(text =>
                text.includes(remaining)
            )
        );

    }


    /* COMBINE ALL SEARCH RESULTS */

    return normalMatch || rewodMatch || featMatch;

}


/* =========================================================
   GET FILTERED ROWS
   ========================================================= */

function getFilteredRows() {

    return webshopRows.filter(row => {

        return (
            passesCategoryFilter(row) &&
            passesSearch(row)
        );

    });

}


/* =========================================================
   SAFE DOM HELPERS
   ========================================================= */

function createTextElement(
    tag,
    className,
    value
) {

    const element = document.createElement(tag);

    element.className = className;

    element.textContent = value;

    return element;

}


/* =========================================================
   BUILD CARD
   ========================================================= */

function makeCard(row) {

    const dateStr = safeText(
        row.newmusicdate
    );

    const dateObj = parseYYYY_MM_DD(
        dateStr
    );

    const addedLabel = formatAddedLabel(
        dateObj
    );

    const title = buildTitleWithFeat(
        row.newmusictitle,
        row.feat
    );

    const artistLine = buildArtistLine(
        row.newmusicartist,
        row.newmusicartist2
    );

    const daily = isDaily(row);

    const price = priceFor(row);

    const cartUrl =
        safeText(row.mymusicurl) ||
        MYMUSICFIVE_URL;

    const previewSrc = dateStr
        ? `${PREVIEW_DIR}/${dateStr}.jpg`
        : PREVIEW_FALLBACK;


    /* CARD */

    const article = document.createElement(
        "article"
    );

    article.className = "ws-card";

    if (daily) {
        article.classList.add(
            "ws-card--daily"
        );
    }


    /* DAILY RIBBON */

    if (daily) {

        const ribbon = createTextElement(
            "div",
            "ws-daily-ribbon",
            "SIMPLE VER."
        );

        article.appendChild(ribbon);

    }


    /* ADDED DATE */

    const added = createTextElement(
        "div",
        "ws-added",
        addedLabel
    );

    article.appendChild(added);


    /* TEXT CONTAINER */

    const textContainer =
        document.createElement("div");

    textContainer.className = "ws-text";


    const titleElement = createTextElement(
        "div",
        "ws-title",
        title || "—"
    );


    const artistElement = createTextElement(
        "div",
        "ws-sub",
        artistLine || "—"
    );


    textContainer.appendChild(
        titleElement
    );

    textContainer.appendChild(
        artistElement
    );

    article.appendChild(
        textContainer
    );


    /* PREVIEW LINK */

    const previewLink =
        document.createElement("a");

    previewLink.className = "ws-preview";

    previewLink.href = cartUrl;

    previewLink.target = "_blank";

    previewLink.rel =
        "noopener noreferrer";

    previewLink.setAttribute(
        "aria-label",
        `Open ${title || "sheet music"}`
    );


    /* =========================================================
       PREVIEW IMAGE – AUTOMATIC FALLBACK
       ========================================================= */

    const image =
        document.createElement("img");

    image.className = "ws-preview-img";

    image.alt = `${title} sheet music preview`;

    image.loading = "lazy";

    image.decoding = "async";


    /* FALLBACK HANDLING */

    image.addEventListener(
        "error",
        () => {

            const fallbackURL = new URL(
                PREVIEW_FALLBACK,
                window.location.href
            ).href;

            /* Original image failed */

            if (image.src !== fallbackURL) {

                image.src = PREVIEW_FALLBACK;

                return;

            }

            /* Fallback also failed */

            image.removeAttribute("src");

            image.style.display = "none";

            previewLink.classList.add(
                "is-missing"
            );

        }
    );


    /* INITIAL IMAGE SOURCE */

    image.src = previewSrc;


    previewLink.appendChild(image);

    article.appendChild(previewLink);


    /* BOTTOM */

    const bottom =
        document.createElement("div");

    bottom.className = "ws-bottom";


    const priceElement = createTextElement(
        "div",
        "ws-price",
        `$${price}`
    );


    const button =
        document.createElement("a");

    button.className = "ws-btn";

    button.href = cartUrl;

    button.target = "_blank";

    button.rel =
        "noopener noreferrer";

    button.textContent = "Add to cart";


    bottom.appendChild(priceElement);

    bottom.appendChild(button);

    article.appendChild(bottom);


    return article;

}


/* =========================================================
   RENDER WEBSHOP
   ========================================================= */

function renderWebshop() {

    const grid = document.getElementById(
        "webshopGrid"
    );

    const status = document.getElementById(
        "wsResultsStatus"
    );

    if (!grid) return;


    /* FILTER + SORT */

    const filteredRows = getFilteredRows();

    const total = filteredRows.length;


    /* PRESERVE REQUESTED ITEM COUNT */

    const rowsToDisplay = filteredRows.slice(
        0,
        visibleCount
    );


    /* CLEAR GRID */

    grid.replaceChildren();


    /* CREATE CARDS */

    const fragment =
        document.createDocumentFragment();

    rowsToDisplay.forEach(row => {

        fragment.appendChild(
            makeCard(row)
        );

    });

    grid.appendChild(fragment);


    /* INFINITE SCROLL VISIBILITY */

    const trigger = document.getElementById(
        "wsInfiniteScrollTrigger"
    );

    if (trigger) {
        trigger.hidden = total <= visibleCount;
    }


    /* SEARCH STATUS */

    if (status) {

        if (!showDaily && !showRegular) {

            status.textContent =
                "Enable a category to display sheet music.";

        } else if (total === 0) {

            status.textContent =
                "No sheet music found.";

        } else {

            status.textContent = "";

        }

    }

}


/* =========================================================
   LOAD MORE

   DESKTOP: +12
   MOBILE: +5
   ========================================================= */

function loadMoreItems() {

    const total = getFilteredRows().length;

    if (visibleCount >= total) {
        return;
    }

    visibleCount += getPageSize();

    renderWebshop();

}


/* =========================================================
   INFINITE SCROLL
   ========================================================= */

let webshopScrollObserver = null;

function setupInfiniteScroll() {

    const trigger = document.getElementById(
        "wsInfiniteScrollTrigger"
    );

    if (!trigger) return;

    webshopScrollObserver = new IntersectionObserver(
        (entries) => {

            const entry = entries[0];

            if (!entry.isIntersecting) {
                return;
            }

            const total = getFilteredRows().length;

            if (visibleCount >= total) {
                return;
            }

            loadMoreItems();

        },
        {
            root: null,

            rootMargin: "0px 0px 350px 0px",

            threshold: 0
        }
    );

    webshopScrollObserver.observe(trigger);

}


/* =========================================================
   CATEGORY SWITCH EVENTS
   ========================================================= */

function setupCategoryFilters() {

    const dailySwitch =
        document.getElementById(
            "wsFilterDaily"
        );

    const regularSwitch =
        document.getElementById(
            "wsFilterRegular"
        );


    if (dailySwitch) {

        showDaily = dailySwitch.checked;

        dailySwitch.addEventListener(
            "change",
            () => {

                showDaily =
                    dailySwitch.checked;

                /* Keep visibleCount unchanged */

                renderWebshop();

            }
        );

    }


    if (regularSwitch) {

        showRegular =
            regularSwitch.checked;

        regularSwitch.addEventListener(
            "change",
            () => {

                showRegular =
                    regularSwitch.checked;

                /* Keep visibleCount unchanged */

                renderWebshop();

            }
        );

    }

}


/* =========================================================
   LIVE SEARCH EVENT
   ========================================================= */

function setupSearch() {

    const searchInput =
        document.getElementById(
            "wsSearchInput"
        );

    if (!searchInput) return;


    searchInput.addEventListener(
        "input",
        () => {

            webshopSearch =
                searchInput.value;

            /* New search starts at base item count */

            visibleCount = getPageSize();

            renderWebshop();

        }
    );

}


/* =========================================================
   RESPONSIVE HANDLING
   ========================================================= */

function setupResponsiveRendering() {

    window.addEventListener(
        "resize",
        () => {

            const currentPageSize =
                getPageSize();

            if (
                currentPageSize !== lastPageSize
            ) {

                /*
                   Preserve how many LOAD MORE
                   batches the user has opened.
                */

                const batches = Math.max(
                    1,
                    Math.ceil(
                        visibleCount / lastPageSize
                    )
                );

                visibleCount =
                    batches * currentPageSize;

                lastPageSize =
                    currentPageSize;

                renderWebshop();

            }

        }
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initWebshop() {

    const grid =
        document.getElementById(
            "webshopGrid"
        );

    if (!grid) return;


    /* INITIAL STATE */

    visibleCount = getPageSize();

    lastPageSize = getPageSize();


    /* EVENTS */

    setupCategoryFilters();

    setupSearch();

    setupResponsiveRendering();

    setupInfiniteScroll();


    /* FETCH JSON */

    const response = await fetch(
        DATA_URL,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {

        throw new Error(
            `Webshop data error: ${response.status}`
        );

    }


    const data = await response.json();


    /* =========================================================
       VALIDATE + FILTER + SORT

       TAPE RECORDINGS:
       No sheet music available.
       Exclude these releases from the webshop entirely.

       All other releases remain unchanged.
       ========================================================= */

    webshopRows = sortByDate(
        (Array.isArray(data) ? data : []).filter(row => {

            /* Exclude Tape Recordings */

            const isTape =
                normalizeText(row.tape) === "x";

            return !isTape;

        })
    );


    /* FIRST RENDER */

    renderWebshop();

}


/* =========================================================
   START
   ========================================================= */

initWebshop().catch(error => {

    console.error(
        "REWOD Webshop:",
        error
    );

    const status =
        document.getElementById(
            "wsResultsStatus"
        );

    if (status) {

        status.textContent =
            "Unable to load sheet music.";

    }

});