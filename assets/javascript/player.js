class RadioPlayer {
    constructor() {
        // Get the XerosRadio API DOM elements.
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

        // XerosRadio API variable to track the playing state.
        this.isPlaying = false;

        // Binding methods to this instance
        this.togglePlay = this.togglePlay.bind(this);
        this.adjustVolume = this.adjustVolume.bind(this);
        this.castButtonClick = this.castButtonClick.bind(this);
        this.updateRadioInfo = this.updateRadioInfo.bind(this);

        // Event listeners
        this.playPauseButton.addEventListener('click', this.togglePlay);
        this.volumeSlider.addEventListener('input', this.adjustVolume);
        this.castButton.addEventListener('click', this.castButtonClick);

        // Load volume from cookie or set default.
        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        // Update combined info (now-playing and DJ info) every 5 seconds.
        this.updateRadioInfo();
        setInterval(this.updateRadioInfo, 5000);

        // Initialize Cast SDK and Media Session API.
        this.initializeCastSDK();
        this.setupMediaSession();
    }

    // Toggle play/pause functionality
    togglePlay() {
        if (this.isPlaying) {
            this.radioPlayer.pause();
            this.isPlaying = false;
        } else {
            this.radioPlayer.play();
            this.isPlaying = true;
        }
    }

    // Adjust volume functionality
    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.setVolumeCookie(this.volumeSlider.value);
    }

    // Combined function to update now-playing and DJ info
    async updateRadioInfo() {
        const url = 'https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/';
        const fetchOptions = {
            method: 'GET',
            cache: 'no-cache'
        };

        try {
            // Fetch the main radio data
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                throw new Error('Het verzoek aan de XerosRadio Servers is mislukt. Probeer het later opnieuw.');
            }

            const data = await response.json();
            const { artist, title, cover_art } = data.current_song;
            const { dj_live_status: djLiveStatus, dj_name: djName, dj_cover: djCover } = data.onair_info;

            // Update the now-playing info (artist and title)
            const artwork200 = cover_art ? cover_art : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;
            this.updateMediaMetadata(artist, title, artwork200, artwork200);

            // Update DJ info
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

            // Now fetch the casting metadata
            const castingResponse = await fetch('https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/metadatacasting');
            if (!castingResponse.ok) {
                throw new Error('Error fetching casting metadata');
            }

            const castingData = await castingResponse.json();
            const { logo_url, title: castingTitle, title2: castingTitle2 } = castingData;

            // Update the media session with the new metadata for casting
            this.updateCastMediaMetadata(castingTitle, castingTitle2, logo_url);

        } catch (error) {
            console.error('Fout:', error);
            this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';
            this.artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
        }
    }

    // New function to update the media metadata for casting
    updateCastMediaMetadata(castingTitle, castingTitle2, logoUrl) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: castingTitle2,
                artist: castingTitle,
                artwork: [
                    { src: logoUrl, sizes: '500x500', type: 'image/webp' },
                    { src: logoUrl, sizes: '200x200', type: 'image/webp' }
                ]
            });
        }
    }

    // Initialize the Cast SDK
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
            }
        };
    }

    // Set up the Media Session API for system controls
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', this.playMedia.bind(this));
            navigator.mediaSession.setActionHandler('pause', this.pauseMedia.bind(this));
            navigator.mediaSession.setActionHandler('stop', this.pauseMedia.bind(this));
            navigator.mediaSession.setActionHandler('seekbackward', () => this.seek(-10));
            navigator.mediaSession.setActionHandler('seekforward', () => this.seek(10));
        }
    }

    // Update Media Session metadata with two artwork images
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

    // Cast session event handling
    handleCastSessionState(event) {
        if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
            this.pauseMedia();
        } else if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
            this.playMedia();
        }
    }

    // Cast button click event
    castButtonClick() {
        if (typeof chrome !== 'undefined' && chrome.cast) {
            const castContext = cast.framework.CastContext.getInstance();
            castContext.requestSession()
                .then(() => this.loadMediaToCast())
                .catch((error) => console.error('Error starting session:', error));
        }
    }

    // Load media to Cast device
    loadMediaToCast() {
        const mediaInfo = new chrome.cast.media.MediaInfo(this.radioPlayer.src, 'audio/mp3');
        mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = "XerosRadio";
        mediaInfo.metadata.subtitle = "Live Stream";

        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        const castSession = cast.framework.CastContext.getInstance().getSession();
        castSession.loadMedia(request)
            .then(() => console.log('Media loaded successfully to Cast device'))
            .catch((error) => console.error('Error loading media:', error));
    }

    // Play media
    playMedia() {
        this.radioPlayer.play();
        this.isPlaying = true;
    }

    // Pause media
    pauseMedia() {
        this.radioPlayer.pause();
        this.isPlaying = false;
    }

    // Adjust volume
    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.setVolumeCookie(this.volumeSlider.value);
    }

    // Save volume to cookie
    setVolumeCookie(volume) {
        document.cookie = `volume=${volume}; path=/`;
    }

    // Get volume from cookie
    getVolumeFromCookie() {
        const volumeCookie = document.cookie.split('; ').find(row => row.startsWith('volume='));
        if (volumeCookie) {
            return parseFloat(volumeCookie.split('=')[1]);
        }
        return null;
    }

    // Seek functionality for skipping tracks
    seek(offset) {
        this.radioPlayer.currentTime += offset;
    }
}

// Initialize the RadioPlayer class
const radioPlayer = new RadioPlayer();
