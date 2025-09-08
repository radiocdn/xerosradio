document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("playlist-container");
    const apiURL = "https://xr-api-prd.faststreamdiensten.nl/playlist";
    const fallbackImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto,w_200,h_200/XerosRadio_Logo_Achtergrond_Wit";

    function createElement(tag, className = "", content = "") {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content) el.textContent = content; // altijd veilige tekst
        return el;
    }

    function formatPlayedAt(dateString) {
        if (!dateString) return "";
        // Try to parse as time (HH:MM) or as ISO string
        if (/^\d{2}:\d{2}$/.test(dateString)) return dateString;
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    }

    function createPlaylistItem(item) {
        const artist = item.artist || "Onbekend";
        const title = item.title || "Onbekend nummer";
        const playedAt = formatPlayedAt(item.played_at);
        const cover = item.cover_art200x200 && item.cover_art200x200.startsWith("http") ? item.cover_art200x200 : fallbackImage;

        const div = createElement("div", "playlist-item");

        const img = createElement("img", "song-cover-playlist");
        img.src = cover;
        img.alt = `${artist} - ${title}`;
        img.loading = "lazy";
        img.decoding = "async";
        img.draggable = false;
        img.onerror = () => {
            img.src = fallbackImage;
        };

        const details = createElement("div", "details");
        const h2 = createElement("h2", "", artist);
        const pTitle = createElement("p", "", title);

        // DJ naam + kleine cirkel met dj_cover
        if (item.dj && item.dj.trim() !== "") {
            const djWrapper = createElement("p", "dj-name");
            djWrapper.textContent = `Gedraaid door ${item.dj} `;

            if (item.dj_cover && item.dj_cover.startsWith("http")) {
                const djImg = document.createElement("img");
                djImg.src = item.dj_cover;
                djImg.alt = `${item.dj}`;
                djImg.className = "dj-cover";
                djImg.loading = "lazy";
                djImg.decoding = "async";
                djImg.onerror = () => {
                    djImg.style.display = "none";
                };
                djWrapper.appendChild(djImg);
            }
            details.appendChild(djWrapper);
        }

        const pDate = createElement("p", "", playedAt);

        details.append(h2, pTitle, pDate);

        const links = createElement("div", "spotify-youtube-container");
        const searchQuery = encodeURIComponent(`${artist} - ${title}`);

        const platforms = [
            {
                href: `https://open.spotify.com/search/${searchQuery}`,
                icon: "fab fa-spotify spotify-icon",
                label: "Zoek op Spotify"
            },
            {
                href: `https://www.youtube.com/results?search_query=${searchQuery}`,
                icon: "fab fa-youtube youtube-icon",
                label: "Zoek op YouTube"
            },
            {
                href: `https://soundcloud.com/search?q=${searchQuery}`,
                icon: "fab fa-soundcloud soundcloud-icon",
                label: "Zoek op SoundCloud"
            }
        ];
        platforms.forEach(({ href, icon, label }) => {
            const a = document.createElement("a");
            a.href = href;
            a.target = "_blank";
            a.rel = "noopener";
            a.setAttribute("aria-label", label);
            a.innerHTML = `<i class="${icon}"></i>`;
            links.appendChild(a);
        });
        div.append(img, details, links);

        return div;
    }

    async function fetchWithRetry(url, options = {}, retries = 2, delay = 500) {
        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) throw new Error("Kan de afspeellijst niet laden.");
                return await response.json();
            } catch (err) {
                if (i === retries) throw err;
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }

    // Add spinner SVG and refresh button
    function showLoader() {
        container.innerHTML = `
            <div class="col mx-auto">
                <div class="alert alert-info text-center mx-auto" style="width: fit-content; display: flex; align-items: center; gap: 10px;">
                    <svg width="24" height="24" viewBox="0 0 50 50" aria-hidden="true" focusable="false" style="vertical-align:middle"><circle cx="25" cy="25" r="20" fill="none" stroke="#8008f0ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.415, 31.415" transform="rotate(72.3242 25 25)"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg>
                    <span id="playlist-loading-text">Laden van de Playlist...</span>
                </div>
            </div>
        `;
    }

    function showEmptyMessage() {
        container.innerHTML = `
            <div class="col mx-auto">
                <div class="alert alert-info text-center mx-auto" style="width: fit-content;">ℹ️ Helaas, er zijn geen nummers gevonden.</div>
            </div>
        `;
    }

    function showErrorMessage(message) {
        container.innerHTML = `
            <div class="col mx-auto">
                <div class="alert alert-danger text-center mx-auto" style="width: fit-content;">❌ Fout bij het laden van de afspeellijst probeer het later opnieuw.</div>
            </div>
        `;
    }

    function addRefreshButton() {
        let btn = document.getElementById("playlist-refresh-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "playlist-refresh-btn";
            btn.type = "button";
            btn.className = "xerosradiobutton";
            btn.innerHTML = '<i class="fa fa-rotate-right" aria-hidden="true"></i> Vernieuwen';
            btn.title = "Vernieuw de afspeellijst";
            btn.style.margin = "10px 0 10px 8px";
            btn.onclick = () => {
                btn.disabled = true;
                showLoader();
                loadPlaylist().finally(() => { btn.disabled = false; });
            };
            container.parentNode.insertBefore(btn, container);
        }
    }

    async function loadPlaylist() {
        showLoader();
        try {
            const data = await fetchWithRetry(apiURL);
            container.innerHTML = "";
            if (!Array.isArray(data) || data.length === 0) {
                showEmptyMessage();
                return;
            }
            const fragment = document.createDocumentFragment();
            data.forEach(item => {
                fragment.appendChild(createPlaylistItem(item));
            });
            container.appendChild(fragment);
        } catch (error) {
            showErrorMessage(error.message);
            console.error(error);
        }
    }

    addRefreshButton();
    loadPlaylist();
});
