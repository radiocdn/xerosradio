const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('playPauseBtn');

// Improve accessibility: update aria-label
function updateButton() {
  playPauseBtn.textContent = audio.paused ? 'Afspelen' : 'Pauze';
  playPauseBtn.setAttribute('aria-label', audio.paused ? 'Afspelen' : 'Pauzeren');
}

// Update button text when clicking the button
playPauseBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
  updateButton();
});

// Also update button text if playback ends or is paused by other means
audio.addEventListener('ended', updateButton);
audio.addEventListener('pause', updateButton);
audio.addEventListener('play', updateButton);
audio.addEventListener('loadeddata', updateButton);
audio.addEventListener('waiting', updateButton);

// Initialize button text on load
updateButton();

// Media Session API integration
if ('mediaSession' in navigator) {
  // Set metadata (customize as needed)
  navigator.mediaSession.metadata = new window.MediaMetadata({
    title: 'Nieuws',
    artist: 'XerosRadio',
    artwork: [
      { 
        src: 'https://res.cloudinary.com/xerosradio/image/upload/w_500,h_500,f_webp,q_auto/XerosRadio_Logo_Nieuws', 
        sizes: '500x500', 
        type: 'image/webp' 
      }
    ]
  });

  // Action handlers
  navigator.mediaSession.setActionHandler('play', () => {
    audio.play();
    updateButton();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    audio.pause();
    updateButton();
  });
  navigator.mediaSession.setActionHandler('stop', () => {
    audio.pause();
    audio.currentTime = 0;
    updateButton();
  });
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const skipTime = details && details.seekOffset ? details.seekOffset : 10;
    audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
  });
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const skipTime = details && details.seekOffset ? details.seekOffset : 10;
    audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration || audio.currentTime + skipTime);
  });
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details && typeof details.seekTime === 'number') {
      audio.currentTime = details.seekTime;
    }
  });
}
