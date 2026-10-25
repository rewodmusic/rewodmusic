(() => {
    "use strict";

    /* =========================================================
       BACKSTAGE – YOUTUBE VLOG SYSTEM
       ========================================================= */

    const CONFIG = {
        jsonPath: "/backstage/backstage-edit-data/youtube.json",

        iframeId: "backstageLatestVlog",
        playlistId: "backstageVlogPlaylist"
    };


    /* =========================================================
       EXTRACT YOUTUBE VIDEO ID
       ========================================================= */

    function getYouTubeVideoId(input) {
        if (!input) return null;

        try {
            const url = new URL(String(input).trim());

            const hostname = url.hostname.toLowerCase();

            if (
                hostname === "youtu.be" ||
                hostname === "www.youtu.be"
            ) {
                return url.pathname.split("/").filter(Boolean)[0] || null;
            }

            if (
                hostname === "youtube.com" ||
                hostname === "www.youtube.com" ||
                hostname === "m.youtube.com"
            ) {
                if (url.pathname === "/watch") {
                    return url.searchParams.get("v");
                }

                const parts = url.pathname.split("/").filter(Boolean);

                if (
                    parts[0] === "shorts" ||
                    parts[0] === "embed" ||
                    parts[0] === "live"
                ) {
                    return parts[1] || null;
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }


    /* =========================================================
       VALIDATE YOUTUBE URL
       ========================================================= */

    function getYouTubeURL(input) {
        if (!input) return null;

        try {
            const url = new URL(String(input).trim());

            if (url.protocol !== "https:") {
                return null;
            }

            const allowedHosts = [
                "youtube.com",
                "www.youtube.com",
                "m.youtube.com",
                "youtu.be",
                "www.youtu.be"
            ];

            if (!allowedHosts.includes(url.hostname.toLowerCase())) {
                return null;
            }

            return url.href;

        } catch (error) {
            return null;
        }
    }


    /* =========================================================
       LOAD YOUTUBE JSON
       ========================================================= */

    async function loadYouTubeData() {
        const response = await fetch(CONFIG.jsonPath, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Could not load YouTube JSON (${response.status})`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data) || !data.length) {
            throw new Error("YouTube JSON is empty.");
        }

        return data[0];
    }


    /* =========================================================
       INITIALIZE VLOG
       ========================================================= */

    async function initBackstageYouTube() {
        const iframe = document.getElementById(
            CONFIG.iframeId
        );

        const playlistButton = document.getElementById(
            CONFIG.playlistId
        );

        if (!iframe || !playlistButton) {
            return;
        }

        try {
            const data = await loadYouTubeData();

            /* LATEST VIDEO */

            const videoId = getYouTubeVideoId(data.latest);

            if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                iframe.src =
                    `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

                iframe.title = "REWOD – Latest Vlog";
            } else {
                console.warn(
                    "Backstage: Invalid latest YouTube video."
                );

                iframe.src = "about:blank";
            }


            /* PLAYLIST BUTTON */

            const playlistURL = getYouTubeURL(data.playlist);

            if (playlistURL) {
                playlistButton.href = playlistURL;
                playlistButton.hidden = false;
            } else {
                playlistButton.hidden = true;

                console.warn(
                    "Backstage: Invalid YouTube playlist URL."
                );
            }

        } catch (error) {
            console.error(
                "Backstage YouTube loading failed:",
                error
            );

            playlistButton.hidden = true;
        }
    }


    /* =========================================================
       START
       ========================================================= */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initBackstageYouTube
        );
    } else {
        initBackstageYouTube();
    }

})();