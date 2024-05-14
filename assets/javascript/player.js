class RadioPlayer {
    constructor() {
        // Get the XerosRadio API DOM elements.
        this.radioPlayer = document.getElementById('radioPlayer');
        // Add 'preload' attribute with value 'none' to prevent automatic audio loading.
        this.radioPlayer.setAttribute('preload', 'none');
        this.artistInfo = document.getElementById('artistInfo');
        this.titleInfo = document.getElementById('titleInfo');
        this.albumArtwork = document.getElementById('albumArtwork');
        this.playPauseButton = document.getElementById('playPauseButton');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.castButton = document.getElementById('castButton'); // Add Cast button reference

        // Create a XerosRadio API variable to track the playing state.
        this.isPlaying = false;

        // Add event XerosRadio API listeners.
        this.playPauseButton.addEventListener('click', this.togglePlay.bind(this));
        this.volumeSlider.addEventListener('input', this.adjustVolume.bind(this));
        this.castButton.addEventListener('click', this.castButtonClick.bind(this)); // Add Cast button click event listener

        // Load volume level from cookie or set default value.
        this.volumeSlider.value = this.getVolumeFromCookie() || 0.5;
        this.radioPlayer.volume = this.volumeSlider.value;

        // Update XerosRadio now playing info initially and then every 5 seconds.
        this.updateNowPlaying();
        setInterval(this.updateNowPlaying.bind(this), 5000); // Update every 5 seconds.

        // Initialize the Cast SDK
        window['__onGCastApiAvailable'] = isAvailable => {
            if (isAvailable) {
                this.initializeCastApi();
            }
        };

        // Listen for Cast session state changes
        const castContext = cast.framework.CastContext.getInstance();
        castContext.addEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            event => {
                switch (event.sessionState) {
                    case cast.framework.SessionState.SESSION_STARTED:
                        // A Cast session has started, pause the local audio player
                        this.pauseLocalAudioPlayer();
                        break;
                    case cast.framework.SessionState.SESSION_ENDED:
                    case cast.framework.SessionState.SESSION_RESUMED:
                        // A Cast session has ended or resumed, resume the local audio player
                        this.resumeLocalAudioPlayer();
                        break;
                    default:
                        break;
                }
            }
        );
    }

    // Function to initialize the Cast SDK
    initializeCastApi() {
        const castContext = cast.framework.CastContext.getInstance();
        castContext.setOptions({
            receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
    }

    // Function to handle the Cast button click event
    castButtonClick() {
        // Check if Cast SDK is available and initialized
        if (cast && cast.framework && cast.framework.CastContext) {
            const context = cast.framework.CastContext.getInstance();
            context.requestSession().then(() => {
                console.log('Session started successfully.');
                // Load media to the Cast device
                this.loadMediaToCast();
            }).catch(error => {
                console.error('Error starting session:', error);
            });
        } else {
            console.error("Cast SDK is not available or initialized.");
        }
    }

    // Function to load media to the Cast device
    loadMediaToCast() {
        const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
        if (!castSession) {
            console.error('No active Cast session.');
            return;
        }

        const mediaInfo = new chrome.cast.media.MediaInfo('https://stream.streamxerosradio.duckdns.org/xerosradio', 'audio/mp3');
        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        castSession.loadMedia(request).then(() => {
            console.log('Media loaded successfully.');
        }).catch(error => {
            console.error('Error loading media:', error);
        });
    }

    // Function to handle Cast session state changes
    handleCastSessionState(event) {
        switch (event.sessionState) {
            case cast.framework.SessionState.SESSION_STARTED:
                // A Cast session has started, pause the local audio player
                this.pauseLocalAudioPlayer();
                break;
            case cast.framework.SessionState.SESSION_ENDED:
            case cast.framework.SessionState.SESSION_RESUMED:
                // A Cast session has ended or resumed, resume the local audio player
                this.resumeLocalAudioPlayer();
                break;
            default:
                break;
        }
    }

    // Function to pause the local audio player
    pauseLocalAudioPlayer() {
        if (this.isPlaying) {
            this.radioPlayer.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton();
        }
    }

    // Function to resume the local audio player
    resumeLocalAudioPlayer() {
        if (!this.isPlaying) {
            this.radioPlayer.play();
            this.isPlaying = true;
            this.updatePlayPauseButton();
        }
    }

    // Function to update the XerosRadio API play/pause button icon.
    updatePlayPauseButton() {
        if (this.isPlaying) {
            this.playPauseButton.className = 'fas fa-pause';
        } else {
            this.playPauseButton.className = 'fas fa-play';
        }
    }

    // Function to update XerosRadio API now playing info and artwork info.
    updateNowPlaying() {
        // Fetch now playing info from the XerosRadio API.
        fetch('https://azuracast.streamxerosradio.duckdns.org/api/nowplaying_static/xerosradio.json')
            .then(response => response.json())
            .then(data => {
                const artist = data['now_playing']['song']['artist'];
                const title = data['now_playing']['song']['title'];

                this.artistInfo.textContent = artist;
                this.titleInfo.textContent = title;

                // Fetch album artwork from XerosRadio API.
                const query = `${artist} ${title}`;
                fetch(`https://corsproxy.io?https://api.deezer.com/search?q=${query}&limit=1&output=json`)
                    .then(response => response.json())
                    .then(deezerData => {
                        if (deezerData['data'][0]) {
                            const artworkURL = deezerData['data'][0]['album']['cover_big'];
                            this.albumArtwork.src = 'https://wsrv.nl/?w=200&h=200&output=webp&url=' + artworkURL;
                        } else {
                            // Use default artwork if not found.
                            this.albumArtwork.src = 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/XerosRadio_Logo_Achtergrond_Wit';
                        }
                    })
                    .catch(error => console.error('XerosRadio API Error:', error));
            })
            .catch(error => console.error('XerosRadio API Error:', error));
    }

    // Function to handle the XerosRadio API play/pause button click.
    togglePlay() {
        if (this.isPlaying) {
            this.radioPlayer.pause();
        } else {
            this.radioPlayer.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updatePlayPauseButton();
    }

    // Function to handle volume slider change for XerosRadio API.
    adjustVolume() {
        this.radioPlayer.volume = this.volumeSlider.value;
        this.saveVolumeToCookie(this.volumeSlider.value);
    }

    // Function to save volume level to a cookie.
    saveVolumeToCookie(volume) {
        document.cookie = `volume=${volume}`;
    }

    // Function to get volume level from cookie.
    getVolumeFromCookie() {
        const cookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('volume='));
        if (cookie) {
            return parseFloat(cookie.split('=')[1]);
        }
        return null;
    }
}

// Create an instance of the RadioPlayer class.
const radioPlayer = new RadioPlayer();
