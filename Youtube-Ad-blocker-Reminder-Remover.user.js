// ==UserScript==
// @name         Remove Adblock Thing
// @namespace    http://tampermonkey.net/
// @version      5.7
// @description  Removes Adblock Thing even with YouTube dynamic navigation
// @author       JoelMatic
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @updateURL    https://github.com/TheRealJoelmatic/RemoveAdblockThing/raw/main/Youtube-Ad-blocker-Reminder-Remover.user.js
// @downloadURL  https://github.com/TheRealJoelmatic/RemoveAdblockThing/raw/main/Youtube-Ad-blocker-Reminder-Remover.user.js
// @grant        none
// ==/UserScript==

(function() {
    //
    // Configuration Variables
    //
    const adblocker = true;
    const removePopup = false;
    const updateCheck = true;
    const debugMessages = true;
    const fixTimestamps = true;
    const updateModal = {
        enable: true,
        timer: 5000,
    };

    let currentUrl = window.location.href;
    let isVideoPlayerModified = false;

    //
    // Initialize the script
    //
    initialize();

    function initialize() {
        log("Script initialized");

        if (adblocker) removeAds();
        if (removePopup) popupRemover();
        if (updateCheck) checkForUpdate();
        if (fixTimestamps) timestampFix();

        // Use a MutationObserver to detect page changes
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                log("URL changed detected, reinitializing...");
                currentUrl = window.location.href;
                isVideoPlayerModified = false;
                reinitialize();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function reinitialize() {
        // Clear any existing modifications and restart ad removal
        log("Reinitializing script...");
        removeAds();
    }

    //
    // Remove Popups
    //
    function popupRemover() {
        setInterval(() => {
            const modalOverlay = document.querySelector("tp-yt-iron-overlay-backdrop");
            const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
            const popupButton = document.getElementById("dismiss-button");
            const video = document.querySelector('video');

            const bodyStyle = document.body.style;
            bodyStyle.setProperty('overflow-y', 'auto', 'important');

            if (modalOverlay) {
                modalOverlay.removeAttribute("opened");
                modalOverlay.remove();
            }

            if (popup) {
                log("Popup detected, removing...");
                if (popupButton) popupButton.click();
                popup.remove();
                video.play();
                setTimeout(() => video.play(), 500);
                log("Popup removed");
            }

            if (video && video.paused) {
                video.play();
            }
        }, 1000);
    }

    //
    // Remove Ads
    //
    function removeAds() {
        log("removeAds()");

        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                isVideoPlayerModified = false;
                clearAllPlayers();
                removePageAds();
            }

            if (window.location.href.includes("shorts")) {
                log("YouTube shorts detected, ignoring...");
                return;
            }

            if (isVideoPlayerModified) {
                removeAllDuplicateVideos();
                return;
            }

            log("Video replacement started!");

            const video = document.querySelector('video');
            if (video) video.volume = 0;
            if (video) video.pause();
            if (video) video.remove();

            if (!clearAllPlayers()) return;

            let videoID = getVideoID();
            if (!videoID) {
                log("YouTube video URL not found.", "e");
                return;
            }

            log("Video ID: " + videoID);

            const iframe = createIframe(videoID);
            const videoPlayerElement = document.querySelector('.html5-video-player');
            videoPlayerElement.appendChild(iframe);
            log("Finished");

            isVideoPlayerModified = true;
        }, 500);
        removePageAds();
    }

    //
    // Helper functions
    //
    function createIframe(videoID) {
        const startOfUrl = "https://www.youtube-nocookie.com/embed/";
        const endOfUrl = "?autoplay=1&modestbranding=1&rel=0";
        const finalUrl = startOfUrl + videoID + endOfUrl;

        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', finalUrl);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', true);
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.zIndex = '9999';

        return iframe;
    }

    function getVideoID() {
        let videoID = '';
        const url = new URL(window.location.href);
        const urlParams = new URLSearchParams(url.search);

        if (urlParams.has('v')) {
            videoID = urlParams.get('v');
        } else {
            const pathSegments = url.pathname.split('/');
            const liveIndex = pathSegments.indexOf('live');
            if (liveIndex !== -1 && liveIndex + 1 < pathSegments.length) {
                videoID = pathSegments[liveIndex + 1];
            }
        }

        return videoID;
    }

    function clearAllPlayers() {
        const videoPlayerElements = document.querySelectorAll('.html5-video-player');
        if (videoPlayerElements.length === 0) {
            log("No elements with class 'html5-video-player' found.", "e");
            return false;
        }

        videoPlayerElements.forEach(videoPlayerElement => {
            const iframes = videoPlayerElement.querySelectorAll('iframe');
            iframes.forEach(iframe => iframe.remove());
        });

        log("Removed all current players!");
        return true;
    }

    function removeAllDuplicateVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.src.includes('www.youtube.com')) {
                video.muted = true;
                video.pause();
                video.addEventListener('volumechange', () => {
                    if (!video.muted) {
                        video.muted = true;
                        video.pause();
                        log("Video unmuted detected and remuted");
                    }
                });
                video.addEventListener('play', () => {
                    video.pause();
                    log("Video play detected and repaused");
                });

                log("Duplicate video found and muted");
            }
        });
    }

    //
    // Utility functions
    //
    function log(message, level = 'log', ...args) {
        if (!debugMessages) return;

        const prefix = '🔧 Remove Adblock Thing:';
        const logMessage = `${prefix} ${message}`;
        switch (level) {
            case 'e':
                console.error(logMessage, ...args);
                break;
            case 'warning':
                console.warn(logMessage, ...args);
                break;
            default:
                console.log(logMessage, ...args);
        }
    }
})();
