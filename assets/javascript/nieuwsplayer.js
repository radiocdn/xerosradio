const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('playPauseBtn');

playPauseBtn.addEventListener('click', function () {
    if (audio.paused) {
        audio.play();
        playPauseBtn.textContent = 'Pauze';
    } else {
        audio.pause();
        playPauseBtn.textContent = 'Afspelen';
    }
});
