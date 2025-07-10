document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("playlist-container");
    const apiURL = "https://xerosradioapiprd.global.ssl.fastly.net/playlist";
    const fallbackImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto,w_200,h_200/XerosRadio_Logo_Achtergrond_Wit";

    /**
     * Utility functie om een element aan te maken met optionele class en innerHTML
     * @param {string} tag - Het HTML-elementtype
     * @param {string} [className] - Optionele CSS-class
     * @param {string} [innerHTML] - Optionele inhoud
     * @returns {HTMLElement}
     */
    function createElement(tag, className = "", innerHTML = "") {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    /**
     * Format de datumtijd van het afgespeelde nummer naar een leesbare string
     * @param {string} dateString - De originele datumtijdstring
     * @returns {string} - Geformatteerde datumtijd of lege string
     */
    function formatPlayedAt(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date)) return dateString; // fallback als datum ongeldig is
        return date.toLocaleString(); // evt. locale aanpassen indien gewenst
    }

    /**
     * Maak een playlist-item DOM-element
     * @param {Object} item - Playlist item met data
     * @returns {HTMLElement}
     */
    function createPlaylistItem(item) {
        const artist = item.artist || "Onbekend";
        const title = item.title || "Onbekend nummer";
        const playedAt = formatPlayedAt(item.played_at);
        const cover = (item.album_cover && item.album_cover.startsWith("http")) 
            ? item.album_cover 
            : fallbackImage;

        const div = createElement("div", "playlist-item");

        const img = createElement("img");
        img.src = cover;
        img.alt = `${artist} - ${title}`;
        img.loading = "lazy";
        img.draggable = false;

        const details = createElement("div", "details");
        details.innerHTML = `
            <h2>${artist}</h2>
            <p>${title}</p>
            <p>${playedAt}</p>
        `;

        const linksContainer = createElement("div", "spotify-youtube-container");
        const searchQuery = encodeURIComponent(`${artist} - ${title}`);

        const spotifyLink = createElement("a");
        spotifyLink.href = `https://open.spotify.com/search/${searchQuery}`;
        spotifyLink.target = "_blank";
        spotifyLink.rel = "noopener";
        spotifyLink.innerHTML = `<i class="fab fa-spotify spotify-icon"></i>`;

        const youtubeLink = createElement("a");
        youtubeLink.href = `https://www.youtube.com/results?search_query=${searchQuery}`;
        youtubeLink.target = "_blank";
        youtubeLink.rel = "noopener";
        youtubeLink.innerHTML = `<i class="fab fa-youtube youtube-icon"></i>`;

        const soundcloudLink = createElement("a");
        soundcloudLink.href = `https://soundcloud.com/search?q=${searchQuery}`;
        soundcloudLink.target = "_blank";
        soundcloudLink.rel = "noopener";
        soundcloudLink.innerHTML = `<i class="fab fa-soundcloud soundcloud-icon"></i>`;

        linksContainer.append(spotifyLink, youtubeLink, soundcloudLink);

        div.append(img, details, linksContainer);

        return div;
    }

    /**
     * Laad de playlist via API en toon in de container
     */
    async function loadPlaylist() {
        container.innerHTML = "<p>Laden...</p>"; // laadstatus tonen

        try {
            const response = await fetch(apiURL);

            if (!response.ok) {
                throw new Error("Kan de afspeellijst niet laden.");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = "<p>Helaas, er zijn geen nummers gevonden.</p>";
                return;
            }

            container.innerHTML = ""; // laadtekst verwijderen

            data.forEach(item => {
                container.appendChild(createPlaylistItem(item));
            });

        } catch (error) {
            container.innerHTML = `<p>Fout bij het laden van de afspeellijst: ${error.message}</p>`;
            console.error(error);
        }
    }

    // Start laden zodra DOM klaar is
    loadPlaylist();
});
