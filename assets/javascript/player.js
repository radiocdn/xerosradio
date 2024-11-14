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

        this.initializeCastSDK();
        this.setupMediaSession();
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
        const url = 'https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/';
        const fetchOptions = {
            method: 'GET',
            cache: 'no-cache'
        };

        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new Error('Het verzoek aan de XerosRadio Servers is mislukt. Probeer het later opnieuw.');
            }

            const data = await response.json();
            const { artist, title, cover_art } = data.current_song;
            const { dj_live_status: djLiveStatus, dj_name: djName, dj_cover: djCover } = data.onair_info;

            const artwork200 = cover_art || 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;

            this.updateMediaMetadata(artist, title, artwork200, artwork200);

            // Update metadata on cast device if casting
            if (this.isCasting()) {
                this.updateCastMetadata(artist, title, artwork200);
            }

            if (djLiveStatus) {
                this.djInfoElement.textContent = djName;
                const artworkUrl = this.isValidUrl(djCover) ? djCover : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';

                const newImage = new Image();
                newImage.src = artworkUrl;
                newImage.draggable = false;
                newImage.loading = 'lazy';
                newImage.alt = 'XerosRadio DJ';
                newImage.style.opacity = 1;
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
            this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';
            this.artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
        }
    }

    initializeCastSDK() {
        window['__onGCastApiAvailable'] = (isAvailable) => {
            if (isAvailable) {
                const castContext = cast.framework.CastContext.getInstance();
                
                // Set the cast options, like the receiverApplicationId and autoJoinPolicy
                castContext.setOptions({
                    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                });

                // Add an event listener for session state changes
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

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', this.playMedia.bind(this));
            navigator.mediaSession.setActionHandler('pause', this.pauseMedia.bind(this));
            navigator.mediaSession.setActionHandler('stop', this.pauseMedia.bind(this));
            navigator.mediaSession.setActionHandler('seekbackward', () => this.seek(-10));
            navigator.mediaSession.setActionHandler('seekforward', () => this.seek(10));
        }
    }

    updateMediaMetadata(artist, title, artworkUrl200, artworkUrl500) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
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

        // Ensure the Cast API is fully initialized before trying to request a session
        if (castContext) {
            // Now that Cast context is initialized, request the session
            castContext.requestSession()
                .then(() => this.loadMediaToCast())
                .catch(error => console.error('Error starting Cast session:', error));
        } else {
            console.error('Cast context is not initialized.');
        }
    }

    isCasting() {
        return cast.framework.CastContext.getInstance().getCurrentSession() != null;
    }

    updateCastMetadata(artist, title, artworkUrl) {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const media = session.media;

            // If media is already loaded, update metadata without restarting the stream
            if (media) {
                // Only update metadata without restarting the stream
                media.metadata.title = title;
                media.metadata.artist = artist;
                media.metadata.images = [
                    new chrome.cast.Image(artworkUrl),
                    new chrome.cast.Image('https://res.cloudinary.com/xerosradio/image/upload/w_50,h_50,f_webp,q_auto/XerosRadio_Logo')
                ];

                media.updateMetadata()
                    .then(() => console.log('Updated cast metadata without restarting stream.'))
                    .catch(error => console.error('Error updating cast metadata:', error));
            } else {
                // If no media is loaded yet, load the media
                const mediaInfo = new chrome.cast.media.MediaInfo('https://stream.streamxerosradio.duckdns.org/xerosradio', 'audio/mpeg');
                mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
                mediaInfo.metadata.title = title;
                mediaInfo.metadata.artist = artist;
                mediaInfo.metadata.images = [
                    new chrome.cast.Image(artworkUrl),
                    new chrome.cast.Image('https://res.cloudinary.com/xerosradio/image/upload/w_50,h_50,f_webp,q_auto/XerosRadio_Logo')
                ];

                const request = new chrome.cast.media.LoadRequest(mediaInfo);
                request.autoplay = true;

                session.loadMedia(request)
                    .then(() => console.log('Loaded media on cast device and updated metadata.'))
                    .catch(error => console.error('Error loading media:', error));
            }
        }
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

    saveVolumeToCookie(value) {
        document.cookie = `volume=${value}; path=/; max-age=31536000`;
    }

    getVolumeFromCookie() {
        const match = document.cookie.match(/volume=([^;]+)/);
        return match ? parseFloat(match[1]) : 0.5;
    }

    seek(time) {
        this.radioPlayer.currentTime += time;
    }
}

const radioPlayer = new RadioPlayer();
