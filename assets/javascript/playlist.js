document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("playlist-container");
    const apiURL = "https://xr-api-prd.faststreamdiensten.nl/playlist";
    const fallbackImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto,w_200,h_200/XerosRadio_Logo_Achtergrond_Wit";
    const refreshInterval = 60 * 1000; // Auto-refresh every 60 seconds
    let autoRefreshTimer = null;

    // Initialize lozad observer (wait until lozad script is available)
    let lozadObserver = null;
    if (window.lozad) {
        lozadObserver = lozad(".lozad", {
            rootMargin: "10px 0px", // start loading a bit before the image is in viewport
            threshold: 0.1,
            loaded: function(el) {
                // Optional: add a class when loaded for fade-in CSS
                el.classList.add("lozad-loaded");
            }
        });
        // we will call lozadObserver.observe() after we append images
    } else {
        // If lozad isn't loaded for some reason, we still proceed (images will use src fallback)
        console.warn("lozad not found - images will not be lazy-loaded");
    }

    // Utility to create elements
    function createElement(tag, className = "", content = "") {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content) el.textContent = content;
        return el;
    }

    // Format played_at string
    function formatPlayedAt(dateString) {
        if (!dateString) return "";
        if (/^\d{2}:\d{2}$/.test(dateString)) return dateString;
        const date = new Date(dateString);
        if (isNaN(date)) return dateString;
        return date.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    }

    // Create a playlist item element
    function createPlaylistItem(item) {
        const artist = item.artist || "Onbekend";
        const title = item.title || "Onbekend nummer";
        const playedAt = formatPlayedAt(item.played_at);
        const cover = item.cover_art200x200 && item.cover_art200x200.startsWith("http")
            ? item.cover_art200x200
            : fallbackImage;

        const div = createElement("div", "playlist-item");

        // Create img element but use lozad data-src instead of src
        const img = createElement("img", "song-cover-playlist lozad");
        img.alt = `${artist} - ${title}`;
        img.setAttribute("decoding", "async");
        img.draggable = false;
        // set data-src for lozad
        img.dataset.src = cover;
        // set a tiny placeholder src (very small transparent image) to avoid layout shift if desired
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
        // error fallback: if loading fails, show fallbackImage
        img.onerror = () => { img.src = fallbackImage; img.removeAttribute("data-src"); img.classList.remove("lozad"); };

        const details = createElement("div", "details");
        const h2 = createElement("h2", "", artist);
        const pTitle = createElement("p", "", title);

        if (item.dj && item.dj.trim() !== "") {
            const djWrapper = createElement("p", "dj-name");
            djWrapper.textContent = `Gedraaid door ${item.dj}`;
            if (item.dj_cover && item.dj_cover.startsWith("http")) {
                const djImg = createElement("img", "dj-cover lozad");
                djImg.alt = item.dj;
                djImg.setAttribute("decoding", "async");
                djImg.draggable = false;
                djImg.dataset.src = item.dj_cover;
                djImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                djImg.onerror = () => { djImg.style.display = "none"; djImg.removeAttribute("data-src"); djImg.classList.remove("lozad"); };
                djWrapper.appendChild(djImg);
            }
            details.appendChild(djWrapper);
        }

        const pDate = createElement("p", "", playedAt);
        details.append(h2, pTitle, pDate);

        const links = createElement("div", "spotify-youtube-container");
        const searchQuery = encodeURIComponent(`${artist} - ${title}`);
        const platforms = [
            { href: `https://open.spotify.com/search/${searchQuery}`, icon: "fab fa-spotify spotify-icon", label: "Zoek op Spotify" },
            { href: `https://www.youtube.com/results?search_query=${searchQuery}`, icon: "fab fa-youtube youtube-icon", label: "Zoek op YouTube" },
            { href: `https://soundcloud.com/search?q=${searchQuery}`, icon: "fab fa-soundcloud soundcloud-icon", label: "Zoek op SoundCloud" }
        ];

        platforms.forEach(({ href, icon, label }) => {
            const a = createElement("a");
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

    // Fetch with retry
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

    // Loader
    function showLoader() {
        container.innerHTML = `
            <div class="col mx-auto">
                <div class="alert alert-info text-center mx-auto" style="width: fit-content; display: flex; align-items: center; gap: 10px;">
                    <svg width="24" height="24" viewBox="0 0 50 50" aria-hidden="true" focusable="false" style="vertical-align:middle">
                        <circle cx="25" cy="25" r="20" fill="none" stroke="#8008f0ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="31.415, 31.415" transform="rotate(72.3242 25 25)">
                            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                    Laden van de Playlist...
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
                <div class="alert alert-danger text-center mx-auto" style="width: fit-content;">❌ Fout bij het laden van de afspeellijst, probeer het later opnieuw.</div>
            </div>
        `;
    }

    // Refresh button
    function addRefreshButton() {
        let btn = document.getElementById("playlist-refresh-btn");
        if (!btn) {
            btn = createElement("button", "xerosradiobutton");
            btn.id = "playlist-refresh-btn";
            btn.type = "button";
            btn.innerHTML = '<i class="fa fa-rotate-right" aria-hidden="true"></i> Vernieuwen';
            btn.title = "Vernieuw de afspeellijst";
            btn.style.margin = "10px 0 10px 8px";

            btn.onclick = async () => {
                btn.disabled = true;
                showLoader();
                try {
                    await loadPlaylist();
                } finally {
                    btn.disabled = false;
                }
            };

            container.parentNode.insertBefore(btn, container);
        }
    }

    // Load playlist
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
            data.forEach(item => fragment.appendChild(createPlaylistItem(item)));
            container.appendChild(fragment);

            // Tell lozad to observe new elements (if lozad is available)
            if (lozadObserver) {
                lozadObserver.observe(); // scan for .lozad elements and observe them
            } else {
                // If lozad not present, we can set actual src for images to ensure they load
                const imgs = container.querySelectorAll("img[data-src]");
                imgs.forEach(img => {
                    img.src = img.dataset.src || img.src;
                    img.removeAttribute("data-src");
                });
            }
        } catch (error) {
            showErrorMessage(error.message);
            console.error(error);
        }
    }

    // Auto-refresh setup
    function startAutoRefresh() {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        autoRefreshTimer = setInterval(async () => {
            const btn = document.getElementById("playlist-refresh-btn");
            if (!btn.disabled) { // Only refresh if button isn't disabled
                btn.disabled = true;
                try {
                    await loadPlaylist();
                } finally {
                    btn.disabled = false;
                }
            }
        }, refreshInterval);
    }

    addRefreshButton();
    loadPlaylist().then(startAutoRefresh);
});
