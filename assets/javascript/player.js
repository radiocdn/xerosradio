class RadioPlayer {
    constructor() {
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

        this.playPauseButton.setAttribute('aria-label', 'Play / Pauze');
        this.volumeSlider.setAttribute('aria-label', 'Volume aanpassen');
        this.castButton.setAttribute('aria-label', 'Cast naar apparaat');

        this.lastSong = { artist: '', title: '', cover: '' };
        this.lastDJ = { status: null, name: '', cover: '' };

        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        this.volumeSlider.value = this.getVolumeFromStorage() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        this.updateRadioInfo();
        setInterval(this.updateRadioInfo.bind(this), 5000);

        this.initializeCastSDK();
        this.setupMediaSession();

        this.radioPlayer.addEventListener('error', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('stalled', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('ended', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('pause', this.handlePause.bind(this));

        this.reconnectDelay = 3000;
        this.maxReconnectDelay = 30000;
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    async updateRadioInfo() {
        const url = 'https://xr-api-prd.faststreamdiensten.nl/';
        try {
            const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
            if (!response.ok) throw new Error('Fout bij ophalen data');

            const data = await response.json();
            const { artist, title, cover_art200x200 } = data.current_song;
            const { dj_live_status, dj_name, dj_cover } = data.onair_info;

            const artwork200 = cover_art200x200 || this.defaultImage;

            if (artist !== this.lastSong.artist || title !== this.lastSong.title || artwork200 !== this.lastSong.cover) {
                this.artistInfo.textContent = artist || 'Onbekende artiest';
                this.titleInfo.textContent = title || 'Onbekend nummer';

                this.preloadImage(artwork200, img => {
                    this.albumArtwork.src = img.src;
                });

                this.updateMediaMetadata();
                this.lastSong = { artist, title, cover: artwork200 };
            }

            if (dj_live_status !== this.lastDJ.status || dj_name !== this.lastDJ.name || dj_cover !== this.lastDJ.cover) {
                this.djInfoElement.textContent = dj_name || 'DJ onbekend';
                const artworkUrl = this.isValidUrl(dj_cover) ? dj_cover : this.defaultImage;

                this.preloadImage(artworkUrl, img => {
                    img.style.width = '200px';
                    img.style.height = '200px';
                    img.draggable = false;
                    img.loading = 'lazy';
                    img.alt = 'XerosRadio DJ';
                    this.artworkElement.innerHTML = '';
                    this.artworkElement.appendChild(img);
                });

                this.lastDJ = { status: dj_live_status, name: dj_name, cover: dj_cover };
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    preloadImage(url, callback) {
        const img = new Image();
        img.src = url;
        img.onload = () => callback(img);
        img.onerror = () => {
            const fallback = new Image();
            fallback.src = this.defaultImage;
            fallback.onload = () => callback(fallback);
        };
    }

    handleError(error) {
        console.error('Fout:', error);
        this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar.';

        this.preloadImage(this.defaultImage, img => {
            img.style.width = '200px';
            img.style.height = '200px';
            img.draggable = false;
            img.loading = 'lazy';
            img.alt = 'XerosRadio';
            this.artworkElement.innerHTML = '';
            this.artworkElement.appendChild(img);
        });

        // Retry met langere delay
        setTimeout(() => this.updateRadioInfo(), Math.min(this.reconnectDelay * 2, this.maxReconnectDelay));
    }

    initializeCastSDK() {
        window['__onGCastApiAvailable'] = isAvailable => {
            if (isAvailable) {
                const castContext = cast.framework.CastContext.getInstance();
                castContext.setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });
                castContext.addEventListener(
                    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    event => this.handleCastSessionState(event)
                );
            }
        };
    }

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', this.playMedia.bind(this));
            navigator.mediaSession.setActionHandler('pause', this.pauseMedia.bind(this));
            navigator.mediaSession.setActionHandler('stop', this.pauseMedia.bind(this));
        }
    }

    updateMediaMetadata() {
        if ('mediaSession' in navigator) {
            const artist = this.artistInfo.textContent || 'XerosRadio';
            const title = this.titleInfo.textContent || 'Bij XerosRadio zit je goed. Altijd online de beste Nederlandstalige geheime zender en piraten hits. 24 uur per dag de mooiste muziek.';
            const artwork = this.albumArtwork?.src || this.defaultImage;

            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                artwork: [{ src: artwork, sizes: '500x500', type: 'image/webp' }]
            });
        }
    }

    handleCastSessionState(event) {
        if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
            this.pauseMedia();
            setTimeout(() => this.loadMediaToCast(), 1000);
        } else if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
            this.playMedia();
        }
    }

    castButtonClick() {
        const castContext = cast.framework.CastContext.getInstance();
        castContext.requestSession()
            .then(() => this.loadMediaToCast())
            .catch(error => console.error('Cast fout:', error));
    }

    loadMediaToCast() {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const mediaInfo = new chrome.cast.media.MediaInfo(this.streamUrl, 'audio/mpeg');
            mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
            mediaInfo.metadata.title = 'Bij XerosRadio zit je goed. Altijd online de beste Nederlandstalige geheime zender en piraten hits. 24 uur per dag de mooiste muziek.';
            mediaInfo.metadata.artist = 'XerosRadio';
            mediaInfo.metadata.images = [{ url: this.defaultImage }];

            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Cast gestart'))
                .catch(error => console.error('Fout bij casten:', error));
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.userPaused = true;
            this.pauseMedia();
        } else {
            this.userPaused = false;
            this.playMedia();
        }
    }

    playMedia() {
        this.radioPlayer.src = this.streamUrl;
        this.radioPlayer.play()
            .then(() => {
                this.isPlaying = true;
                this.updatePlayPauseButton();
                this.reconnectDelay = 3000; // reset backoff
            })
            .catch(err => {
                console.error('Fout bij afspelen:', err);
                this.scheduleReconnect();
            });
    }

    pauseMedia() {
        this.radioPlayer.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    updatePlayPauseButton() {
        this.playPauseButton.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.saveVolumeToStorage(this.volumeSlider.value);
    }

    saveVolumeToStorage(volume) {
        localStorage.setItem('volume', volume);
    }

    getVolumeFromStorage() {
        return parseFloat(localStorage.getItem('volume'));
    }

    handleStreamError() {
        if (!this.userPaused) {
            console.warn('Stream onderbroken. Herstart...');
            this.scheduleReconnect();
        }
    }

    handlePause() {
        if (!this.userPaused && !this.radioPlayer.ended) {
            console.warn('Pauze zonder gebruikersinput. Herstart...');
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        setTimeout(() => this.playMedia(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }
}

// Initialiseer de speler
const radioPlayer = new RadioPlayer();
