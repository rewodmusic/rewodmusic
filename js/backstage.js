(() => {
    "use strict";

    /* =========================================================
       BACKSTAGE – PATHS
       ========================================================= */

    const PATHS = {
        live: "/data/live.json",
        admin: "/data/admin.json",

        releaseTime:
            "/backstage/backstage-edit-data/releasetime.json",

        status: "/backstage/backstage-edit-data/status.json",
        schedule: "/backstage/backstage-edit-data/schedule.json",
        goal: "/backstage/backstage-edit-data/current-goal.json",

        anime: "/backstage/backstage-edit-data/0_anime.json",
        series: "/backstage/backstage-edit-data/1_series.json",
        music: "/backstage/backstage-edit-data/2_music.json",

        characterBase: "/backstage/backstage-edit-pics/char-preview/",
        goalBase: "/backstage/backstage-edit-pics/current-goal/",
        animeBase: "/backstage/backstage-edit-pics/0_anime/",
        seriesBase: "/backstage/backstage-edit-pics/1_series/",
        musicBase: "/backstage/backstage-edit-pics/2_music/"
    };

    /*
        ALL JSON EVENT TIMES ARE ENTERED
        IN BUDAPEST LOCAL TIME.

        Visitors see the converted time
        in their own device timezone.

        MUSIC RELEASE TIMES:
        Loaded from releasetime.json.

        LIVESTREAM / MANUAL SCHEDULE TIMES:
        Remain independently defined
        in their original JSON files.
    */

    const SOURCE_TIMEZONE = "Europe/Budapest";

    const SCHEDULE_DAYS = 7;

    const SCHEDULE_REFRESH_INTERVAL = 60 * 1000;


    /* =========================================================
       PAGE REVEAL / FADE-IN
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


    /*
        Supported time examples:

        youtube, 1:00 pm
        youtube, 1 pm
        12:00 am
        13:00
        9:30 PM

        All interpreted as Budapest time.
    */

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


    function isLivestream(item) {
        return safeText(
            item?.livestream
        ).toLowerCase() === "x";
    }


    function isDaily(item) {
        return safeText(
            item?.daily
        ).toLowerCase() === "x";
    }


    function pad2(number) {
        return String(number).padStart(2, "0");
    }


    /* =========================================================
       CENTRAL RELEASE TIME
       ========================================================= */

    /*
        Source:

        /backstage/backstage-edit-data/releasetime.json

        Expected JSON:

        [
          {
            "releasetime": "12:00"
          }
        ]

        Examples:

        12:00 -> Budapest 12:00
        13:00 -> Budapest 13:00
        18:30 -> Budapest 18:30

        This setting affects ONLY music releases.

        It does NOT affect livestreams
        or manually scheduled events.
    */

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
                "Invalid releasetime.json value. Expected HH:MM (00:00–23:59)."
            );
        }

        return releaseTime;
    }


    /* =========================================================
       VISITOR LOCAL TIMEZONE
       ========================================================= */

    /*
        No timezone is specified in the
        visitor-facing formatters.

        JavaScript therefore uses the visitor's
        browser/device timezone automatically.
    */

    function formatScheduleDate(date) {
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


    /*
        Full local date/time for schedule
        tooltips.

        This function remains unchanged.
    */

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


    /* =========================================================
       VISITOR TIMEZONE DETECTION
       ========================================================= */

    function getVisitorTimezone() {
        try {
            return Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone || "Local time";
        } catch (error) {
            return "Local time";
        }
    }


    /*
        Extract the representative city name
        from the visitor's IANA timezone.

        Examples:

        Europe/Budapest    -> Budapest
        Europe/London      -> London
        America/New_York   -> New York
        Asia/Tokyo         -> Tokyo
        Asia/Seoul         -> Seoul
    */

    function getVisitorTimezoneCity() {
        const timezone = getVisitorTimezone();

        if (
            !timezone ||
            timezone === "Local time"
        ) {
            return "LOCAL TIME";
        }

        const city = timezone
            .split("/")
            .pop()
            .replace(/_/g, " ");

        return city.toUpperCase();
    }


    /* =========================================================
       LOCAL TIMEZONE LABELS
       ========================================================= */

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
       NEXT LIVESTREAM – LOCAL DATE / TIME / CITY
       ========================================================= */

    /*
        DISPLAY FORMAT:

        THURSDAY, NOVEMBER 5, 2026
        AT 13:00 IN BUDAPEST

        Features:

        - Visitor's local date
        - Visitor's local time
        - 24-hour clock
        - Representative timezone city
        - Full uppercase
        - No GMT / UTC suffix
        - Automatic daylight saving handling

        The underlying livestream timestamp
        is NOT modified.

        Only its visual representation changes.
    */

/* =========================================================
   NEXT LIVESTREAM – LOCAL DATE / TIME / TIMEZONE
   ========================================================= */

/*
    DISPLAY FORMAT:

    THURSDAY, NOVEMBER 5, 2026
    AT 13:00 (BUDAPEST TIME)

    Features:

    - Visitor's local date
    - Visitor's local time
    - 24-hour clock
    - Representative timezone city
    - Timezone displayed in parentheses
    - Full uppercase
    - Automatic daylight saving handling

    The underlying livestream timestamp
    is NOT modified.

    Only its visual representation changes.
*/

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

    /*
        Converts a Budapest wall-clock date/time
        into an absolute JavaScript Date.

        Handles CET / CEST automatically.

        Example:

        JSON:
        2026_11_05
        13:00

        Means:
        November 5, 2026
        13:00 in Budapest

        NOT 13:00 in the visitor's timezone.
    */

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


    /*
        Returns the Budapest calendar components
        of an absolute Date.
    */

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


    /*
        Verify that the resulting Date really
        represents the requested Budapest time.

        This also prevents nonexistent times
        during the spring DST transition.
    */

    function matchesBudapestTime(
        date,
        target,
        hour,
        minute
    ) {
        const parts =
            getBudapestParts(date);

        return (
            parts.year === target.year &&
            parts.month === target.month &&
            parts.day === target.day &&
            parts.hour === hour &&
            parts.minute === minute
        );
    }


    /*
        Converts a Budapest local date/time
        into an absolute JavaScript Date.

        The hour and minute must be supplied
        explicitly by the caller.
    */

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

        /*
            Calculate both offsets.

            Normally they are identical.
            Around DST transitions they
            can differ.
        */

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

        /*
            Try both possible candidates.

            On the autumn DST transition,
            an ambiguous local time can occur
            twice. We choose the earlier
            matching instant.
        */

        const candidates = [
            new Date(
                utcGuess - firstOffset
            ),

            new Date(
                utcGuess - secondOffset
            )
        ];

        /*
            Also check nearby offsets.

            This makes the conversion more
            robust around DST boundaries.
        */

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


    /*
        Parse a JSON date and time as Budapest
        local time.

        Used by:
        - Livestreams
        - Manual schedule

        These events do NOT use
        releasetime.json.
    */

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
                    clearInterval(
                        countdownTimer
                    );

                    countdownTimer = null;
                }

                return;
            }

            countdown.hidden = false;
            empty.hidden = true;


            /* =============================================
               NEXT LIVESTREAM LOCAL DATE DISPLAY
               ============================================= */

            /*
                Automatically converted to
                the visitor's timezone.

                This does not change the
                countdown calculation.
            */

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


            /* =============================================
               COUNTDOWN CALCULATION
               ============================================= */

            const now = new Date();

            const difference =
                next.dateTime.getTime() -
                now.getTime();

            if (difference <= 0) {
                return;
            }

            const totalSeconds =
                Math.floor(
                    difference / 1000
                );

            const days =
                Math.floor(
                    totalSeconds / 86400
                );

            const hours =
                Math.floor(
                    (totalSeconds % 86400) /
                    3600
                );

            const minutes =
                Math.floor(
                    (totalSeconds % 3600) /
                    60
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
                setInterval(
                    render,
                    1000
                );
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
            const playPromise =
                video.play();

            if (
                playPromise &&
                typeof playPromise.catch ===
                    "function"
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
                await fetchJSON(
                    PATHS.goal
                );

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
                        (balance / price) *
                        100
                    );
            }


            percentage =
                Math.max(
                    0,
                    Math.min(
                        100,
                        percentage
                    )
                );


            nameEl.textContent =
                goal.name ||
                "Current goal";

            percentEl.textContent =
                `${percentage}%`;


            requestAnimationFrame(
                () => {
                    fillEl.style.width =
                        `${percentage}%`;
                }
            );


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
                await fetchJSON(
                    PATHS.status
                );

            const status =
                Array.isArray(data)
                    ? data[0]
                    : null;

            const online =
                String(
                    status?.online || ""
                )
                    .trim()
                    .toLowerCase() === "x";


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
       SCHEDULE
       ========================================================= */

    function normaliseManualSchedule(
        scheduleData
    ) {
        if (!Array.isArray(scheduleData)) {
            return [];
        }

        return scheduleData
            .map(item => {
                const dateTime =
                    buildDateTime(
                        item.date,
                        item.hour
                    );

                return {
                    dateTime,
                    type: item.type || ""
                };
            })
            .filter(
                item =>
                    item.dateTime
            );
    }


    function livestreamsForSchedule(
        livestreams
    ) {
        return livestreams.map(
            stream => ({
                dateTime:
                    stream.dateTime,

                type:
                    stream.raw.type ||
                    stream.raw.title ||
                    "livestream"
            })
        );
    }


    /* =========================================================
       MUSIC RELEASES – LATEST NON-DAILY
       ========================================================= */

    /*
        Matches Latest / Upcoming pages:

        1. Ignore daily: "x"
        2. Sort by newmusicdate descending
        3. Select latest regular release
    */

    function pickLatestRegularRelease(
        adminData
    ) {
        if (!Array.isArray(adminData)) {
            return null;
        }

        const regular = adminData
            .filter(
                item =>
                    item &&
                    !isDaily(item)
            )
            .filter(
                item =>
                    parseDateString(
                        item.newmusicdate
                    )
            );

        regular.sort((a, b) => {
            const dateA =
                safeText(a.newmusicdate);

            const dateB =
                safeText(b.newmusicdate);

            return dateB.localeCompare(dateA);
        });

        return regular[0] || null;
    }


/* =========================================================
   MUSIC RELEASES FOR SCHEDULE
   ========================================================= */

/*
    ONLY UPCOMING RELEASES.

    Source:
    - Date: admin.json
    - Time: releasetime.json

    All release times are interpreted
    in Europe/Budapest timezone.

    Visitors see the converted time
    in their own local timezone.

    NEW RELEASE entries are intentionally
    excluded from the schedule.
*/

function musicReleasesForSchedule(
    adminData,
    releaseTime
) {
    if (
        !Array.isArray(adminData) ||
        !releaseTime
    ) {
        return [];
    }

    const latest =
        pickLatestRegularRelease(
            adminData
        );

    if (!latest) {
        return [];
    }

    const dateTime =
        buildBudapestDateTime(
            latest.comingmusicdate,
            releaseTime.hour,
            releaseTime.minute
        );

    const title =
        safeText(
            latest.comingmusictitle
        );

    if (!dateTime || !title) {
        return [];
    }

    return [
    {
        dateTime,
        type: "music release"
    }
];
}


    /* =========================================================
       SCHEDULE RENDERING
       ========================================================= */

    let scheduleRefreshTimer = null;


    function renderSchedule(
        manualSchedule,
        livestreams,
        musicReleases,
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


        const combined = [
            ...normaliseManualSchedule(
                manualSchedule
            ),

            ...livestreamsForSchedule(
                livestreams
            ),

            ...musicReleasesForSchedule(
                musicReleases,
                releaseTime
            )
        ];


        const upcoming = combined
            .filter(item => (
                item.dateTime >= now &&
                item.dateTime <= end
            ))
            .sort(
                (a, b) =>
                    a.dateTime -
                    b.dateTime
            );


        container.innerHTML = "";


        if (!upcoming.length) {
            container.hidden = true;
            empty.hidden = false;
            return;
        }


        container.hidden = false;
        empty.hidden = true;


        upcoming.forEach(item => {
            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "backstage-schedule-row";


            const date =
                document.createElement(
                    "div"
                );

            date.className =
                "backstage-schedule-date";

            /*
                VISITOR LOCAL DAY.

                Example:
                Budapest Monday night
                may be Tuesday in Seoul.
            */

            date.textContent =
                formatScheduleDate(
                    item.dateTime
                );


            const time =
                document.createElement(
                    "div"
                );

            time.className =
                "backstage-schedule-time";

            /*
                VISITOR LOCAL TIME.
            */

            time.textContent =
                formatScheduleTime(
                    item.dateTime
                );


            const type =
                document.createElement(
                    "div"
                );

            type.className =
                "backstage-schedule-type";

            type.textContent =
                item.type;


            /*
                Full date/time appears on hover.
            */

            row.title =
                formatFullLocalDateTime(
                    item.dateTime
                );


            row.append(
                date,
                time,
                type
            );

            container.appendChild(
                row
            );
        });
    }


    /*
        Refresh the upcoming window every minute.

        This removes events that have passed
        without requiring a page reload.
    */

    function initScheduleRefresh(
        manualSchedule,
        livestreams,
        musicReleases,
        releaseTime
    ) {
        if (scheduleRefreshTimer) {
            clearInterval(
                scheduleRefreshTimer
            );
        }

        const render = () => {
            renderSchedule(
                manualSchedule,
                livestreams,
                musicReleases,
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
                    !href.startsWith(
                        "http://"
                    ) &&
                    !href.startsWith(
                        "https://"
                    )
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

            container.appendChild(
                row
            );
        });
    }


    async function initMediaLists() {
        try {
            const [
                anime,
                series,
                music
            ] = await Promise.all([
                fetchJSON(
                    PATHS.anime
                ),

                fetchJSON(
                    PATHS.series
                ),

                fetchJSON(
                    PATHS.music
                )
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

        /*
            Start character video immediately.
        */

        initCharacterPreview();


        /*
            Show timezone information.
        */

        initTimezoneLabels();


        /*
            Independent tasks.
        */

        const independentTasks = [
            initCurrentGoal(),
            initCharacterStatus(),
            initMediaLists()
        ];


        let livestreams = [];
        let manualSchedule = [];
        let musicReleases = [];
        let releaseTime = null;


        /* =========================
           LOAD LIVESTREAMS
           ========================= */

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


        initCountdown(
            livestreams
        );


        /* =========================
           LOAD MANUAL SCHEDULE
           ========================= */

        try {
            manualSchedule =
                await fetchJSON(
                    PATHS.schedule
                );

        } catch (error) {
            console.error(
                "Could not load schedule.json:",
                error
            );
        }


        /* =========================
           LOAD MUSIC RELEASES
           ========================= */

        try {
            musicReleases =
                await fetchJSON(
                    PATHS.admin
                );

        } catch (error) {
            console.error(
                "Could not load admin.json:",
                error
            );
        }


        /* =========================
           LOAD CENTRAL RELEASE TIME
           ========================= */

        /*
            This setting is used ONLY for:

            - NEW RELEASE
            - UPCOMING RELEASE

            Livestream and manual schedule
            times remain unchanged.

            If loading fails, music release
            events are omitted rather than
            displayed at an incorrect time.
        */

        try {
            releaseTime =
                await loadReleaseTime();

        } catch (error) {
            console.error(
                "Could not load releasetime.json:",
                error
            );
        }


        /* =========================
           RENDER SCHEDULE
           ========================= */

        initScheduleRefresh(
            manualSchedule,
            livestreams,
            musicReleases,
            releaseTime
        );


        /*
            Wait for independent tasks before
            revealing the page.
        */

        await Promise.allSettled(
            independentTasks
        );


        revealBackstagePage();
    }


    /* =========================================================
       START
       ========================================================= */

    if (
        document.readyState ===
        "loading"
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