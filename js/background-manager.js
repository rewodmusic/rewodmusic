/* ============================================================
   REWOD BACKGROUND MANAGER V1
   ============================================================

   Configuration:
   /data/backgrounds.json

   Supported pages:
   - HOME (releases section)
   - LATEST RELEASE
   - SONG
   - CONNECT

   Features:
   - Desktop / mobile configurations
   - Automatic release artwork detection
   - Custom image URL
   - Image positioning
   - Image scaling
   - Brightness / contrast / saturation
   - Blur / grayscale / sepia / hue rotation
   - Color overlay
   - Multi-stop gradient
   - Responsive configuration switching
   - Automatic image source updates

   ============================================================ */

(() => {
    "use strict";

    const CONFIG_URL = "/data/backgrounds.json";

    const MOBILE_BREAKPOINT = 700;

    const ROOT_ID = "rewod-background-manager";

    const STYLE_ID = "rewod-background-manager-style";

    const PAGE_CONFIG = {
        home: {
            configKey: "home_section",
            containerSelector: ".releases",
            existingBackgroundSelector: "#releasesBg",
            imageSelectors: [
                "#latestCover"
            ]
        },

        latest: {
            configKey: "latest_song",
            containerSelector: "body",
            existingBackgroundSelector: null,
            imageSelectors: [
                "#latestCover",
                "#homeLatestCover"
            ]
        },

        song: {
            configKey: "latest_song",
            containerSelector: "body",
            existingBackgroundSelector: "#songPageBg",
            imageSelectors: [
                "#latestCover",
                "#homeLatestCover"
            ]
        },

        connect: {
            configKey: "connect",
            containerSelector: "body",
            existingBackgroundSelector: "#upcomingPageBg",
            imageSelectors: [
                "#upcomingCover"
            ]
        }
    };

    let configuration = null;

    let currentPage = null;

    let currentDevice = null;

    let backgroundRoot = null;

    let imageLayer = null;

    let overlayLayer = null;

    let gradientLayer = null;

    let imageObserver = null;

    let resizeTimer = null;

    let lastImageURL = "";

    /* ========================================================
       PAGE DETECTION
       ======================================================== */

    function detectPage() {

        const body = document.body;

        if (!body) return null;

        if (
            body.classList.contains("connect-page") ||
            location.pathname.startsWith("/connect")
        ) {
            return "connect";
        }

        if (
            body.classList.contains("page-song") ||
            location.pathname.startsWith("/song")
        ) {
            return "song";
        }

        if (
            body.classList.contains("page-latest") ||
            location.pathname.startsWith("/latest")
        ) {
            return "latest";
        }

        if (
            body.classList.contains("page-home") ||
            location.pathname === "/" ||
            location.pathname === "/index.html"
        ) {
            return "home";
        }

        return null;
    }

    /* ========================================================
       DEVICE DETECTION
       ======================================================== */

    function detectDevice() {

        return window.innerWidth <= MOBILE_BREAKPOINT
            ? "mobile"
            : "desktop";
    }

    /* ========================================================
       CONFIGURATION
       ======================================================== */

    async function loadConfiguration() {

        const response = await fetch(CONFIG_URL, {
            cache: "no-cache"
        });

        if (!response.ok) {
            throw new Error(
                `Background configuration HTTP ${response.status}`
            );
        }

        return response.json();
    }

    function getPageConfiguration() {

        if (!configuration || !currentPage) {
            return null;
        }

        const device = detectDevice();

        const pageKey = PAGE_CONFIG[currentPage].configKey;

        return configuration[device]?.[pageKey] || null;
    }

    /* ========================================================
       IMAGE SOURCE
       ======================================================== */

    function normalizeImageURL(value) {

        if (!value) return "";

        try {
            return new URL(value, location.origin).href;
        } catch {
            return "";
        }
    }

    function getImageFromElement(selector) {

        const element = document.querySelector(selector);

        if (!element) return "";

        if (element.tagName === "IMG") {

            const source =
                element.currentSrc ||
                element.getAttribute("src");

            return normalizeImageURL(source);
        }

        return "";
    }

    function getReleaseImage() {

        const page = PAGE_CONFIG[currentPage];

        if (!page) return "";

        for (const selector of page.imageSelectors) {

            const imageURL = getImageFromElement(selector);

            if (imageURL) {
                return imageURL;
            }
        }

        return "";
    }

    function getConfiguredImage(config) {

        if (!config) return "";

        if (config.image_url) {
            return normalizeImageURL(config.image_url);
        }

        return getReleaseImage();
    }

    /* ========================================================
       CSS INJECTION
       ======================================================== */

    function injectStyles() {

        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");

        style.id = STYLE_ID;

        style.textContent = `

            /* REWOD BACKGROUND MANAGER */

            .rewod-managed-background {
                pointer-events: none;
                overflow: hidden;
                isolation: isolate;
            }

            .rewod-managed-background-image,
            .rewod-managed-background-overlay,
            .rewod-managed-background-gradient {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            .rewod-managed-background-image {
                background-repeat: no-repeat;
                background-position: center;
                background-size: cover;
                transform-origin: center;
                will-change: transform;
            }

            .rewod-managed-background-overlay {
                z-index: 1;
            }

            .rewod-managed-background-gradient {
                z-index: 2;
            }

            body.rewod-background-active {
                background-color: #000;
            }

            body.rewod-background-active
            .rewod-managed-background {
                z-index: 0;
            }

            body.rewod-background-active
            > :not(.rewod-managed-background):not(.upcoming-page-bg):not(.song-page-bg) {
                position: relative;
                z-index: 1;
            }

            body.rewod-background-active.page-home
            .releases {
                isolation: isolate;
            }

            body.rewod-background-active.page-home
            .releases > :not(.rewod-managed-background):not(.releases-bg) {
                position: relative;
                z-index: 1;
            }

        `;

        document.head.appendChild(style);
    }

    /* ========================================================
       BACKGROUND ELEMENT CREATION
       ======================================================== */

    function createBackground() {

        const page = PAGE_CONFIG[currentPage];

        if (!page) return;

        const container = document.querySelector(
            page.containerSelector
        );

        if (!container) return;

        backgroundRoot = document.createElement("div");

        backgroundRoot.id = ROOT_ID;

        backgroundRoot.className = "rewod-managed-background";

        imageLayer = document.createElement("div");

        imageLayer.className =
            "rewod-managed-background-image";

        overlayLayer = document.createElement("div");

        overlayLayer.className =
            "rewod-managed-background-overlay";

        gradientLayer = document.createElement("div");

        gradientLayer.className =
            "rewod-managed-background-gradient";

        backgroundRoot.appendChild(imageLayer);

        backgroundRoot.appendChild(overlayLayer);

        backgroundRoot.appendChild(gradientLayer);

        if (currentPage === "home") {

            const computedPosition =
                getComputedStyle(container).position;

            if (computedPosition === "static") {
                container.style.position = "relative";
            }

            backgroundRoot.style.position = "absolute";

            backgroundRoot.style.inset = "0";

            backgroundRoot.style.width = "100%";

            backgroundRoot.style.height = "100%";

            container.prepend(backgroundRoot);

        } else {

            backgroundRoot.style.position = "fixed";

            backgroundRoot.style.inset = "0";

            backgroundRoot.style.width = "100%";

            backgroundRoot.style.height = "100vh";

            backgroundRoot.style.height = "100dvh";

            document.body.prepend(backgroundRoot);
        }

        document.body.classList.add(
            "rewod-background-active"
        );
    }

    /* ========================================================
       LEGACY BACKGROUND DISABLING
       ======================================================== */

    function disableLegacyBackground() {

        const page = PAGE_CONFIG[currentPage];

        if (!page) return;

        const selector = page.existingBackgroundSelector;

        if (!selector) return;

        const element = document.querySelector(selector);

        if (!element) return;

        element.style.setProperty(
            "display",
            "none",
            "important"
        );
    }

    /* ========================================================
       CSS FILTERS
       ======================================================== */

    function buildFilters(appearance = {}) {

        const brightness =
            appearance.brightness ?? 100;

        const contrast =
            appearance.contrast ?? 100;

        const saturation =
            appearance.saturation ?? 100;

        const blur =
            appearance.blur ?? 0;

        const grayscale =
            appearance.grayscale ?? 0;

        const sepia =
            appearance.sepia ?? 0;

        const hue =
            appearance.hue_rotate ?? 0;

        return [
            `brightness(${brightness}%)`,
            `contrast(${contrast}%)`,
            `saturate(${saturation}%)`,
            `blur(${blur}px)`,
            `grayscale(${grayscale}%)`,
            `sepia(${sepia}%)`,
            `hue-rotate(${hue}deg)`
        ].join(" ");
    }

    /* ========================================================
       GRADIENT
       ======================================================== */

    function hexToRGBA(hex, opacity = 1) {

        let color = String(hex || "#000000")
            .replace("#", "");

        if (color.length === 3) {

            color = color
                .split("")
                .map(character => character + character)
                .join("");
        }

        const number = parseInt(color, 16);

        const red = (number >> 16) & 255;

        const green = (number >> 8) & 255;

        const blue = number & 255;

        return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    }

    function buildGradient(gradient = {}) {

        if (!gradient.enabled) {
            return "none";
        }

        const direction = gradient.direction ?? 180;

        const stops = gradient.stops || [];

        if (!stops.length) {
            return "none";
        }

        const cssStops = stops.map(stop => {

            const color = hexToRGBA(
                stop.color,
                stop.opacity
            );

            return `${color} ${stop.position}%`;

        });

        return `linear-gradient(${direction}deg, ${cssStops.join(", ")})`;
    }

    /* ========================================================
       APPLY IMAGE
       ======================================================== */

    function applyImage(config) {

        if (!imageLayer) return;

        const imageURL = getConfiguredImage(config);

        if (imageURL !== lastImageURL) {

            lastImageURL = imageURL;

            imageLayer.style.backgroundImage = imageURL
                ? `url("${imageURL.replace(/"/g, '\\"')}")`
                : "none";
        }

        const x = config.position?.x ?? 50;

        const y = config.position?.y ?? 50;

        const scale = config.scale ?? 100;

        const fit = config.display?.fit ?? "cover";

        const repeat =
            config.display?.repeat ?? "no-repeat";

        imageLayer.style.backgroundPosition =
            `${x}% ${y}%`;

        imageLayer.style.backgroundSize = fit;

        imageLayer.style.backgroundRepeat = repeat;

        imageLayer.style.transform =
            `scale(${scale / 100})`;

        imageLayer.style.filter =
            buildFilters(config.appearance);
    }

    /* ========================================================
       APPLY OVERLAY
       ======================================================== */

    function applyOverlay(config) {

        if (!overlayLayer) return;

        const overlay = config.overlay || {};

        if (!overlay.enabled) {

            overlayLayer.style.background = "none";

            return;
        }

        overlayLayer.style.background = hexToRGBA(
            overlay.color || "#000000",
            overlay.opacity ?? 0
        );
    }

    /* ========================================================
       APPLY GRADIENT
       ======================================================== */

    function applyGradient(config) {

        if (!gradientLayer) return;

        gradientLayer.style.background =
            buildGradient(config.gradient);
    }

    /* ========================================================
       APPLY DISPLAY
       ======================================================== */

    function applyDisplay(config) {

        if (!backgroundRoot) return;

        const attachment =
            config.display?.attachment ?? "scroll";

        if (currentPage === "home") {

            backgroundRoot.style.position = "absolute";

            backgroundRoot.style.inset = "0";

            return;
        }

        if (attachment === "fixed") {

            backgroundRoot.style.position = "fixed";

            backgroundRoot.style.inset = "0";

            backgroundRoot.style.height = "100dvh";

        } else {

            backgroundRoot.style.position = "absolute";

            backgroundRoot.style.top = "0";

            backgroundRoot.style.left = "0";

            backgroundRoot.style.right = "0";

            backgroundRoot.style.bottom = "0";

            backgroundRoot.style.height = "100%";
        }
    }

    /* ========================================================
       MAIN RENDER
       ======================================================== */

    function render() {

        const config = getPageConfiguration();

        if (!config || !backgroundRoot) {
            return;
        }

        if (config.enabled === false) {

            backgroundRoot.style.display = "none";

            return;
        }

        backgroundRoot.style.display = "block";

        applyDisplay(config);

        applyImage(config);

        applyOverlay(config);

        applyGradient(config);
    }

    /* ========================================================
       OBSERVE IMAGE CHANGES

       Existing JSON-driven scripts may replace artwork
       after the background manager has initialized.
       ======================================================== */

    function observeReleaseImages() {

        const page = PAGE_CONFIG[currentPage];

        if (!page) return;

        imageObserver = new MutationObserver(() => {

            render();

        });

        for (const selector of page.imageSelectors) {

            const element = document.querySelector(selector);

            if (!element) continue;

            imageObserver.observe(element, {
                attributes: true,
                attributeFilter: [
                    "src",
                    "srcset"
                ]
            });

            if (element.tagName === "IMG") {

                element.addEventListener(
                    "load",
                    render,
                    { passive: true }
                );
            }
        }
    }

    /* ========================================================
       RESPONSIVE CHANGES
       ======================================================== */

    function handleResize() {

        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(() => {

            const device = detectDevice();

            if (device !== currentDevice) {

                currentDevice = device;

                render();
            }

        }, 100);
    }

    /* ========================================================
       INITIALIZATION
       ======================================================== */

    async function init() {

        currentPage = detectPage();

        if (!currentPage) {
            return;
        }

        try {

            configuration = await loadConfiguration();

            currentDevice = detectDevice();

            injectStyles();

            createBackground();

            if (!backgroundRoot) {
                return;
            }

            disableLegacyBackground();

            observeReleaseImages();

            render();

            window.addEventListener(
                "resize",
                handleResize,
                { passive: true }
            );

            console.log(
                "[REWOD] Background Manager initialized:",
                currentPage,
                currentDevice
            );

        } catch (error) {

            console.error(
                "[REWOD] Background Manager error:",
                error
            );
        }
    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();
    }

})();