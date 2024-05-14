// Function to check if a string is a valid URL | XerosRadio Api Checking
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

async function updateDJInfo() {
    // Fetch URL for XerosRadio Api
    const url = 'https://azuracast.streamxerosradio.duckdns.org/api/nowplaying_static/xerosradio.json';

    const djInfoElement = document.getElementById('djInfo');
    const artworkElement = document.getElementById('artwork');

    const fetchOptions = {
        method: 'GET',
        mode: 'cors', // Cors for XerosRadio Api
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error('Het verzoek aan de XerosRadio Servers is mislukt. Probeer het later opnieuw.');
        }

        const data = await response.json();

        if (data.live && data.live.is_live) {
            djInfoElement.textContent = data.live.streamer_name;
            const artworkUrl = isValidUrl(data.live.art)
                ? data.live.art
                : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/XerosRadio_Logo_Achtergrond_Wit';

            const newImage = new Image();
            newImage.src = "https://wsrv.nl/?w=200&h=200&output=webp&url=" + artworkUrl;
            newImage.draggable = false; // Prevent image dragging | XerosRadio Api
            newImage.loading = "lazy";
            newImage.alt = "DJ";
            newImage.style.opacity = 1;
            newImage.style.width = '200px';
            newImage.style.height = '200px';

            // Disable right-click context menu
            newImage.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            });

            artworkElement.innerHTML = '';
            artworkElement.appendChild(newImage);
        } else {
            djInfoElement.textContent = 'Nonstop Muziek';
            artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/v1/Assets/Nonstop_Muziek" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
        }
    } catch (error) {
        console.error('Fout:', error);
        djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';

        // Load the default image on error of XerosRadio Api
        artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
    }
}

// Get New DJ-info immediately From XerosRadio Api and check and if available load every 5 seconds
setInterval(updateDJInfo, 5000);
updateDJInfo(); // Call the function immediately
