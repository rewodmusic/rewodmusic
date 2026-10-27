(() => {
    "use strict";

    /* =========================================================
       REWOD CONNECT — V1
       ========================================================= */

    const CONFIG = {
        schedule: "/data/schedule.json",

        releaseTime:
            "/backstage/backstage-edit-data/releasetime.json",

        live: "/data/live.json",

        youtube:
            "/backstage/backstage-edit-data/youtube.json",

        fallbackCover: "/img/upcoming.jpg",

        timezone: "Europe/Budapest",

        refreshInterval: 60000
    };


    /* =========================================================
       HELPERS
       ========================================================= */

    const $ = (id) => document.getElementById(id);

    function safeText(value) {
        return String(value ?? "").trim();
    }

    function marked(value) {
        return safeText(value).toLowerCase() === "x";
    }

    async function fetchJSON(path) {
        const response = await fetch(path, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Failed to load ${path}: ${response.status}`
            );
        }

        return response.json();
    }

    function parseDate(value) {
        const match = safeText(value).match(
            /^(\d{4})[_\-.](\d{2})[_\-.](\d{2})\.?$/
        );

        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const test = new Date(
            Date.UTC(year, month - 1, day)
        );

        if (
            test.getUTCFullYear() !== year ||
            test.getUTCMonth() !== month - 1 ||
            test.getUTCDate() !== day
        ) {
            return null;
        }

        return { year, month, day };
    }

    function parseTime(value) {
        const match = safeText(value).match(
            /^([01]?\d|2[0-3]):([0-5]\d)$/
        );

        if (!match) return null;

        return {
            hour: Number(match[1]),
            minute: Number(match[2])
        };
    }


    /* =========================================================
       BUDAPEST TIMEZONE
       ========================================================= */

    const budapestFormatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: CONFIG.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }
    );

    function getBudapestParts(date) {
        const result = {};

        for (const part of budapestFormatter.formatToParts(date)) {
            if (part.type !== "literal") {
                result[part.type] = Number(part.value);
            }
        }

        return result;
    }

    function timezoneOffset(date) {
        const p = getBudapestParts(date);

        const asUTC = Date.UTC(
            p.year,
            p.month - 1,
            p.day,
            p.hour,
            p.minute,
            p.second
        );

        const withoutMs =
            Math.floor(date.getTime() / 1000) * 1000;

        return asUTC - withoutMs;
    }

    function budapestDateTime(dateValue, timeValue) {
        const date = parseDate(dateValue);
        const time = parseTime(timeValue);

        if (!date || !time) return null;

        const guess = Date.UTC(
            date.year,
            date.month - 1,
            date.day,
            time.hour,
            time.minute
        );

        const offsets = [
            timezoneOffset(new Date(guess)),
            timezoneOffset(new Date(guess - 86400000)),
            timezoneOffset(new Date(guess + 86400000))
        ];

        const candidates = offsets
            .map(offset => new Date(guess - offset))
            .filter(candidate => {
                const p = getBudapestParts(candidate);

                return (
                    p.year === date.year &&
                    p.month === date.month &&
                    p.day === date.day &&
                    p.hour === time.hour &&
                    p.minute === time.minute
                );
            })
            .sort((a, b) => a - b);

        return candidates[0] || null;
    }

    async function getReleaseTime() {
        const data = await fetchJSON(CONFIG.releaseTime);

        const value = Array.isArray(data)
            ? data[0]?.releasetime
            : null;

        const time = parseTime(value);

        if (!time) {
            throw new Error("Invalid release time.");
        }

        return `${String(time.hour).padStart(2, "0")}:` +
               `${String(time.minute).padStart(2, "0")}`;
    }


    /* =========================================================
       UPCOMING MUSIC
       ========================================================= */

    function isMusicRelease(row) {
        return Boolean(
            safeText(row?.title) &&
            safeText(row?.artist)
        );
    }

    function findUpcomingMusic(rows, releaseTime) {
        const now = Date.now();

        return rows
            .filter(isMusicRelease)
            .map(row => ({
                row,
                date: budapestDateTime(
                    row.date,
                    safeText(row.hour) || releaseTime
                )
            }))
            .filter(item =>
                item.date &&
                item.date.getTime() > now
            )
            .sort((a, b) => a.date - b.date)[0] || null;
    }

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    function setBackground(src) {
        const background = $("connectPageBg");

        if (!background || !src) return;

        background.style.backgroundImage =
            `url("${src.replace(/"/g, "%22")}")`;
    }

    function renderUpcoming(item) {
        const app = $("upcomingApp");
        const empty = $("connectUpcomingEmpty");

        if (!item) {
            if (app) {
                const grid = app.querySelector(".upcoming-grid");
                if (grid) grid.hidden = true;
            }

            if (empty) empty.hidden = false;

            setBackground(CONFIG.fallbackCover);
            return;
        }

        const row = item.row;
        const date = parseDate(row.date);

        const dateLabel = date
            ? `${date.year}.` +
              `${String(date.month).padStart(2, "0")}.` +
              `${String(date.day).padStart(2, "0")}.`
            : safeText(row.date);

        setText("upcomingDate", dateLabel);
        setText("upcomingArtist", row.artist);
        setText("upcomingTitle", row.title);

        const feat = $("upcomingFeat");

        if (feat) {
            const name = safeText(row.feat);

            feat.textContent = name
                ? `REWOD feat. ${name}`
                : "";

            feat.style.display = name ? "block" : "none";
        }

        const cover = $("upcomingCover");

        if (cover) {
            const src =
                safeText(row.coverUrl) ||
                CONFIG.fallbackCover;

            cover.onload = () => {
                setBackground(cover.currentSrc || cover.src);
            };

            cover.onerror = () => {
                cover.onerror = null;
                cover.src = CONFIG.fallbackCover;
            };

            cover.src = src;

            if (cover.complete && cover.naturalWidth > 0) {
                setBackground(cover.currentSrc || cover.src);
            }
        }

        if (empty) empty.hidden = true;
    }


    /* =========================================================
       LATEST VLOG
       ========================================================= */

    function youtubeVideoId(value) {
        try {
            const url = new URL(safeText(value));
            const host = url.hostname.toLowerCase();

            let id = null;

            if (
                host === "youtu.be" ||
                host === "www.youtu.be"
            ) {
                id = url.pathname.split("/").filter(Boolean)[0];
            }

            if (
                host === "youtube.com" ||
                host === "www.youtube.com" ||
                host === "m.youtube.com"
            ) {
                const parts = url.pathname
                    .split("/")
                    .filter(Boolean);

                if (url.pathname === "/watch") {
                    id = url.searchParams.get("v");
                } else if (
                    ["shorts", "embed", "live"].includes(parts[0])
                ) {
                    id = parts[1];
                }
            }

            return /^[a-zA-Z0-9_-]{11}$/.test(id || "")
                ? id
                : null;

        } catch {
            return null;
        }
    }

    function youtubeURL(value) {
        try {
            const url = new URL(safeText(value));

            const allowed = [
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "youtu.be",
                "www.youtu.be"
            ];

            return (
                url.protocol === "https:" &&
                allowed.includes(url.hostname.toLowerCase())
            ) ? url.href : null;

        } catch {
            return null;
        }
    }

    async function loadVlog() {
        const iframe = $("backstageLatestVlog");
        const button = $("backstageVlogPlaylist");

        if (!iframe || !button) return;

        try {
            const data = await fetchJSON(CONFIG.youtube);

            const item = Array.isArray(data)
                ? data[0]
                : null;

            const id = youtubeVideoId(item?.latest);

            iframe.src = id
                ? `https://www.youtube-nocookie.com/embed/${id}?rel=0`
                : "about:blank";

            const playlist = youtubeURL(item?.playlist);

            if (playlist) {
                button.href = playlist;
                button.hidden = false;
            } else {
                button.hidden = true;
            }

        } catch (error) {
            console.error("CONNECT vlog:", error);
            button.hidden = true;
        }
    }


    /* =========================================================
       SCHEDULE — V1
       Central schedule + live events
       ========================================================= */

    function getEventTime(row, releaseTime) {
        return safeText(row.hour) || releaseTime;
    }

    function eventType(row) {
        if (isMusicRelease(row)) {
            return "MUSIC RELEASE";
        }

        if (marked(row.photo)) {
            return "PHOTO RELEASE";
        }

        if (marked(row["video promo"])) {
            return "VIDEO PROMO";
        }

        if (marked(row.review)) {
            return "MUSIC REVIEW";
        }

        if (marked(row.vlog)) {
            return "NEW VLOG";
        }

        return null;
    }

    function centralEvents(rows, releaseTime) {
        return rows.flatMap(row => {
            const type = eventType(row);

            if (!type) return [];

            const date = budapestDateTime(
                row.date,
                getEventTime(row, releaseTime)
            );

            return date ? [{ date, type }] : [];
        });
    }

    function liveEvents(data) {
        if (!Array.isArray(data)) return [];

        return data.flatMap(row => {
            const dateValue = safeText(row.date);
            const timeValue = safeText(row.hour);

            if (!dateValue || !timeValue) return [];

            const date = budapestDateTime(
                dateValue,
                timeValue
            );

            if (!date) return [];

            return [{
                date,
                type: "LIVESTREAM"
            }];
        });
    }

    function formatScheduleDate(date) {
        const today = new Date();

        const currentDay = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );

        const eventDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        const difference = Math.round(
            (eventDay - currentDay) / 86400000
        );

        if (difference === 0) return "TODAY";
        if (difference === 1) return "TOMORROW";

        return date.toLocaleDateString(
            "en-US",
            { weekday: "long" }
        ).toUpperCase();
    }

    function formatScheduleTime(date) {
        return date.toLocaleTimeString(
            "en-US",
            {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            }
        )
        .toLowerCase()
        .replace(":00", "")
        .replace(/\s/g, "");
    }

    function renderSchedule(events) {
        const container = $("backstageSchedule");
        const empty = $("backstageScheduleEmpty");

        if (!container || !empty) return;

        const now = Date.now();
        const end = now + 7 * 86400000;

        const upcoming = events
            .filter(item => {
                const time = item.date.getTime();

                return time >= now && time <= end;
            })
            .sort((a, b) => a.date - b.date);

        container.replaceChildren();

        if (!upcoming.length) {
            container.hidden = true;
            empty.hidden = false;
            return;
        }

        container.hidden = false;
        empty.hidden = true;

        const fragment = document.createDocumentFragment();

        for (const item of upcoming) {
            const row = document.createElement("div");
            row.className = "backstage-schedule-row";

            const date = document.createElement("div");
            date.className = "backstage-schedule-date";
            date.textContent = formatScheduleDate(item.date);

            const time = document.createElement("div");
            time.className = "backstage-schedule-time";
            time.textContent = formatScheduleTime(item.date);

            const type = document.createElement("div");
            type.className = "backstage-schedule-type";
            type.textContent = item.type;

            row.title = item.date.toLocaleString(
                "en-US",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short"
                }
            );

            row.append(date, time, type);
            fragment.appendChild(row);
        }

        container.appendChild(fragment);
    }

    function updateTimezoneLabel() {
        const label = document.querySelector(
            ".connect-schedule-section .backstage-timezone-note"
        );

        if (!label) return;

        const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Local time";

        const city = timezone
            .split("/")
            .pop()
            .replace(/_/g, " ")
            .toUpperCase();

        label.textContent =
            `ALL TIMES IN YOUR LOCAL TIMEZONE: ${city}`;
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    let cachedEvents = [];

    async function loadConnectData() {
        const [rows, releaseTime, live] = await Promise.all([
            fetchJSON(CONFIG.schedule),
            getReleaseTime(),
            fetchJSON(CONFIG.live).catch(error => {
                console.warn("CONNECT live:", error);
                return [];
            })
        ]);

        if (!Array.isArray(rows)) {
            throw new Error("Invalid schedule.json");
        }

        renderUpcoming(
            findUpcomingMusic(rows, releaseTime)
        );

        cachedEvents = [
            ...centralEvents(rows, releaseTime),
            ...liveEvents(live)
        ];

        renderSchedule(cachedEvents);
    }

    async function initConnect() {
        updateTimezoneLabel();

        loadVlog();

        try {
            await loadConnectData();
        } catch (error) {
            console.error("CONNECT initialization:", error);
        }

        setInterval(() => {
            renderSchedule(cachedEvents);
        }, CONFIG.refreshInterval);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initConnect,
            { once: true }
        );
    } else {
        initConnect();
    }

})();