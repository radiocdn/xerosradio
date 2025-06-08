    document.addEventListener("DOMContentLoaded", function () {
        const container = document.getElementById("playlist-container");
        const apiURL = "https://xerosradioapiprd.global.ssl.fastly.net/playlist";
        const fallbackImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo";

        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error("Kan de afspeellijst niet laden.");
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    container.innerHTML = "<p>Helaas, er zijn geen nummers gevonden.</p>";
                    return;
                }

                container.innerHTML = ""; // Clear loading text

                data.forEach(item => {
                    const artist = item.artist || "Onbekend";
                    const title = item.title || "Onbekend nummer";
                    const playedAt = item.played_at || "";
                    const cover = item.album_cover && item.album_cover.startsWith("http") ? item.album_cover : fallbackImage;

                    const div = document.createElement("div");
                    div.className = "playlist-item";

                    div.innerHTML = `
                        <img src="${cover}" alt="${artist} - ${title}" loading="lazy" draggable="false">
                        <div class="details">
                            <h2>${artist}</h2>
                            <p>${title}</p>
                            <p>${playedAt}</p>
                        </div>
                        <div class="spotify-youtube-container">
                            <a href="https://open.spotify.com/search/${encodeURIComponent(artist + ' - ' + title)}" target="_blank" rel="noopener">
                                <i class="fab fa-spotify spotify-icon"></i>
                            </a>
                            <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' - ' + title)}" target="_blank" rel="noopener">
                                <i class="fab fa-youtube youtube-icon"></i>
                            </a>
                            <a href="https://soundcloud.com/search?q=${encodeURIComponent(artist + ' - ' + title)}" target="_blank" rel="noopener">
                                <i class="fab fa-soundcloud soundcloud-icon"></i>
                            </a>
                        </div>
                    `;

                    container.appendChild(div);
                });
            })
            .catch(error => {
                container.innerHTML = `<p>Fout bij het laden van de afspeellijst: ${error.message}</p>`;
            });
    });
