const API_URL = "https://xr-api.faststreamdiensten.nl/api/xerosradio/vote/uitslag.php";
const FALLBACK_IMAGE = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo";

let allSongs = [];

async function fetchTopSongs() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("API geeft geen geldig antwoord.");
    let songs = await response.json();

    // Sorteer origineel descending op votes en nummer als echte positie
    songs.sort((a,b) => b.votes - a.votes);
    allSongs = songs.map((song, index) => ({
      ...song,
      realRank: index + 1
    }));

    filterSongs();
  } catch (error) {
    document.getElementById("song-list").innerHTML = `
      <div class="col mx-auto">
        <div class="alert alert-danger text-center mx-auto" style="width: fit-content;">❌ Kan de lijst niet laden. Probeer het later opnieuw.</div>
      </div>`;
  }
}

function filterSongs() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const sortDir = document.getElementById('sortSelect').value;

  let filtered = allSongs.filter(song =>
    song.title.toLowerCase().includes(search) ||
    song.artist.toLowerCase().includes(search)
  );

  filtered.sort((a,b) => sortDir === 'asc' ? a.votes - b.votes : b.votes - a.votes);

  renderSongs(filtered);
}

function renderSongs(songs) {
  const container = document.getElementById("song-list");
  
container.querySelectorAll('.loading').forEach(el => el.remove());

container.innerHTML = '';

  if(songs.length === 0){
    container.innerHTML = `
      <div class="col mx-auto">
        <div class="alert alert-warning text-center mx-auto" style="width: fit-content;">⚠️ Geen resultaten gevonden.</div>
      </div>`;
    return;
  }

  songs.forEach((song, i) => {
    const delay = (i * 100) + 'ms'; // Stagger animatie delay
    const html = `
      <div class="col">
        <div class="song-card card h-100" tabindex="0" aria-label="#${song.realRank} - ${song.title} door ${song.artist}, ${song.votes} stemmen" style="animation-delay: ${delay};">
          <img src="${song.cover_url || FALLBACK_IMAGE}" alt="Cover van ${song.title}" class="song-cover" onerror="this.src='${FALLBACK_IMAGE}'" />
          <div class="card-body">
            <h5 class="card-title">#${song.realRank} - ${song.title}</h5>
            <p class="card-text">🎤 ${song.artist}</p>
          </div>
          <div class="card-footer">
            <span class="votes">${song.votes} stemmen</span>
          </div>
        </div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });
}

fetchTopSongs();
