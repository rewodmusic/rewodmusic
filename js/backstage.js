(() => {
    "use strict";

    /* =========================================================
       BACKSTAGE – PATHS
       ========================================================= */

    const PATHS = {
        live: "/data/live.json",
        schedule: "/data/schedule.json",

        vacation:
            "/backstage/backstage-edit-data/vacation.json",

        releaseTime:
            "/backstage/backstage-edit-data/releasetime.json",

        status:
            "/backstage/backstage-edit-data/status.json",

        goal:
            "/backstage/backstage-edit-data/current-goal.json",

        anime:
            "/backstage/backstage-edit-data/0_anime.json",

        series:
            "/backstage/backstage-edit-data/1_series.json",

        music:
            "/backstage/backstage-edit-data/2_music.json",

        characterBase:
            "/backstage/backstage-edit-pics/char-preview/",

        goalBase:
            "/backstage/backstage-edit-pics/current-goal/",

        animeBase:
            "/backstage/backstage-edit-pics/0_anime/",

        seriesBase:
            "/backstage/backstage-edit-pics/1_series/",

        musicBase:
            "/backstage/backstage-edit-pics/2_music/"
    };


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const SOURCE_TIMEZONE = "Europe/Budapest";

    const SCHEDULE_DAYS = 7;

    const SCHEDULE_REFRESH_INTERVAL = 60 * 1000;


    /* =========================================================
       PAGE REVEAL
       ========================================================= */

    function revealBackstagePage() {
        const page =
            document.querySelector(".backstage-page") ||
            document.querySelector("main") ||
            document.body;

        if (!page) return;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                page.classList.add("backstage-page-loaded");
            });
        });
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    async function fetchJSON(url) {
        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Could not load ${url} (${response.status})`
            );
        }

        return response.json();
    }


    function safeText(value) {
        return String(value ?? "").trim();
    }


    function isMarked(value) {
        return safeText(value).toLowerCase() === "x";
    }


    function pad2(number) {
        return String(number).padStart(2, "0");
    }


    function parseDateString(dateString) {
        const value = safeText(dateString);

        const match = value.match(
            /^(\d{4})_(\d{2})_(\d{2})$/
        );

        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const testDate = new Date(
            Date.UTC(year, month - 1, day)
        );

        if (
            testDate.getUTCFullYear() !== year ||
            testDate.getUTCMonth() + 1 !== month ||
            testDate.getUTCDate() !== day
        ) {
            return null;
        }

        return {
            year,
            month,
            day
        };
    }


    function formatDateKey(year, month, day) {
        return (
            `${year}_${pad2(month)}_${pad2(day)}`
        );
    }


    function isLivestream(item) {
        return isMarked(item?.livestream);
    }


    /* =========================================================
       TIME PARSING
       ========================================================= */

    function extractTimeFromText(text) {
        if (!text) return null;

        const value = String(text);

        const twelveHour = value.match(
            /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
        );

        if (twelveHour) {
            let hour = Number(twelveHour[1]);

            const minute =
                Number(twelveHour[2] || 0);

            const meridiem =
                twelveHour[3].toLowerCase();

            if (
                hour < 1 ||
                hour > 12 ||
                minute > 59
            ) {
                return null;
            }

            if (hour === 12) {
                hour =
                    meridiem === "am" ? 0 : 12;
            } else if (meridiem === "pm") {
                hour += 12;
            }

            return {
                hour,
                minute
            };
        }

        const twentyFourHour = value.match(
            /\b([01]?\d|2[0-3]):([0-5]\d)\b/
        );

        if (twentyFourHour) {
            return {
                hour: Number(twentyFourHour[1]),
                minute: Number(twentyFourHour[2])
            };
        }

        return null;
    }


    /* =========================================================
       CENTRAL RELEASE TIME
       ========================================================= */

    function parseReleaseTime(value) {
        const text = safeText(value);

        const match = text.match(
            /^([01]\d|2[0-3]):([0-5]\d)$/
        );

        if (!match) {
            return null;
        }

        return {
            hour: Number(match[1]),
            minute: Number(match[2])
        };
    }


    async function loadReleaseTime() {
        const data = await fetchJSON(
            PATHS.releaseTime
        );

        if (
            !Array.isArray(data) ||
            !data.length
        ) {
            throw new Error(
                "releasetime.json must contain a non-empty array."
            );
        }

        const releaseTime =
            parseReleaseTime(
                data[0]?.releasetime
            );

        if (!releaseTime) {
            throw new Error(
                "Invalid releasetime.json value. Expected HH:MM."
            );
        }

        return releaseTime;
    }


    /* =========================================================
       VISITOR LOCAL TIMEZONE
       ========================================================= */

function formatScheduleDate(date) {
    const now = new Date();

    const eventDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const difference = Math.round(
        (eventDay - today) / 86400000
    );

    if (difference === 0) {
        return "TODAY";
    }

    if (difference === 1) {
        return "TOMORROW";
    }

    return date.toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
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


    function formatFullLocalDateTime(date) {
        return date.toLocaleString(
            "en-US",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZoneName: "short"
            }
        );
    }


    function getVisitorTimezone() {
        try {
            return Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone || "Local time";
        } catch (error) {
            return "Local time";
        }
    }


    function getVisitorTimezoneCity() {
        const timezone = getVisitorTimezone();

        if (
            !timezone ||
            timezone === "Local time"
        ) {
            return "LOCAL TIME";
        }

        return timezone
            .split("/")
            .pop()
            .replace(/_/g, " ")
            .toUpperCase();
    }


    function initTimezoneLabels() {
        const timezone = getVisitorTimezone();

        const city = getVisitorTimezoneCity();

        const labels =
            document.querySelectorAll(
                ".backstage-timezone-note"
            );

        labels.forEach(label => {
            label.textContent =
                `ALL TIMES IN YOUR LOCAL TIMEZONE: ${city}`;

            label.title =
                `Detected timezone: ${timezone}`;
        });
    }


    /* =========================================================
       NEXT LIVESTREAM – LOCAL DATE / TIME
       ========================================================= */

    function formatLivestreamLocalDateTime(date) {
        if (
            !(date instanceof Date) ||
            Number.isNaN(date.getTime())
        ) {
            return "";
        }

        const datePart = date.toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

        const timePart = date.toLocaleTimeString(
            "en-GB",
            {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        );

        const city = getVisitorTimezoneCity();

        return (
            `${datePart} at ${timePart} (${city} TIME)`
        ).toUpperCase();
    }


    /* =========================================================
       BUDAPEST TIMEZONE HELPERS
       ========================================================= */

    const budapestFormatter =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone: SOURCE_TIMEZONE,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hourCycle: "h23"
            }
        );


    function getTimezoneOffsetMs(date) {
        const parts =
            budapestFormatter.formatToParts(date);

        const values = {};

        parts.forEach(part => {
            if (part.type !== "literal") {
                values[part.type] =
                    Number(part.value);
            }
        });

        const asUTC = Date.UTC(
            values.year,
            values.month - 1,
            values.day,
            values.hour,
            values.minute,
            values.second
        );

        const timestampWithoutMs =
            Math.floor(
                date.getTime() / 1000
            ) * 1000;

        return asUTC - timestampWithoutMs;
    }


    function getBudapestParts(date) {
        const parts =
            budapestFormatter.formatToParts(date);

        const values = {};

        parts.forEach(part => {
            if (part.type !== "literal") {
                values[part.type] =
                    Number(part.value);
            }
        });

        return values;
    }


    function getBudapestDateKey(date) {
        const parts = getBudapestParts(date);

        return formatDateKey(
            parts.year,
            parts.month,
            parts.day
        );
    }


    function matchesBudapestTime(
        date,
        target,
        hour,
        minute
    ) {
        const parts = getBudapestParts(date);

        return (
            parts.year === target.year &&
            parts.month === target.month &&
            parts.day === target.day &&
            parts.hour === hour &&
            parts.minute === minute
        );
    }


    function buildBudapestDateTime(
        dateString,
        hour,
        minute
    ) {
        const date =
            parseDateString(dateString);

        if (!date) return null;

        if (
            !Number.isInteger(hour) ||
            !Number.isInteger(minute) ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            return null;
        }

        const utcGuess = Date.UTC(
            date.year,
            date.month - 1,
            date.day,
            hour,
            minute,
            0,
            0
        );

        const firstOffset =
            getTimezoneOffsetMs(
                new Date(utcGuess)
            );

        const firstTimestamp =
            utcGuess - firstOffset;

        const secondOffset =
            getTimezoneOffsetMs(
                new Date(firstTimestamp)
            );

        const candidates = [
            new Date(
                utcGuess - firstOffset
            ),
            new Date(
                utcGuess - secondOffset
            )
        ];

        const nearbyOffsets = [
            getTimezoneOffsetMs(
                new Date(
                    utcGuess - 24 * 60 * 60 * 1000
                )
            ),
            getTimezoneOffsetMs(
                new Date(
                    utcGuess + 24 * 60 * 60 * 1000
                )
            )
        ];

        nearbyOffsets.forEach(offset => {
            candidates.push(
                new Date(utcGuess - offset)
            );
        });

        const valid = candidates
            .filter(candidate =>
                matchesBudapestTime(
                    candidate,
                    date,
                    hour,
                    minute
                )
            )
            .sort((a, b) => a - b);

        return valid[0] || null;
    }


    function buildDateTime(
        dateString,
        timeText
    ) {
        const time =
            extractTimeFromText(timeText);

        if (!time) return null;

        return buildBudapestDateTime(
            dateString,
            time.hour,
            time.minute
        );
    }


    /* =========================================================
       FLEXIBLE IMAGE LOADING
       ========================================================= */

    const IMAGE_EXTENSIONS = [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".avif",
        ".gif",
        ".jpg.webp",
        ".jpeg.webp",
        ".png.webp",
        ".jpg.avif",
        ".png.avif"
    ];


    function setFlexibleImage(
        img,
        basePath,
        itemNumber
    ) {
        let candidateIndex = 0;

        const tryNext = () => {
            if (
                candidateIndex >=
                IMAGE_EXTENSIONS.length
            ) {
                img.onerror = null;
                img.removeAttribute("src");
                img.classList.add("is-missing");
                return;
            }

            img.src =
                `${basePath}${itemNumber}${IMAGE_EXTENSIONS[candidateIndex]}`;

            candidateIndex += 1;
        };

        img.onerror = tryNext;

        tryNext();
    }


    /* =========================================================
       LIVE DATA
       ========================================================= */

    function normaliseLivestreams(liveData) {
        if (!Array.isArray(liveData)) {
            return [];
        }

        return liveData
            .filter(isLivestream)
            .map(item => {
                const dateTime =
                    buildDateTime(
                        item.date,
                        item.subtitle
                    );

                return {
                    raw: item,
                    dateTime
                };
            })
            .filter(item => item.dateTime)
            .sort(
                (a, b) =>
                    a.dateTime - b.dateTime
            );
    }


    /* =========================================================
       NEXT LIVESTREAM COUNTDOWN
       ========================================================= */

    let countdownTimer = null;


    function initCountdown(livestreams) {
        const countdown =
            document.getElementById(
                "backstageCountdown"
            );

        const empty =
            document.getElementById(
                "backstageCountdownEmpty"
            );

        const daysEl =
            document.getElementById(
                "countdownDays"
            );

        const hoursEl =
            document.getElementById(
                "countdownHours"
            );

        const minutesEl =
            document.getElementById(
                "countdownMinutes"
            );

        const secondsEl =
            document.getElementById(
                "countdownSeconds"
            );

        const localTimeEl =
            document.getElementById(
                "backstageNextLiveLocalTime"
            );

        if (
            !countdown ||
            !empty ||
            !daysEl ||
            !hoursEl ||
            !minutesEl ||
            !secondsEl
        ) {
            return;
        }

        if (countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }


        function findNext() {
            const now = new Date();

            return livestreams.find(
                stream =>
                    stream.dateTime > now
            );
        }


        function render() {
            const next = findNext();

            if (!next) {
                countdown.hidden = true;
                empty.hidden = false;

                if (localTimeEl) {
                    localTimeEl.hidden = true;
                    localTimeEl.textContent = "";
                }

                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                }

                return;
            }

            countdown.hidden = false;
            empty.hidden = true;

            if (localTimeEl) {
                localTimeEl.hidden = false;

                localTimeEl.textContent =
                    formatLivestreamLocalDateTime(
                        next.dateTime
                    );

                localTimeEl.style.textTransform =
                    "uppercase";

                localTimeEl.style.letterSpacing =
                    "1.5px";

                localTimeEl.style.fontWeight =
                    "600";

                localTimeEl.style.fontSize =
                    "11px";

                localTimeEl.style.lineHeight =
                    "1.8";

                localTimeEl.style.textAlign =
                    "center";

                localTimeEl.style.color =
                    "rgba(255, 255, 255, 0.75)";
            }

            const now = new Date();

            const difference =
                next.dateTime.getTime() -
                now.getTime();

            if (difference <= 0) {
                return;
            }

            const totalSeconds =
                Math.floor(difference / 1000);

            const days =
                Math.floor(totalSeconds / 86400);

            const hours =
                Math.floor(
                    (totalSeconds % 86400) / 3600
                );

            const minutes =
                Math.floor(
                    (totalSeconds % 3600) / 60
                );

            const seconds =
                totalSeconds % 60;

            daysEl.textContent =
                String(days);

            hoursEl.textContent =
                pad2(hours);

            minutesEl.textContent =
                pad2(minutes);

            secondsEl.textContent =
                pad2(seconds);
        }


        render();

        if (
            livestreams.some(
                stream =>
                    stream.dateTime > new Date()
            )
        ) {
            countdownTimer =
                setInterval(render, 1000);
        }
    }


    /* =========================================================
       CHARACTER VIDEO AUTOPLAY
       ========================================================= */

    function prepareCharacterVideo(video) {
        if (!video) return;

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");
        video.setAttribute(
            "webkit-playsinline",
            ""
        );


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

        video.addEventListener(
            "loadeddata",
            tryPlay
        );

        video.addEventListener(
            "canplay",
            tryPlay
        );

        document.addEventListener(
            "visibilitychange",
            () => {
                if (
                    !document.hidden &&
                    video.paused
                ) {
                    tryPlay();
                }
            }
        );


        let unlocked = false;

        function unlockVideo() {
            if (unlocked) return;

            unlocked = true;

            tryPlay();

            document.removeEventListener(
                "touchstart",
                unlockVideo
            );

            document.removeEventListener(
                "pointerdown",
                unlockVideo
            );

            document.removeEventListener(
                "click",
                unlockVideo
            );
        }


        document.addEventListener(
            "touchstart",
            unlockVideo,
            {
                passive: true,
                once: true
            }
        );

        document.addEventListener(
            "pointerdown",
            unlockVideo,
            {
                once: true
            }
        );

        document.addEventListener(
            "click",
            unlockVideo,
            {
                once: true
            }
        );
    }


    /* =========================================================
       CHARACTER RACE CHANGER
       ========================================================= */

    function initCharacterPreview() {
        const video =
            document.getElementById(
                "characterVideo"
            );

        const buttons = Array.from(
            document.querySelectorAll(
                ".backstage-race-button"
            )
        );

        if (
            !video ||
            !buttons.length
        ) {
            return;
        }

        prepareCharacterVideo(video);

        buttons.forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const race =
                        button.dataset.race;

                    if (!race) return;

                    const alreadyActive =
                        button.classList.contains(
                            "is-active"
                        );

                    if (alreadyActive) {
                        const playPromise =
                            video.play();

                        if (
                            playPromise &&
                            typeof playPromise.catch ===
                                "function"
                        ) {
                            playPromise.catch(
                                () => {}
                            );
                        }

                        return;
                    }

                    buttons.forEach(
                        otherButton => {
                            otherButton.classList.toggle(
                                "is-active",
                                otherButton === button
                            );
                        }
                    );

                    video.classList.add(
                        "is-switching"
                    );

                    setTimeout(() => {
                        video.pause();

                        video.muted = true;
                        video.defaultMuted = true;
                        video.playsInline = true;

                        video.setAttribute(
                            "muted",
                            ""
                        );

                        video.setAttribute(
                            "playsinline",
                            ""
                        );

                        video.setAttribute(
                            "webkit-playsinline",
                            ""
                        );

                        video.src =
                            `${PATHS.characterBase}${race}.mp4`;

                        video.load();

                        const showNewVideo = () => {
                            const playPromise =
                                video.play();

                            if (
                                playPromise &&
                                typeof playPromise.catch ===
                                    "function"
                            ) {
                                playPromise.catch(
                                    () => {}
                                );
                            }

                            requestAnimationFrame(
                                () => {
                                    video.classList.remove(
                                        "is-switching"
                                    );
                                }
                            );
                        };

                        if (
                            video.readyState >= 2
                        ) {
                            showNewVideo();
                        } else {
                            video.addEventListener(
                                "loadeddata",
                                showNewVideo,
                                {
                                    once: true
                                }
                            );
                        }

                    }, 220);
                }
            );
        });
    }


    /* =========================================================
       CURRENT GOAL
       ========================================================= */

    async function initCurrentGoal() {
        const nameEl =
            document.getElementById(
                "currentGoalName"
            );

        const fillEl =
            document.getElementById(
                "currentGoalProgress"
            );

        const percentEl =
            document.getElementById(
                "currentGoalPercent"
            );

        const imageEl =
            document.getElementById(
                "currentGoalImage"
            );

        if (
            !nameEl ||
            !fillEl ||
            !percentEl
        ) {
            return;
        }

        try {
            const data =
                await fetchJSON(PATHS.goal);

            const goal =
                Array.isArray(data)
                    ? data[0]
                    : null;

            if (!goal) {
                throw new Error(
                    "No current goal."
                );
            }

            const price =
                Number(goal.price);

            const balance =
                Number(goal.balance);

            let percentage = 0;

            if (
                Number.isFinite(price) &&
                price > 0 &&
                Number.isFinite(balance)
            ) {
                percentage =
                    Math.round(
                        (balance / price) * 100
                    );
            }

            percentage =
                Math.max(
                    0,
                    Math.min(100, percentage)
                );

            nameEl.textContent =
                goal.name || "Current goal";

            percentEl.textContent =
                `${percentage}%`;

            requestAnimationFrame(() => {
                fillEl.style.width =
                    `${percentage}%`;
            });

            if (imageEl) {
                setFlexibleImage(
                    imageEl,
                    PATHS.goalBase,
                    "1"
                );
            }

        } catch (error) {
            console.error(error);

            nameEl.textContent =
                "Goal unavailable";

            percentEl.textContent =
                "—";

            fillEl.style.width =
                "0%";
        }
    }


    /* =========================================================
       CHARACTER ONLINE STATUS
       ========================================================= */

    async function initCharacterStatus() {
        const statusEl =
            document.getElementById(
                "characterStatus"
            );

        if (!statusEl) return;

        try {
            const data =
                await fetchJSON(PATHS.status);

            const status =
                Array.isArray(data)
                    ? data[0]
                    : null;

            const online =
                isMarked(status?.online);

            statusEl.textContent =
                online
                    ? "ONLINE"
                    : "OFFLINE";

            statusEl.classList.toggle(
                "is-online",
                online
            );

            statusEl.classList.toggle(
                "is-offline",
                !online
            );

        } catch (error) {
            console.error(error);

            statusEl.textContent =
                "OFFLINE";

            statusEl.classList.remove(
                "is-online"
            );

            statusEl.classList.add(
                "is-offline"
            );
        }
    }


    /* =========================================================
       SCHEDULE – EVENT DEFINITIONS
       ========================================================= */

    /*
        Every schedule.json object may contain:

        title
        artist
        feat
        date
        hour
        photo
        video promo
        review
        vlog

        MUSIC RELEASE:

        A valid title AND artist identify
        a music release.

        CONTENT FLAGS:

        photo       -> photo release
        video promo -> video promo
        review      -> new music review
        vlog        -> new vlog video

        Multiple flags produce separate events.

        Empty hour uses releasetime.json.

        All dates and hours are Budapest-local.
    */

    const CONTENT_EVENT_TYPES = [
        {
            field: "photo",
            label: "photo release"
        },
        {
            field: "video promo",
            label: "video promo"
        },
        {
            field: "review",
            label: "new music review"
        },
        {
            field: "vlog",
            label: "new vlog video"
        }
    ];


    /* =========================================================
       SCHEDULE – EVENT TIME
       ========================================================= */

    function getScheduledEventTime(
        item,
        releaseTime
    ) {
        const customHour =
            safeText(item?.hour);

        if (customHour) {
            return (
                parseReleaseTime(customHour) ||
                extractTimeFromText(customHour)
            );
        }

        return releaseTime;
    }


    /* =========================================================
       SCHEDULE – MUSIC DETECTION
       ========================================================= */

    function isMusicRelease(item) {
        return Boolean(
            safeText(item?.title) &&
            safeText(item?.artist)
        );
    }


    /* =========================================================
       SCHEDULE – EVENT PRIORITY
       ========================================================= */

    /*
        Lower number = displayed first.

        Music release and daily video
        have the highest priority when
        multiple events share a timestamp.

        Livestreams remain independent.
    */

    function getEventPriority(type) {
        if (
            type === "music release" ||
            type === "daily video"
        ) {
            return 0;
        }

        return 1;
    }


    /* =========================================================
       SCHEDULE – NORMALISE CENTRAL EVENTS
       ========================================================= */

    function normaliseCentralSchedule(
        scheduleData,
        releaseTime
    ) {
        if (!Array.isArray(scheduleData)) {
            return [];
        }

        const events = [];

        scheduleData.forEach(item => {
            if (!item) return;

            const date =
                safeText(item.date);

            if (!parseDateString(date)) {
                return;
            }

            const time =
                getScheduledEventTime(
                    item,
                    releaseTime
                );

            if (!time) {
                return;
            }

            const dateTime =
                buildBudapestDateTime(
                    date,
                    time.hour,
                    time.minute
                );

            if (!dateTime) {
                return;
            }

            /*
                MUSIC RELEASE
            */

            if (isMusicRelease(item)) {
                events.push({
                    dateTime,
                    type: "music release",
                    priority: 0
                });
            }

            /*
                PHOTO / PROMO / REVIEW / VLOG
            */

            CONTENT_EVENT_TYPES.forEach(
                definition => {
                    if (
                        isMarked(
                            item[definition.field]
                        )
                    ) {
                        events.push({
                            dateTime,
                            type: definition.label,
                            priority: 1
                        });
                    }
                }
            );
        });

        return events;
    }


    /* =========================================================
       VACATION DAYS
       ========================================================= */

    /*
        Expected vacation.json:

        [
          {
            "vacationdate": "2026_12_20"
          }
        ]

        Vacation dates are interpreted
        as Budapest calendar dates.

        A vacation day prevents the
        automatic daily video.

        Explicitly scheduled events
        are not deleted.
    */

    function normaliseVacationDays(
        vacationData
    ) {
        const dates = new Set();

        if (!Array.isArray(vacationData)) {
            return dates;
        }

        vacationData.forEach(item => {
            const date =
                safeText(item?.vacationdate);

            if (parseDateString(date)) {
                dates.add(date);
            }
        });

        return dates;
    }


    /* =========================================================
       DAILY VIDEO – AUTOMATIC GENERATION
       ========================================================= */

    /*
        DAILY VIDEO RULES:

        1. Generate one daily video for each
           Budapest calendar day.

        2. Skip days containing a scheduled
           music release.

        3. Skip vacation days.

        4. Photo, promo, review and vlog
           do NOT suppress daily videos.

        5. Use releasetime.json.

        6. Do not write generated events
           back into schedule.json.

        7. Generate dynamically for the
           current seven-day window.
    */

    function generateDailyVideos(
        scheduleData,
        vacationData,
        releaseTime,
        now,
        end
    ) {
        if (!releaseTime) {
            return [];
        }

        const musicDates = new Set();

        if (Array.isArray(scheduleData)) {
            scheduleData.forEach(item => {
                if (
                    item &&
                    isMusicRelease(item) &&
                    parseDateString(item.date)
                ) {
                    musicDates.add(
                        safeText(item.date)
                    );
                }
            });
        }

        const vacationDates =
            normaliseVacationDays(
                vacationData
            );

        const events = [];

        /*
            Start from today's calendar date
            in Budapest, not the visitor's
            local calendar date.
        */

        const today =
            getBudapestParts(now);

        const calendarCursor = new Date(
            Date.UTC(
                today.year,
                today.month - 1,
                today.day
            )
        );

        /*
            Include enough calendar dates
            to cover the full 168-hour window,
            even across DST transitions.
        */

        for (
            let offset = 0;
            offset <= SCHEDULE_DAYS + 2;
            offset++
        ) {
            const currentDate = new Date(
                calendarCursor.getTime() +
                offset * 86400000
            );

            const dateKey =
                formatDateKey(
                    currentDate.getUTCFullYear(),
                    currentDate.getUTCMonth() + 1,
                    currentDate.getUTCDate()
                );

            if (
                musicDates.has(dateKey) ||
                vacationDates.has(dateKey)
            ) {
                continue;
            }

            const dateTime =
                buildBudapestDateTime(
                    dateKey,
                    releaseTime.hour,
                    releaseTime.minute
                );

            if (!dateTime) {
                continue;
            }

            if (
                dateTime < now ||
                dateTime > end
            ) {
                continue;
            }

            events.push({
                dateTime,
                type: "daily video",
                priority: 0
            });
        }

        return events;
    }


    /* =========================================================
       LIVESTREAMS FOR SCHEDULE
       ========================================================= */

/* =========================================================
   LIVESTREAM SCHEDULE TITLE FORMATTING
   ========================================================= */

function formatLivestreamScheduleTitle(item) {

    const type = safeText(item?.type);

    const title = safeText(item?.title)
        .replace(/^REWOD(?:\s+|$)/i, "")
        .trim();

    const formattedTitle = [
        type,
        title
    ]
        .filter(Boolean)
        .join(" - ")
        .toUpperCase();

    return formattedTitle || "LIVESTREAM";
}


/* =========================================================
   LIVESTREAMS FOR SCHEDULE
   ========================================================= */

function livestreamsForSchedule(
    livestreams
) {

    return livestreams.map(
        stream => ({

            dateTime:
                stream.dateTime,

            type:
                formatLivestreamScheduleTitle(
                    stream.raw
                ),

            priority: 1

        })
    );

}


    /* =========================================================
       SCHEDULE RENDERING
       ========================================================= */

    let scheduleRefreshTimer = null;


    function renderSchedule(
        scheduleData,
        livestreams,
        vacationData,
        releaseTime
    ) {
        const container =
            document.getElementById(
                "backstageSchedule"
            );

        const empty =
            document.getElementById(
                "backstageScheduleEmpty"
            );

        if (
            !container ||
            !empty
        ) {
            return;
        }

        const now = new Date();

        const end = new Date(
            now.getTime() +
            SCHEDULE_DAYS *
            24 *
            60 *
            60 *
            1000
        );


        /* =============================================
           CENTRAL SCHEDULE EVENTS
           ============================================= */

        const scheduledEvents =
            normaliseCentralSchedule(
                scheduleData,
                releaseTime
            );


        /* =============================================
           AUTOMATIC DAILY VIDEOS
           ============================================= */

        const dailyVideos =
            generateDailyVideos(
                scheduleData,
                vacationData,
                releaseTime,
                now,
                end
            );


        /* =============================================
           LIVESTREAM EVENTS
           ============================================= */

        const liveEvents =
            livestreamsForSchedule(
                livestreams
            );


        /* =============================================
           COMBINE ALL EVENTS
           ============================================= */

        const combined = [
            ...scheduledEvents,
            ...dailyVideos,
            ...liveEvents
        ];


        /* =============================================
           FILTER AND SORT
           ============================================= */

        const upcoming = combined
            .filter(item => (
                item.dateTime instanceof Date &&
                !Number.isNaN(
                    item.dateTime.getTime()
                ) &&
                item.dateTime >= now &&
                item.dateTime <= end
            ))
            .sort((a, b) => {
                const timeDifference =
                    a.dateTime - b.dateTime;

                if (timeDifference !== 0) {
                    return timeDifference;
                }

                return (
                    getEventPriority(a.type) -
                    getEventPriority(b.type)
                );
            });


        /* =============================================
           CLEAR PREVIOUS CONTENT
           ============================================= */

        container.innerHTML = "";


        if (!upcoming.length) {
            container.hidden = true;
            empty.hidden = false;
            return;
        }

        container.hidden = false;
        empty.hidden = true;


        /* =============================================
           RENDER EVENTS
           ============================================= */

        upcoming.forEach(item => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "backstage-schedule-row";


            /* DATE */

            const date =
                document.createElement(
                    "div"
                );

            date.className =
                "backstage-schedule-date";

            date.textContent =
                formatScheduleDate(
                    item.dateTime
                );


            /* TIME */

            const time =
                document.createElement(
                    "div"
                );

            time.className =
                "backstage-schedule-time";

            time.textContent =
                formatScheduleTime(
                    item.dateTime
                );


            /* EVENT TYPE */

            const type =
                document.createElement(
                    "div"
                );

            type.className =
                "backstage-schedule-type";

            type.textContent =
                item.type;


            /* TOOLTIP */

            row.title =
                formatFullLocalDateTime(
                    item.dateTime
                );


            /* APPEND */

            row.append(
                date,
                time,
                type
            );

            container.appendChild(row);
        });
    }


    /* =========================================================
       SCHEDULE AUTO REFRESH
       ========================================================= */

    function initScheduleRefresh(
        scheduleData,
        livestreams,
        vacationData,
        releaseTime
    ) {
        if (scheduleRefreshTimer) {
            clearInterval(
                scheduleRefreshTimer
            );
        }

        const render = () => {
            renderSchedule(
                scheduleData,
                livestreams,
                vacationData,
                releaseTime
            );
        };

        render();

        scheduleRefreshTimer =
            setInterval(
                render,
                SCHEDULE_REFRESH_INTERVAL
            );
    }


    /* =========================================================
       ANIME / SERIES / MUSIC LISTS
       ========================================================= */

    function renderMediaList({
        container,
        data,
        basePath,
        type
    }) {
        if (!container) return;

        container.innerHTML = "";

        if (!Array.isArray(data)) {
            return;
        }

        data.forEach(item => {
            const row =
                document.createElement(
                    item.link
                        ? "a"
                        : "div"
                );

            row.className =
                "backstage-media-row";

            if (item.link) {
                let href =
                    safeText(item.link);

                if (
                    !href.startsWith("http://") &&
                    !href.startsWith("https://")
                ) {
                    href =
                        `https://${href}`;
                }

                row.href = href;
                row.target = "_blank";
                row.rel =
                    "noopener noreferrer";
            }

            const image =
                document.createElement(
                    "img"
                );

            image.className =
                "backstage-media-cover";

            image.alt =
                item.title || "";

            image.loading =
                "lazy";

            setFlexibleImage(
                image,
                basePath,
                item.item
            );

            const text =
                document.createElement(
                    "div"
                );

            text.className =
                "backstage-media-copy";

            const title =
                document.createElement(
                    "div"
                );

            title.className =
                "backstage-media-title";

            title.textContent =
                item.title || "";

            const subtitle =
                document.createElement(
                    "div"
                );

            subtitle.className =
                "backstage-media-subtitle";

            subtitle.textContent =
                type === "music"
                    ? (item.artist || "")
                    : (item.subtitle || "");

            text.append(
                title,
                subtitle
            );

            row.append(
                image,
                text
            );

            container.appendChild(row);
        });
    }


    /* =========================================================
       MEDIA LIST INITIALIZATION
       ========================================================= */

    async function initMediaLists() {
        try {
            const [
                anime,
                series,
                music
            ] = await Promise.all([
                fetchJSON(PATHS.anime),
                fetchJSON(PATHS.series),
                fetchJSON(PATHS.music)
            ]);

            renderMediaList({
                container:
                    document.getElementById(
                        "animeList"
                    ),

                data: anime,

                basePath:
                    PATHS.animeBase,

                type: "anime"
            });

            renderMediaList({
                container:
                    document.getElementById(
                        "seriesList"
                    ),

                data: series,

                basePath:
                    PATHS.seriesBase,

                type: "series"
            });

            renderMediaList({
                container:
                    document.getElementById(
                        "musicList"
                    ),

                data: music,

                basePath:
                    PATHS.musicBase,

                type: "music"
            });

        } catch (error) {
            console.error(
                "Could not load Backstage media lists:",
                error
            );
        }
    }


    /* =========================================================
       INIT
       ========================================================= */

    async function initBackstage() {

        /* =============================================
           CHARACTER VIDEO
           ============================================= */

        initCharacterPreview();


        /* =============================================
           TIMEZONE LABELS
           ============================================= */

        initTimezoneLabels();


        /* =============================================
           INDEPENDENT TASKS
           ============================================= */

        const independentTasks = [
            initCurrentGoal(),
            initCharacterStatus(),
            initMediaLists()
        ];


        let livestreams = [];

        let scheduleData = [];

        let vacationData = [];

        let releaseTime = null;


        /* =============================================
           LOAD LIVESTREAMS
           ============================================= */

        try {
            const liveData =
                await fetchJSON(
                    PATHS.live
                );

            livestreams =
                normaliseLivestreams(
                    liveData
                );

        } catch (error) {
            console.error(
                "Could not load live.json:",
                error
            );
        }


        /* =============================================
           LIVESTREAM COUNTDOWN
           ============================================= */

        initCountdown(
            livestreams
        );


        /* =============================================
           LOAD CENTRAL SCHEDULE
           ============================================= */

        try {
            scheduleData =
                await fetchJSON(
                    PATHS.schedule
                );

            if (!Array.isArray(scheduleData)) {
                throw new Error(
                    "schedule.json must contain an array."
                );
            }

        } catch (error) {
            console.error(
                "Could not load schedule.json:",
                error
            );

            scheduleData = [];
        }


        /* =============================================
           LOAD VACATION DAYS
           ============================================= */

        try {
            vacationData =
                await fetchJSON(
                    PATHS.vacation
                );

            if (!Array.isArray(vacationData)) {
                throw new Error(
                    "vacation.json must contain an array."
                );
            }

        } catch (error) {
            console.error(
                "Could not load vacation.json:",
                error
            );

            vacationData = [];
        }


        /* =============================================
           LOAD CENTRAL RELEASE TIME
           ============================================= */

        try {
            releaseTime =
                await loadReleaseTime();

        } catch (error) {
            console.error(
                "Could not load releasetime.json:",
                error
            );
        }


        /* =============================================
           INITIALIZE SCHEDULE
           ============================================= */

        initScheduleRefresh(
            scheduleData,
            livestreams,
            vacationData,
            releaseTime
        );


        /* =============================================
           WAIT FOR INDEPENDENT TASKS
           ============================================= */

        await Promise.allSettled(
            independentTasks
        );


        /* =============================================
           REVEAL PAGE
           ============================================= */

        revealBackstagePage();
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                initBackstage().catch(
                    error => {
                        console.error(error);
                        revealBackstagePage();
                    }
                );
            }
        );

    } else {
        initBackstage().catch(
            error => {
                console.error(error);
                revealBackstagePage();
            }
        );
    }

})();