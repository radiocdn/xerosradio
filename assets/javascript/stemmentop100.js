const voteList = [];
const maxVotes = 10;
const voteForm = document.getElementById('voteForm');
const voteListEl = document.getElementById('voteList');
const resultsEl = document.getElementById('results');

// Keep track of the currently playing audio
let currentAudio = null;
let currentPlayIcon = null;

const audioOverlay = document.getElementById('audioOverlay');
const audioPreview = document.getElementById('audioPreview');
let currentCoverWrapper = null;
let currentTrack = null;

document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value;
  fetch(`https://php.streamxerosradio.duckdns.org/proxy/?url=https://api.deezer.com/search?q=${encodeURIComponent(query)}&output=jsonp`)
    .then(response => response.text())
    .then(data => {
      const json = JSON.parse(data.match(/{.*}/s)[0]);
      resultsEl.innerHTML = '';
      json.data.forEach(track => {
        const li = document.createElement('li');
        // Add cover art
        const img = document.createElement('img');
        img.src = track.album && track.album.cover_medium ? track.album.cover_medium : '';
        img.alt = 'Cover';

        // Container for cover and icon
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'cover-wrapper';
        coverWrapper.appendChild(img);

        // Only show play icon if preview exists
        if (track.preview) {
          // Reset overlay style for absolute positioning
          audioOverlay.style.position = 'absolute';
          audioOverlay.style.width = '';
          audioOverlay.style.height = '';
          audioOverlay.style.top = '';
          audioOverlay.style.left = '';
          audioOverlay.style.right = '';
          audioOverlay.style.bottom = '';

          coverWrapper.addEventListener('mouseenter', () => {
            // Place overlay inside this coverWrapper
            coverWrapper.appendChild(audioOverlay);
            audioOverlay.style.display = 'block';
            audioOverlay.style.opacity = '1';
            audioOverlay.innerHTML = audioPreview.paused || currentTrack !== track.preview
              ? '<i class="fa-solid fa-play"></i>'
              : '<i class="fa-solid fa-pause"></i>';
            currentCoverWrapper = coverWrapper;
            currentTrack = track.preview;
            // Save for click
            audioOverlay.onclick = () => {
              if (audioPreview.src !== track.preview) {
                audioPreview.src = track.preview;
              }
              if (audioPreview.paused || currentTrack !== track.preview) {
                audioPreview.currentTime = 0;
                audioPreview.play();
                audioOverlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
                currentTrack = track.preview;
              } else {
                audioPreview.pause();
                audioOverlay.innerHTML = '<i class="fa-solid fa-play"></i>';
              }
            };
          });
          coverWrapper.addEventListener('mouseleave', () => {
            audioOverlay.style.display = 'none';
            audioOverlay.onclick = null;
          });
        }

        li.appendChild(coverWrapper);

        // Track info container
        const infoDiv = document.createElement('div');
        infoDiv.className = 'track-info';
        const titleDiv = document.createElement('div');
        titleDiv.className = 'track-title';
        titleDiv.textContent = track.title;
        const artistDiv = document.createElement('div');
        artistDiv.className = 'track-artist';
        artistDiv.textContent = track.artist.name;
        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(artistDiv);
        li.appendChild(infoDiv);

        // Add vote button
        const btn = document.createElement('button');
        btn.type = 'button'; // <-- fix: voorkom submit
        btn.textContent = 'Stem';
        btn.onclick = () => addVote({
          name: `${track.artist.name} - ${track.title}`,
          cover: track.album && track.album.cover_medium ? track.album.cover_medium : ''
        });
        li.appendChild(btn);

        resultsEl.appendChild(li);
      });
    });
});

// Audio events to update icon and hide overlay if needed
audioPreview.addEventListener('ended', () => {
  audioOverlay.innerHTML = '<i class="fa-solid fa-play"></i>';
});
audioPreview.addEventListener('pause', () => {
  audioOverlay.innerHTML = '<i class="fa-solid fa-play"></i>';
});
audioPreview.addEventListener('play', () => {
  audioOverlay.innerHTML = '<i class="fa-solid fa-pause"></i>';
});

// Pas voteList aan naar objecten met name en cover
function addVote(trackObj) {
  if (voteList.some(t => t.name === trackObj.name)) return;
  if (voteList.length >= maxVotes) {
    Swal.fire({
      title: "Maximaal aantal stemmen bereikt!",
      text: "Je kunt maximaal 10 stemmen uitbrengen.",
      confirmButtonText: "Sluiten",
      icon: "error",
    });
    return;
  }
  voteList.push(trackObj);
  updateVoteList();
}

function updateVoteList() {
  voteListEl.innerHTML = '';
  voteList.forEach((track, index) => {
    const li = document.createElement('li');
    // Voeg cover toe als die er is
    if (track.cover) {
      const img = document.createElement('img');
      img.src = track.cover;
      img.alt = 'Cover';
      li.appendChild(img);
    }
    // Track info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'track-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'track-title';
    titleDiv.textContent = track.name;
    infoDiv.appendChild(titleDiv);
    li.appendChild(infoDiv);

    const btn = document.createElement('button');
    btn.textContent = 'Verwijder';
    btn.type = 'button';
    // Hoofdkleuren consistent maken
    btn.style.background = 'linear-gradient(90deg, #008cff 70%, #8400ff 100%)';
    btn.style.border = '1.5px solid #008cff';
    btn.style.color = 'white';
    btn.style.borderRadius = '6px';
    btn.style.fontWeight = '600';
    btn.style.fontSize = '0.9rem';
    btn.style.padding = '6px 12px';
    btn.style.cursor = 'pointer';
    btn.onmouseover = () => btn.style.background = 'linear-gradient(90deg, #008cff 70%, #8400ff 100%)';
    btn.onmouseout = () => btn.style.background = 'linear-gradient(90deg, #008cff 70%, #8400ff 100%)';
    btn.onclick = () => {
      voteList.splice(index, 1);
      updateVoteList();
    };
    li.appendChild(btn);
    voteListEl.appendChild(li);
  });
}

voteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;

  // Voeg controle toe op lege stemmenlijst
  if (voteList.length === 0) {
    document.getElementById('response').textContent = 'Je moet minimaal 1 nummer kiezen om te stemmen.';
    return;
  }

  // Alleen de namen meesturen naar de backend
  const votesToSend = voteList.map(t => t.name);

  const res = await fetch('https://xerosradiocdn.global.ssl.fastly.net/api/vote.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, votes: votesToSend })
  });

  const data = await res.json();
  document.getElementById('response').textContent = data.message;

  if (data.success) {
    voteList.length = 0;
    updateVoteList();
  }
});
