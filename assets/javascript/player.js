class RadioPlayer {
    constructor() {
        this.radioPlayer = document.getElementById('radioPlayer');
        this.radioPlayer.setAttribute('preload', 'none');
        this.artistInfo = document.getElementById('artistInfo');
        this.titleInfo = document.getElementById('titleInfo');
        this.albumArtwork = document.getElementById('albumArtwork');
        this.djInfoElement = document.getElementById('djInfo');
        this.artworkElement = document.getElementById('artwork');
        this.playPauseButton = document.getElementById('playPauseButton');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.castButton = document.getElementById('castButton');
        this.isPlaying = false;

        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        this.updateRadioInfo();
        setInterval(this.updateRadioInfo.bind(this), 5000);

        this.initializeCastSDK(); // Initialize Cast SDK
    }

    isValidUrl(url) {
        try { new URL(url); return true; } catch (error) { return false; }
    }

    async updateRadioInfo() {
        const url = 'https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/';
        const fetchOptions = { method: 'GET', cache: 'no-cache' };
        
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error('Verzoek mislukt.');

            const data = await response.json();
            const { artist, title, cover_art } = data.current_song;
            const { dj_live_status: djLiveStatus, dj_name: djName, dj_cover: djCover } = data.onair_info;

            const artwork200 = cover_art || 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;
            this.updateMediaMetadata(artist, title, artwork200, artwork200);

            if (this.isCasting()) this.updateCastMetadataOnCast();

            if (djLiveStatus) {
                this.djInfoElement.textContent = djName;
                const artworkUrl = this.isValidUrl(djCover) ? djCover : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
                const newImage = new Image();
                newImage.src = artworkUrl;
                newImage.draggable = false;
                newImage.loading = 'lazy';
                newImage.alt = 'XerosRadio DJ';
                newImage.style.width = '200px';
                newImage.style.height = '200px';
                newImage.addEventListener('contextmenu', (e) => e.preventDefault());
                this.artworkElement.innerHTML = '';
                this.artworkElement.appendChild(newImage);
            } else {
                this.djInfoElement.textContent = 'Nonstop Muziek';
                this.artworkElement.innerHTML = `<img src="${djCover}" alt="XerosRadio Nonstop Muziek" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
            }
        } catch (error) {
            console.error('Fout:', error);
            this.djInfoElement.textContent = 'XerosRadio niet beschikbaar.';
            this.artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
        }
    }

    async updateCastMetadataOnCast() {
        const url = 'https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/metadatacasting/';
        const fetchOptions = { method: 'GET', cache: 'no-cache' };
        
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error('Verzoek mislukt voor casting metadata.');

            const data = await response.json();
            const { logo_url, background_url, title, title2 } = data;

            // Update metadata for casting session
            const session = cast.framework.CastContext.getInstance().getCurrentSession();
            if (session) {
                const media = session.media;
                if (media) {
                    media.metadata.title = title;
                    media.metadata.subtitle = title2;
                    media.metadata.images = [
                        new chrome.cast.Image(logo_url),
                        new chrome.cast.Image(background_url)
                    ];

                    media.updateMetadata()
                        .then(() => console.log('Casting metadata updated.'))
                        .catch(error => console.error('Error updating casting metadata:', error));
                }
            }
        } catch (error) {
            console.error('Fout:', error);
        }
    }

    initializeCastSDK() {
        window['__onGCastApiAvailable'] = (isAvailable) => {
            if (isAvailable) {
                const castContext = cast.framework.CastContext.getInstance();
                castContext.setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });

                castContext.addEventListener(
                    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                    (event) => this.handleCastSessionState(event)
                );

                console.log("Cast SDK initialized and ready for use.");
            } else {
                console.error("Google Cast API is not available.");
            }
        };
    }

    handleCastSessionState(event) {
        if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
            console.log('Casting session started');
            this.playMediaOnCast();
        } else if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
            console.log('Casting session ended');
            this.playMedia();
        }
    }

    castButtonClick() {
        const castContext = cast.framework.CastContext.getInstance();
        if (castContext) {
            castContext.requestSession()
                .then(() => {
                    this.updateCastMetadataOnCast();
                    this.playMediaOnCast(); // Play media on the Cast device once the session is started
                })
                .catch(error => console.error('Error starting Cast session:', error));
        } else {
            console.error('Cast context is not initialized.');
        }
    }

    playMediaOnCast() {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const mediaInfo = new chrome.cast.media.MediaInfo(this.radioPlayer.src, 'audio/mp3');
            mediaInfo.metadata = new chrome.cast.media.MusicTrackMetadata();
            mediaInfo.metadata.title = this.artistInfo.textContent; // Set title to artist
            mediaInfo.metadata.subtitle = this.titleInfo.textContent; // Set subtitle to song title
            mediaInfo.metadata.images = [new chrome.cast.Image(this.albumArtwork.src)];

            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Media loaded successfully on Cast device'))
                .catch(error => console.error('Error loading media on Cast device:', error));
        } else {
            console.error('No Cast session found.');
        }
    }

    isCasting() {
        return cast.framework.CastContext.getInstance().getCurrentSession() != null;
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pauseMedia();
        } else {
            this.playMedia();
        }
        this.updatePlayPauseButton();
    }

    playMedia() {
        this.radioPlayer.play();
        this.isPlaying = true;
        this.updatePlayPauseButton();
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
        document.cookie = `volume=${volume}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    getVolumeFromCookie() {
        const cookieValue = document.cookie.replace(/(?:(?:^|.*;\s*)volume\s*=\s*([^;]*).*$)|^.*$/, "$1");
        return cookieValue ? parseFloat(cookieValue) : 0.5;
    }
}

const radioPlayer = new RadioPlayer();
