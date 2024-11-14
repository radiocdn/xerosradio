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

        // Event listeners.
        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this));

        // Load volume from cookie or set default.
        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        // Update combined info (now-playing and DJ info) every 5 seconds.
        this.updateRadioInfo();
        setInterval(this.updateRadioInfo.bind(this), 5000);

        // Initialize Cast SDK and Media Session API.
        this.initializeCastSDK();
        this.setupMediaSession();
    }

    // Function to check if a string is a valid URL
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Combined function to update now-playing and DJ info
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
            // Extract now-playing and DJ info
            const { artist, title, cover_art } = data.current_song;
            const { dj_live_status: djLiveStatus, dj_name: djName, dj_cover: djCover } = data.onair_info;

            // Update now-playing information
            const artwork200 = cover_art ? cover_art : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            this.artistInfo.textContent = artist;
            this.titleInfo.textContent = title;
            this.albumArtwork.src = artwork200;
            this.updateMediaMetadata(artist, title, artwork200, artwork200);

            // Update DJ information
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

                // Disable right-click context menu
                newImage.addEventListener('contextmenu', (e) => e.preventDefault());
                
                this.artworkElement.innerHTML = '';
                this.artworkElement.appendChild(newImage);
            } else {
                this.djInfoElement.textContent = 'Nonstop Muziek';
                this.artworkElement.innerHTML = <img src="${djCover}" alt="XerosRadio Nonstop Muziek" draggable="false" loading="lazy" style="width: 200px; height: 200px;">;
            }
        } catch (error) {
            console.error('Fout:', error);
            this.djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';
            this.artworkElement.innerHTML = <img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_webp,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">;
        }
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
            const mediaInfo = new chrome.cast.media.MediaInfo('https://stream.streamxerosradio.duckdns.org/xerosradio', 'audio/mpeg');
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

    // Adjust volume and save to cookie
    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.saveVolumeToCookie(this.volumeSlider.value);
    }

    // Save volume to cookie
    saveVolumeToCookie(volume) {
        document.cookie = volume=${volume};
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
