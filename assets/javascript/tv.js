const video = document.getElementById('xerosPlayer');
const poster = document.getElementById('posterOverlay');
const playOverlay = document.getElementById('playOverlay');
const playIconOverlay = playOverlay.querySelector('i');
const btnPlayPause = document.getElementById('btnPlayPause');
const btnMute = document.getElementById('btnMute');
const volumeRange = document.getElementById('volumeRange');
const btnFullscreen = document.getElementById('btnFullscreen');
const djName = document.getElementById('djName');
const djCover = document.getElementById('djCover');
const videoWrapper = document.getElementById('videoWrapper');
const customControls = document.getElementById('customControls');
const djInfo = document.getElementById('djInfo');
const customMenu = document.getElementById('customContextMenu');

let hls;
let currentStreamUrl = '';
let currentPoster = '';

// Fetch stream info only if name === "XerosRadio"
async function fetchStreamInfo() {
    try {
        const res = await fetch('https://xr-tv.faststreamdiensten.nl/api/');
        const data = await res.json();
        if (data.streams && data.streams.length > 0) {
            const stream = data.streams.find(s => s.name === "XerosRadio");
            if (!stream) {
                console.warn("XerosRadio stream not found");
                return;
            }
            currentStreamUrl = stream.playlist;
            currentPoster = stream.still;
            poster.src = currentPoster;
        }
    } catch(e) { console.error("Kan stream info niet ophalen:", e); }
}

// Toggle Play
function togglePlay() {
    if (!currentStreamUrl) return;

    if (video.paused) {
        if (!hls) {
            if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(currentStreamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play();
                    poster.style.opacity = 0;
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = currentStreamUrl;
                video.addEventListener('loadedmetadata', () => {
                    video.play();
                    poster.style.opacity = 0;
                });
            }
        } else {
            video.play();
            poster.style.opacity = 0;
        }
        playOverlay.classList.add('hide');
        playIconOverlay.className = 'fas fa-pause';
        btnPlayPause.className = 'fas fa-pause';
    } else {
        video.pause();
        playOverlay.classList.remove('hide');
        playIconOverlay.className = 'fas fa-play';
        btnPlayPause.className = 'fas fa-play';
        poster.style.opacity = 1;
    }
}

// Event listeners
playOverlay.addEventListener('click', togglePlay);
btnPlayPause.addEventListener('click', togglePlay);
video.addEventListener('click', togglePlay);

// Volume
btnMute.addEventListener('click', () => {
    video.muted = !video.muted;
    btnMute.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    volumeRange.value = video.muted ? 0 : video.volume;
});
volumeRange.addEventListener('input', () => {
    video.volume = volumeRange.value;
    video.muted = video.volume === 0;
    btnMute.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
});

// Fullscreen
btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        videoWrapper.requestFullscreen();
        btnFullscreen.className = 'fas fa-compress';
    } else {
        document.exitFullscreen();
        btnFullscreen.className = 'fas fa-expand';
    }
});

// Auto-hide controls and cursor
let hideTimeout;
function resetHideTimer() {
    clearTimeout(hideTimeout);
    customControls.classList.remove('hide');
    djInfo.classList.remove('hide');
    videoWrapper.classList.remove('hide-cursor');

    hideTimeout = setTimeout(() => {
        customControls.classList.add('hide');
        djInfo.classList.add('hide');
        videoWrapper.classList.add('hide-cursor');
    }, 3000);
}
videoWrapper.addEventListener('mousemove', resetHideTimer);
videoWrapper.addEventListener('mouseleave', resetHideTimer);

// Fetch DJ info
async function fetchDJInfo() {
    try {
        const res = await fetch('https://xr-api-prd.faststreamdiensten.nl');
        const data = await res.json();
        if (data.onair_info) {
            djName.textContent = data.onair_info.dj_name;
            djCover.src = data.onair_info.dj_cover;
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'Live TV',
                    artist: data.onair_info.dj_name,
                    artwork: [
                        { src: data.onair_info.dj_cover, sizes: '128x128', type: 'image/webp' },
                        { src: data.onair_info.dj_cover, sizes: '256x256', type: 'image/webp' },
                        { src: data.onair_info.dj_cover, sizes: '512x512', type: 'image/webp' },
                    ]
                });
            }
        }
    } catch(e) { console.error("Kan DJ info niet ophalen:", e); }
}
fetchDJInfo();
setInterval(fetchDJInfo, 30000);

// MediaSession handlers
if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
}

// Spacebar support
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    }
});

// Custom right-click menu
videoWrapper.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = videoWrapper.getBoundingClientRect();
    customMenu.style.left = `${e.clientX - rect.left}px`;
    customMenu.style.top = `${e.clientY - rect.top}px`;
    customMenu.classList.add('show');
});
document.addEventListener('click', () => { customMenu.classList.remove('show'); });

// Initialize hide timer
resetHideTimer();

// Fetch stream info on page load
fetchStreamInfo();
