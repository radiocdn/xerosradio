const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('playPauseBtn');

function updateButton() {
  playPauseBtn.textContent = audio.paused ? 'Afspelen' : 'Pauze';
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

// Initialize button text on load
updateButton();
