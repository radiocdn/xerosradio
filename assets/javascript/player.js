class RadioPlayer {
    constructor() {
        // Get the XerosRadio API DOM elements.
        this.radioPlayer = document.getElementById('radioPlayer');
        this.radioPlayer.setAttribute('preload', 'none');
        this.artistInfo = document.getElementById('artistInfo');
        this.titleInfo = document.getElementById('titleInfo');
        this.albumArtwork = document.getElementById('albumArtwork');
        this.playPauseButton = document.getElementById('playPauseButton');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.castButton = document.getElementById('castButton');

        // XerosRadio API variable to track the playing state.
        this.isPlaying = false;

        // Event listeners.
        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        // Load volume from cookie or set default.
        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        // Update XerosRadio now-playing info every 5 seconds.
        this.updateNowPlaying();
        setInterval(this.updateNowPlaying.bind(this), 5000);

        // Initialize Cast SDK and Media Session API.
        this.initializeCastSDK();
        this.setupMediaSession();
    }

    // Initialize the Cast SDK
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
        const castContext = cast.framework.CastContext.getInstance();
        castContext.requestSession()
            .then(() => this.loadMediaToCast())
            .catch(error => console.error('Error starting session:', error));
    }

    // Load media to Cast device
    loadMediaToCast() {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session) {
            const mediaInfo = new chrome.cast.media.MediaInfo('https://xerosradiostream.global.ssl.fastly.net/xerosradio', 'audio/mpeg');
            const request = new chrome.cast.media.LoadRequest(mediaInfo);
            session.loadMedia(request)
                .then(() => console.log('Media loaded successfully.'))
                .catch(error => console.error('Error loading media:', error));
        }
    }

    // Toggle play/pause functionality
    togglePlay() {
        if (this.isPlaying) {
            this.pauseMedia();
        } else {
            this.playMedia();
        }
        this.updatePlayPauseButton();
    }

    // Play media
    playMedia() {
        this.radioPlayer.play();
        this.isPlaying = true;
        this.updatePlayPauseButton();
    }

    // Pause media
    pauseMedia() {
        this.radioPlayer.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }

    // Update play/pause button icon
    updatePlayPauseButton() {
        this.playPauseButton.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    // Update now-playing information
    updateNowPlaying() {
        fetch('https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/')
            .then(response => response.json())
            .then(data => {
                const artist = data.current_song.artist;
                const title = data.current_song.title;
                const artwork200 = data.current_song.cover_art200x200 || 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
                const artwork500 = data.current_song.cover_art500x500 || 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';

                // Update UI and Media Session metadata.
                this.artistInfo.textContent = artist;
                this.titleInfo.textContent = title;
                this.albumArtwork.src = artwork200;
                this.updateMediaMetadata(artist, title, artwork200, artwork500); // Pass both artworks
            })
            .catch(error => console.error('XerosRadio API Error:', error));
    }

    // Adjust volume and save to cookie
    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.saveVolumeToCookie(this.volumeSlider.value);
    }

    // Save volume to cookie
    saveVolumeToCookie(volume) {
        document.cookie = `volume=${volume}`;
    }

    // Get volume from cookie
    getVolumeFromCookie() {
        const cookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('volume='));
        return cookie ? parseFloat(cookie.split('=')[1]) : null;
    }

    // Seek forward or backward
    seek(seconds) {
        this.radioPlayer.currentTime += seconds;
    }
}

// Create an instance of the RadioPlayer class.
const radioPlayer = new RadioPlayer();
