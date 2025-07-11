document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("playlist-container");
    const apiURL = "https://xerosradioapiprd.global.ssl.fastly.net/playlist";
    const fallbackImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto,w_200,h_200/XerosRadio_Logo_Achtergrond_Wit";

    function createElement(tag, className = "", content = "") {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content && !content.includes("<")) {
            el.textContent = content; // veilige tekst
        } else if (content) {
            el.innerHTML = content; // HTML mag gebruikt worden
        }
        return el;
    }

    function formatPlayedAt(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleString();
    }

    function createPlaylistItem(item) {
        const artist = item.artist || "Onbekend";
        const title = item.title || "Onbekend nummer";
        const playedAt = formatPlayedAt(item.played_at);
        const cover = item.album_cover && item.album_cover.startsWith("http") ? item.album_cover : fallbackImage;

        const div = createElement("div", "playlist-item");

        const img = createElement("img");
        img.src = cover;
        img.alt = `${artist} - ${title}`;
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        img.onerror = () => {
            img.src = fallbackImage;
        };

        const details = createElement("div", "details", `
            <h2>${artist}</h2>
            <p>${title}</p>
            <p>${playedAt}</p>
        `);

        const links = createElement("div", "spotify-youtube-container");
        const searchQuery = encodeURIComponent(`${artist} - ${title}`);

        const spotify = createElement("a");
        spotify.href = `https://open.spotify.com/search/${searchQuery}`;
        spotify.target = "_blank";
        spotify.rel = "noopener";
        spotify.innerHTML = `<i class="fab fa-spotify spotify-icon"></i>`;

        const youtube = createElement("a");
        youtube.href = `https://www.youtube.com/results?search_query=${searchQuery}`;
        youtube.target = "_blank";
        youtube.rel = "noopener";
        youtube.innerHTML = `<i class="fab fa-youtube youtube-icon"></i>`;

        const soundcloud = createElement("a");
        soundcloud.href = `https://soundcloud.com/search?q=${searchQuery}`;
        soundcloud.target = "_blank";
        soundcloud.rel = "noopener";
        soundcloud.innerHTML = `<i class="fab fa-soundcloud soundcloud-icon"></i>`;

        links.append(spotify, youtube, soundcloud);
        div.append(img, details, links);

        return div;
    }

    async function loadPlaylist() {
        container.textContent = "Laden van de Playlist...";

        try {
            const response = await fetch(apiURL);
            if (!response.ok) {
                throw new Error("Kan de afspeellijst niet laden.");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = `<p class="empty-message">Helaas, er zijn geen nummers gevonden.</p>`;
                return;
            }

            container.innerHTML = "";
            const fragment = document.createDocumentFragment();
            data.forEach(item => {
                fragment.appendChild(createPlaylistItem(item));
            });
            container.appendChild(fragment);

        } catch (error) {
            container.innerHTML = `<p>Fout bij het laden van de afspeellijst: ${error.message}</p>`;
            console.error(error);
        }
    }

    loadPlaylist();
});
