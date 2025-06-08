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

        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
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
        const url = 'https://xerosradioapiprd.global.ssl.fastly.net/';
        try {
            const response = await fetch(url, { method: 'GET', cache: 'no-cache' });
            if (!response.ok) throw new Error('Verzoek aan de XerosRadio Servers is mislukt.');
            const data = await response.json();

            const { artist, title, cover_art200x200 } = data.current_song;
            const { dj_live_status, dj_name, dj_cover } = data.onair_info;

            const artwork200 = cover_art200x200 || this.defaultImage;
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;

            if (dj_live_status) {
                this.djInfoElement.textContent = dj_name;
                const artworkUrl = this.isValidUrl(dj_cover) ? dj_cover : this.defaultImage;
                const img = new Image();
                img.src = artworkUrl;
                img.onerror = () => { img.src = this.defaultImage; };
                img.alt = 'XerosRadio DJ';
                img.style.width = '200px';
                img.style.height = '200px';
                img.draggable = false;
                img.loading = 'lazy';
                this.artworkElement.innerHTML = '';
                this.artworkElement.appendChild(img);
            } else {
                this.djInfoElement.textContent = 'Nonstop Muziek';
                this.artworkElement.innerHTML = `<img src="${this.defaultImage}" alt="Nonstop Muziek" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
            }

            this.updateMediaMetadata();
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Fout:', error);
        this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar.';
        this.artworkElement.innerHTML = `<img src="${this.defaultImage}" alt="XerosRadio" style="width:200px;height:200px;" draggable="false" loading="lazy">`;
    }

    initializeCastSDK() {
        window['__onGCastApiAvailable'] = isAvailable => {
            if (isAvailable) {
                const context = cast.framework.CastContext.getInstance();
                context.setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });
                context.addEventListener(
                    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    e => this.handleCastSessionState(e)
                );
            }
        };
    }

    handleCastSessionState(event) {
        if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
            this.pauseMedia();
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
            const mediaInfo = new chrome.cast.media.MediaInfo('https://stream.streamxerosradio.duckdns.org/xerosradio', 'audio/mpeg');

            const metadata = new chrome.cast.media.MusicTrackMediaMetadata();
            metadata.title = 'Bij XerosRadio zit je goed. Altijd online de beste Nederlandstalige geheime zender en piraten hits. 24 uur per dag de mooiste muziek.';
            metadata.artist = 'XerosRadio';
            metadata.images = [{ url: this.defaultImage }];

            mediaInfo.metadata = metadata;

            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Cast gestart met vaste metadata.'))
                .catch(error => console.error('Fout bij casten:', error));
        }
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
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Bij XerosRadio zit je goed. Altijd online de beste Nederlandstalige geheime zender en piraten hits. 24 uur per dag de mooiste muziek.',
                artist: 'XerosRadio',
                artwork: [
                    { src: this.defaultImage, sizes: '500x500', type: 'image/webp' }
                ]
            });
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
        this.radioPlayer.src = 'https://stream.streamxerosradio.duckdns.org/xerosradio';
        this.radioPlayer.play().then(() => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        }).catch(err => {
            console.error('Fout bij afspelen:', err);
            setTimeout(() => this.playMedia(), this.reconnectDelay);
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
        this.saveVolumeToCookie(this.volumeSlider.value);
    }

    saveVolumeToCookie(volume) {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        document.cookie = `volume=${volume}; expires=${d.toUTCString()}; path=/`;
    }

    getVolumeFromCookie() {
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith('volume='));
        return cookie ? parseFloat(cookie.split('=')[1]) : null;
    }

    handleStreamError() {
        if (!this.userPaused) {
            console.warn('Stream onderbroken. Probeer opnieuw...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }

    handlePause() {
        if (!this.userPaused && !this.radioPlayer.ended) {
            console.warn('Speler gepauzeerd. Automatisch hervatten...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }
}

// Start
const radioPlayer = new RadioPlayer();
