class RadioPlayer {
    constructor() {
        // Cache DOM elements with optional chaining for robustness
        this.radioPlayer = document.getElementById('radioPlayer');
        this.artistInfo = document.getElementById('artistInfo');
        this.titleInfo = document.getElementById('titleInfo');
        this.albumArtwork = document.getElementById('albumArtwork');
        this.djInfoElement = document.getElementById('djInfo');
        this.artworkElement = document.getElementById('artwork');
        this.playPauseButton = document.getElementById('playPauseButton');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.castButton = document.getElementById('castButton');
        this.isPlaying = false;
        this.userPaused = false;
        this.defaultImage = 'https://res.cloudinary.com/xerosradio/image/upload/w_500,h_500,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
        this.streamUrl = 'https://stream.streamxerosradio.duckdns.org/xerosradio';

        // Set ARIA labels for accessibility
        this.playPauseButton?.setAttribute('aria-label', 'Play / Pauze');
        this.volumeSlider?.setAttribute('aria-label', 'Volume aanpassen');
        this.castButton?.setAttribute('aria-label', 'Cast naar apparaat');

        this.lastSong = { artist: '', title: '', cover: '' };
        this.lastDJ = { status: null, name: '', cover: '' };

        // Event listeners
        this.playPauseButton?.addEventListener('click', this.togglePlay);
        this.volumeSlider?.addEventListener('input', this.adjustVolume);
        this.castButton?.addEventListener('click', this.castButtonClick);

        // Volume initialization
        const initialVolume = this.getVolumeFromCookie() ?? 0.5;
        if (this.volumeSlider) this.volumeSlider.value = initialVolume;
        if (this.radioPlayer) this.radioPlayer.volume = initialVolume;

        // Debounce flag for updateRadioInfo
        this._isUpdatingRadioInfo = false;

        this.updateRadioInfo();
        this._radioInfoInterval = setInterval(this.updateRadioInfo, 5000);

        this.initializeCastSDK();
        this.setupMediaSession();

        // Audio event listeners
        this.radioPlayer?.addEventListener('error', this.handleStreamError);
        this.radioPlayer?.addEventListener('stalled', this.handleStreamError);
        this.radioPlayer?.addEventListener('ended', this.handleStreamError);
        this.radioPlayer?.addEventListener('pause', this.handlePause);

        this.reconnectDelay = 3000;
    }

    // Helper to create an image element with fallback
    createArtworkImage = (src, alt = 'XerosRadio', width = 200, height = 200) => {
        const img = new Image();
        img.src = src;
        img.alt = alt;
        img.draggable = false;
        img.loading = 'lazy';
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
        img.onerror = () => { img.src = this.defaultImage; };
        return img;
    };

    isValidUrl = url => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Debounced updateRadioInfo to avoid overlapping requests
    updateRadioInfo = async () => {
        if (this._isUpdatingRadioInfo) return;
        this._isUpdatingRadioInfo = true;
        const url = 'https://xr-api-prd.faststreamdiensten.nl/';
        try {
            const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
            if (!response.ok) throw new Error('Fout bij ophalen data');
            const data = await response.json();
            const { artist, title, cover_art200x200 } = data.current_song;
            const { dj_live_status, dj_name, dj_cover } = data.onair_info;
            const artwork200 = cover_art200x200 || this.defaultImage;

            // Update song info if changed
            if (
                artist !== this.lastSong.artist ||
                title !== this.lastSong.title ||
                artwork200 !== this.lastSong.cover
            ) {
                if (this.artistInfo) this.artistInfo.textContent = artist;
                if (this.titleInfo) this.titleInfo.textContent = title;
                if (this.albumArtwork) this.albumArtwork.src = artwork200;
                this.updateMediaMetadata();
                this.lastSong = { artist, title, cover: artwork200 };
            }

            // Update DJ info if changed
            if (
                dj_live_status !== this.lastDJ.status ||
                dj_name !== this.lastDJ.name ||
                dj_cover !== this.lastDJ.cover
            ) {
                if (this.djInfoElement) this.djInfoElement.textContent = dj_name;
                const artworkUrl = this.isValidUrl(dj_cover) ? dj_cover : this.defaultImage;
                if (this.artworkElement) {
                    this.artworkElement.innerHTML = '';
                    this.artworkElement.appendChild(this.createArtworkImage(artworkUrl, 'XerosRadio DJ'));
                }
                this.lastDJ = { status: dj_live_status, name: dj_name, cover: dj_cover };
            }
        } catch (error) {
            this.handleError(error);
        } finally {
            this._isUpdatingRadioInfo = false;
        }
    };

    handleError = error => {
        console.error('Fout:', error);
        if (this.djInfoElement) this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar.';
        if (this.artworkElement) {
            this.artworkElement.innerHTML = '';
            this.artworkElement.appendChild(this.createArtworkImage(this.defaultImage));
        }
    };

    initializeCastSDK = () => {
        window['__onGCastApiAvailable'] = isAvailable => {
            if (isAvailable) {
                const castContext = cast.framework.CastContext.getInstance();
                castContext.setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });
                castContext.addEventListener(
                    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    this.handleCastSessionState
                );
            }
        };
    };

    setupMediaSession = () => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', this.playMedia);
            navigator.mediaSession.setActionHandler('pause', this.pauseMedia);
            navigator.mediaSession.setActionHandler('stop', this.pauseMedia);
        }
    };

    updateMediaMetadata = () => {
        if ('mediaSession' in navigator) {
            const artist = this.artistInfo?.textContent || 'XerosRadio';
            const title = this.titleInfo?.textContent || 'Bij XerosRadio zit je goed';
            const artwork = this.albumArtwork?.src || this.defaultImage;
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                artwork: [
                    { src: artwork, sizes: '500x500', type: 'image/webp' }
                ]
            });
        }
    };

    handleCastSessionState = event => {
        if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
            this.pauseMedia();
            setTimeout(this.loadMediaToCast, 1000);
        } else if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
            this.playMedia();
        }
    };

    castButtonClick = () => {
        const castContext = cast.framework.CastContext.getInstance();
        castContext.requestSession()
            .then(this.loadMediaToCast)
            .catch(error => console.error('Cast fout:', error));
    };

    loadMediaToCast = () => {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const mediaInfo = new chrome.cast.media.MediaInfo(this.streamUrl, 'audio/aac');
            mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
            mediaInfo.metadata.title = 'Bij XerosRadio zit je goed. Altijd online de beste Nederlandstalige geheime zender en piraten hits. 24 uur per dag de mooiste muziek.';
            mediaInfo.metadata.artist = 'XerosRadio';
            mediaInfo.metadata.images = [{ url: this.defaultImage }];
            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Cast gestart'))
                .catch(error => console.error('Fout bij casten:', error));
        }
    };

    togglePlay = () => {
        if (this.isPlaying) {
            this.userPaused = true;
            this.pauseMedia();
        } else {
            this.userPaused = false;
            this.playMedia();
        }
    };

    playMedia = () => {
        if (!this.radioPlayer) return;
        this.radioPlayer.src = this.streamUrl;
        // Try/catch for browsers that block autoplay
        try {
            const playPromise = this.radioPlayer.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise
                    .then(() => {
                        this.isPlaying = true;
                        this.updatePlayPauseButton();
                    })
                    .catch(err => {
                        console.error('Fout bij afspelen:', err);
                        setTimeout(this.playMedia, this.reconnectDelay);
                    });
            } else {
                this.isPlaying = true;
                this.updatePlayPauseButton();
            }
        } catch (err) {
            console.error('Fout bij afspelen:', err);
            setTimeout(this.playMedia, this.reconnectDelay);
        }
    };

    pauseMedia = () => {
        if (!this.radioPlayer) return;
        this._programmaticPause = true; // Set flag for programmatic pause
        this.radioPlayer.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
        setTimeout(() => { this._programmaticPause = false; }, 100); // Reset flag after short delay
    };

    updatePlayPauseButton = () => {
        if (this.playPauseButton)
            this.playPauseButton.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    };

    adjustVolume = () => {
        if (!this.radioPlayer || !this.volumeSlider) return;
        this.radioPlayer.volume = this.volumeSlider.value;
        this.saveVolumeToStorage(this.volumeSlider.value);
    };

    // Use localStorage for volume instead of cookies
    saveVolumeToStorage = volume => {
        try {
            localStorage.setItem('xr_volume', volume);
        } catch {}
    };

    getVolumeFromCookie = () => {
        // Try localStorage first, fallback to cookie for backward compatibility
        try {
            const v = localStorage.getItem('xr_volume');
            if (v !== null) return parseFloat(v);
        } catch {}
        const match = document.cookie.split(';').find(c => c.trim().startsWith('volume='));
        if (!match) return null;
        const value = match.split('=')[1];
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    };

    handleStreamError = () => {
        if (!this.userPaused) {
            console.warn('Stream onderbroken. Herstart...');
            setTimeout(this.playMedia, this.reconnectDelay);
        }
    };

    handlePause = () => {
        // Only auto-restart if not paused by user or programmatically (e.g. Media Session)
        if (!this.userPaused && !this._programmaticPause && this.radioPlayer && !this.radioPlayer.ended) {
            console.warn('Pauze zonder gebruikersinput. Herstart...');
            setTimeout(this.playMedia, this.reconnectDelay);
        }
    };

    // Optional: Clean up intervals and listeners if needed
    destroy = () => {
        clearInterval(this._radioInfoInterval);
        // Remove event listeners if you ever need to destroy the player
        this.playPauseButton?.removeEventListener('click', this.togglePlay);
        this.volumeSlider?.removeEventListener('input', this.adjustVolume);
        this.castButton?.removeEventListener('click', this.castButtonClick);
        this.radioPlayer?.removeEventListener('error', this.handleStreamError);
        this.radioPlayer?.removeEventListener('stalled', this.handleStreamError);
        this.radioPlayer?.removeEventListener('ended', this.handleStreamError);
        this.radioPlayer?.removeEventListener('pause', this.handlePause);
    };
}

// Initialiseer de speler
const radioPlayer = new RadioPlayer();
