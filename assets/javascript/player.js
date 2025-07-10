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

        this.lastSong = {
            artist: '',
            title: '',
            cover: ''
        };

        this.lastDJ = {
            status: null,
            name: '',
            cover: ''
        };

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
            if (!response.ok) throw new Error('Fout bij ophalen data');

            const data = await response.json();
            const { artist, title, cover_art200x200 } = data.current_song;
            const { dj_live_status, dj_name, dj_cover } = data.onair_info;

            const artwork200 = cover_art200x200 || this.defaultImage;

            // Update now playing alleen als veranderd
            if (
                artist !== this.lastSong.artist ||
                title !== this.lastSong.title ||
                artwork200 !== this.lastSong.cover
            ) {
                this.artistInfo.textContent = artist;
                this.titleInfo.textContent = title;
                this.albumArtwork.src = artwork200;

                this.updateMediaMetadata();

                this.lastSong = { artist, title, cover: artwork200 };
            }

            // Update DJ info alleen als veranderd
            if (
                dj_live_status !== this.lastDJ.status ||
                dj_name !== this.lastDJ.name ||
                dj_cover !== this.lastDJ.cover
            ) {
                if (dj_live_status) {
                    this.djInfoElement.textContent = dj_name;

                    const artworkUrl = this.isValidUrl(dj_cover) ? dj_cover : this.defaultImage;
                    const newImage = new Image();
                    newImage.src = artworkUrl;
                    newImage.onerror = () => { newImage.src = this.defaultImage; };
                    newImage.draggable = false;
                    newImage.loading = 'lazy';
                    newImage.alt = 'XerosRadio DJ';
                    newImage.style.width = '200px';
                    newImage.style.height = '200px';

                    this.artworkElement.innerHTML = '';
                    this.artworkElement.appendChild(newImage);
                } else {
                    this.djInfoElement.textContent = 'Nonstop Muziek';
                    this.artworkElement.innerHTML = `
                        <img src="${this.defaultImage}" alt="XerosRadio Nonstop Muziek"
                            draggable="false" loading="lazy"
                            style="width: 200px; height: 200px;">
                    `;
                }
                this.lastDJ = {
                    status: dj_live_status,
                    name: dj_name,
                    cover: dj_cover
                };
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Fout:', error);
        this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar.';
        this.artworkElement.innerHTML = `
            <img src="${this.defaultImage}" alt="XerosRadio"
                draggable="false" loading="lazy"
                style="width: 200px; height: 200px;">
        `;
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
            const title = this.titleInfo.textContent || 'Bij XerosRadio zit je goed';
            const artwork = this.albumArtwork?.src || this.defaultImage;

            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                artwork: [
                    { src: artwork, sizes: '500x500', type: 'image/webp' }
                ]
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
            mediaInfo.metadata.images = [
                { url: this.defaultImage }
            ];

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
            })
            .catch(err => {
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
        const expiration = new Date();
        expiration.setFullYear(expiration.getFullYear() + 1);
        document.cookie = `volume=${volume}; expires=${expiration.toUTCString()}; path=/;`;
    }

    getVolumeFromCookie() {
        const match = document.cookie.split(';').find(c => c.trim().startsWith('volume='));
        return match ? parseFloat(match.split('=')[1]) : null;
    }

    handleStreamError() {
        if (!this.userPaused) {
            console.warn('Stream onderbroken. Herstart...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }

    handlePause() {
        if (!this.userPaused && !this.radioPlayer.ended) {
            console.warn('Pauze zonder gebruikersinput. Herstart...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }
}

// Initialisatie
const radioPlayer = new RadioPlayer();
