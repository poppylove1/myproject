const frame = document.querySelector(".player");
const video = frame.querySelector("video");
const error = frame.querySelector(".player-error");

const STORAGE_KEY = "gang-preview-position";
const SEEK_SMALL = 5;
const SEEK_LARGE = 10;
const DOUBLE_TAP_MS = 300;
const CONTROLS_HEIGHT = 56;
const SAVE_INTERVAL_MS = 2000;

const position = {
    get() {
        try {
            return Number(localStorage.getItem(STORAGE_KEY)) || 0;
        } catch {
            return 0;
        }
    },
    set(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch { }
    },
    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch { }
    },
};

function seek(delta) {
    video.currentTime = Math.min(Math.max(video.currentTime + delta, 0), video.duration || Infinity);
}

function togglePlay() {
    if (video.paused) video.play().catch(() => { });
    else video.pause();
}

function toggleFullscreen() {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (frame.requestFullscreen) return frame.requestFullscreen();
    video.webkitEnterFullscreen?.();
}

const shortcuts = {
    " ": togglePlay,
    k: togglePlay,
    arrowleft: () => seek(-SEEK_SMALL),
    arrowright: () => seek(SEEK_SMALL),
    j: () => seek(-SEEK_LARGE),
    l: () => seek(SEEK_LARGE),
    m: () => { video.muted = !video.muted; },
    f: toggleFullscreen,
};

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = shortcuts[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    action();
});

let lastTap = { time: 0, side: 0 };

video.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch") return;
    const rect = video.getBoundingClientRect();
    if (e.clientY > rect.bottom - CONTROLS_HEIGHT) return;

    const ratio = (e.clientX - rect.left) / rect.width;
    const side = ratio < 1 / 3 ? -1 : ratio > 2 / 3 ? 1 : 0;

    if (side && side === lastTap.side && e.timeStamp - lastTap.time < DOUBLE_TAP_MS) {
        seek(side * SEEK_LARGE);
        lastTap = { time: 0, side: 0 };
    } else {
        lastTap = { time: e.timeStamp, side };
    }
});

video.addEventListener("loadedmetadata", () => {
    const saved = position.get();
    if (saved > 3 && saved < video.duration - 3) video.currentTime = saved;
});

let lastSave = 0;
video.addEventListener("timeupdate", () => {
    const now = Date.now();
    if (now - lastSave < SAVE_INTERVAL_MS) return;
    lastSave = now;
    position.set(Math.floor(video.currentTime));
});

video.addEventListener("ended", () => position.clear());
video.addEventListener("error", () => { error.hidden = false; });