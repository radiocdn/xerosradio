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
        this.userPaused = false; // Nieuw: bijhouden of de gebruiker zelf pauzeerde

        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        this.updateRadioInfo();
        setInterval(this.updateRadioInfo.bind(this), 5000);

        this.initializeCastSDK();
        this.setupMediaSession();

        // 🔁 Events voor reconnect
        this.radioPlayer.addEventListener('error', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('stalled', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('ended', this.handleStreamError.bind(this));
        this.radioPlayer.addEventListener('pause', this.handlePause.bind(this)); // optioneel

        this.reconnectDelay = 3000; // ms
    }

    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    async updateRadioInfo() {
        const url = 'https://xerosradioapiprd.global.ssl.fastly.net/';
        const fetchOptions = { method: 'GET', cache: 'no-cache' };

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error('Verzoek aan de XerosRadio Servers is mislukt.');
            const data = await response.json();
            const { artist, title, cover_art200x200 } = data.current_song;
            const { dj_live_status, dj_name, dj_cover } = data.onair_info;

            const artwork200 = cover_art200x200 || 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;
            this.updateMediaMetadata(artist, title, artwork200, artwork200);

            if (dj_live_status) {
                this.djInfoElement.textContent = dj_name;
                const artworkUrl = this.isValidUrl(dj_cover) ? dj_cover : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
                const newImage = new Image();
                newImage.src = artworkUrl;
                newImage.onerror = () => {
                    newImage.src = 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
                };
                newImage.draggable = false;
                newImage.loading = 'lazy';
                newImage.alt = 'XerosRadio DJ';
                newImage.style.width = '200px';
                newImage.style.height = '200px';
                this.artworkElement.innerHTML = '';
                this.artworkElement.appendChild(newImage);
            } else {
                this.djInfoElement.textContent = 'Nonstop Muziek';
                this.artworkElement.innerHTML = `<img src="${dj_cover}" alt="XerosRadio Nonstop Muziek" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    handleError(error) {
        console.error('Fout:', error);
        this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';
        this.artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
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

    updateMediaMetadata(artist, title, artworkUrl200, artworkUrl500) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                artwork: [
                    { src: artworkUrl500, sizes: '500x500', type: 'image/webp' },
                    { src: artworkUrl200, sizes: '200x200', type: 'image/webp' }
                ]
            });
        }
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
            .catch(error => console.error('Error starting session:', error));
    }

    loadMediaToCast() {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const mediaInfo = new chrome.cast.media.MediaInfo('https://stream.streamxerosradio.duckdns.org/xerosradio', 'audio/mpeg');
            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Media loaded successfully.'))
                .catch(error => console.error('Error loading media:', error));
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
        this.radioPlayer.src = 'https://stream.streamxerosradio.duckdns.org/xerosradio'; // zorg voor verse bron
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
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        document.cookie = `volume=${volume}; expires=${expirationDate.toUTCString()}; path=/`;
    }

    getVolumeFromCookie() {
        const cookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('volume='));
        return cookie ? parseFloat(cookie.split('=')[1]) : null;
    }

    handleStreamError() {
        if (!this.userPaused) {
            console.warn('Stream onderbroken. Poging tot opnieuw verbinden...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }

    handlePause() {
        if (!this.userPaused && !this.radioPlayer.ended) {
            console.warn('Speler gepauzeerd (mogelijk door fout). Probeer opnieuw te verbinden...');
            setTimeout(() => this.playMedia(), this.reconnectDelay);
        }
    }
}

// Start
const radioPlayer = new RadioPlayer();
