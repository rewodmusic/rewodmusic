(() => {
    "use strict";

    /* =========================================================
       BACKSTAGE – PATHS
       ========================================================= */

    const PATHS = {
        live: "/data/live.json",

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


    /* =========================================================
       PAGE REVEAL / FADE-IN
       ========================================================= */

    function revealBackstagePage() {
        const page =
            document.querySelector(".backstage-page") ||
            document.querySelector("main") ||
            document.body;

        if (!page) return;

        /*
            Two RAFs ensure the browser paints the initial hidden
            state first. Then the visible class is added.

            This makes the page appear as one finished page instead
            of visibly assembling individual elements.
        */
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


    function parseDateString(dateString) {
        if (!dateString) return null;

        const match = String(dateString).match(
            /^(\d{4})_(\d{2})_(\d{2})$/
        );

        if (!match) return null;

        return {
            year: Number(match[1]),
            month: Number(match[2]),
            day: Number(match[3])
        };
    }


    /*
        Supported examples:

        youtube, 1:00 pm
        youtube, 1 pm
        12:00 am
        13:00
        9:30 PM
    */
    function extractTimeFromText(text) {
        if (!text) return null;

        const value = String(text);

        const twelveHour = value.match(
            /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i
        );

        if (twelveHour) {
            let hour = Number(twelveHour[1]);
            const minute = Number(twelveHour[2] || 0);
            const meridiem =
                twelveHour[3].toLowerCase();

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


    function buildDateTime(dateString, timeText) {
        const date =
            parseDateString(dateString);

        const time =
            extractTimeFromText(timeText);

        if (!date || !time) return null;

        const result = new Date(
            date.year,
            date.month - 1,
            date.day,
            time.hour,
            time.minute,
            0,
            0
        );

        if (Number.isNaN(result.getTime())) {
            return null;
        }

        return result;
    }


    function isLivestream(item) {
        return String(item?.livestream || "")
            .trim()
            .toLowerCase() === "x";
    }


    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function pad2(number) {
        return String(number).padStart(2, "0");
    }


    function formatScheduleDate(date) {
        return date
            .toLocaleDateString("en-US", {
                weekday: "long"
            })
            .toUpperCase();
    }


    function formatScheduleTime(date) {
        let hour = date.getHours();
        const minute = date.getMinutes();

        const meridiem =
            hour >= 12 ? "pm" : "am";

        hour %= 12;

        if (hour === 0) {
            hour = 12;
        }

        if (minute === 0) {
            return `${hour}${meridiem}`;
        }

        return `${hour}:${pad2(minute)}${meridiem}`;
    }


    /*
        We cannot enumerate a static web directory from browser JS.

        Instead, image candidates are tried in sequence.
        This also supports odd downloaded names such as:

        3.jpg.webp
        3.png.webp
    */
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

            const now = new Date();

            const difference =
                next.dateTime.getTime() -
                now.getTime();

            if (difference <= 0) {
                render();
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

        countdownTimer =
            setInterval(
                render,
                1000
            );
    }


    /* =========================================================
       CHARACTER VIDEO AUTOPLAY
       ========================================================= */

    function prepareCharacterVideo(video) {
        if (!video) return;

        /*
            Important for iOS / Safari / mobile browsers.
        */
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
                playPromise.catch(() => {
                    /*
                        Browser may still block autoplay.
                        The interaction fallback below
                        will try again.
                    */
                });
            }
        }


        /*
            Try immediately.
        */
        tryPlay();


        /*
            Try when the browser has enough video data.
        */
        video.addEventListener(
            "loadeddata",
            tryPlay
        );


        video.addEventListener(
            "canplay",
            tryPlay
        );


        /*
            Some mobile browsers pause media when the page
            goes into the background.

            Try again when the page becomes visible.
        */
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


        /*
            Final mobile Safari fallback.

            If autoplay was blocked during page load,
            the first real user interaction unlocks it.
        */
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


        /*
            Prepare and force initial autoplay.
        */
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
                        /*
                            If mobile browser somehow paused
                            the current video, clicking the
                            active race also restarts it.
                        */
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

                        /*
                            Re-apply these before every
                            source change for mobile Safari.
                        */
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
                    type:
                        item.type || ""
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


    function renderSchedule(
        manualSchedule,
        livestreams
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


        /*
            "Next 7 days" means from right now
            until exactly seven days from now.
        */
        const end =
            new Date(
                now.getTime() +
                7 *
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
            )
        ];


        const upcoming =
            combined
                .filter(item => {
                    return (
                        item.dateTime >= now &&
                        item.dateTime <= end
                    );
                })
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
                    String(
                        item.link
                    ).trim();

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


            if (type === "music") {
                subtitle.textContent =
                    item.artist || "";
            } else {
                subtitle.textContent =
                    item.subtitle || "";
            }


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
            Character video starts immediately instead of
            waiting for JSON requests.
        */
        initCharacterPreview();


        /*
            These can load independently.
        */
        const independentTasks = [
            initCurrentGoal(),
            initCharacterStatus(),
            initMediaLists()
        ];


        let livestreams = [];
        let manualSchedule = [];


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


        renderSchedule(
            manualSchedule,
            livestreams
        );


        /*
            Wait for the independent Backstage data to settle
            before revealing the finished page.

            Promise.allSettled prevents one failed JSON request
            from keeping the entire page invisible.
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

                        /*
                            Never leave the page invisible if
                            something unexpected fails.
                        */
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