/* REWOD HOMEPAGE – EXACT BACKSTAGE SCHEDULE RENDERING (isolated) */
(()=>{
"use strict";
const PATHS = {live:"/data/live.json",schedule:"/data/schedule.json",vacation:"/backstage/backstage-edit-data/vacation.json",releaseTime:"/backstage/backstage-edit-data/releasetime.json"};
const SOURCE_TIMEZONE="Europe/Budapest";
const SCHEDULE_DAYS=7;
const SCHEDULE_REFRESH_INTERVAL=60000;
const CONTENT_EVENT_TYPES=[{field:"photo",label:"photo release"},{field:"video promo",label:"video promo"},{field:"review",label:"new music review"},{field:"vlog",label:"new vlog video"}];
const budapestFormatter=new Intl.DateTimeFormat("en-US",{timeZone:SOURCE_TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
let scheduleRefreshTimer=null;

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



    function isMusicRelease(item) {
        return Boolean(
            safeText(item?.title) &&
            safeText(item?.artist)
        );
    }



    function getEventPriority(type) {
        if (
            type === "music release" ||
            type === "daily video"
        ) {
            return 0;
        }

        return 1;
    }



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
                    "livestream",

                priority: 1
            })
        );
    }



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


async function initHomeSchedule(){
 initTimezoneLabels();
 const [schedule,live,vacation,release]=await Promise.allSettled([
  fetchJSON(PATHS.schedule),fetchJSON(PATHS.live),fetchJSON(PATHS.vacation),loadReleaseTime()
 ]);
 const value=(r,label,fallback)=>{if(r.status==="fulfilled")return r.value;console.error("Homepage schedule: "+label,r.reason);return fallback;};
 const scheduleData=value(schedule,"schedule.json",[]);
 const liveData=value(live,"live.json",[]);
 const vacationData=value(vacation,"vacation.json",[]);
 const releaseTime=value(release,"releasetime.json",null);
 initScheduleRefresh(Array.isArray(scheduleData)?scheduleData:[],normaliseLivestreams(liveData),Array.isArray(vacationData)?vacationData:[],releaseTime);
}
initHomeSchedule().catch(console.error);
})();
