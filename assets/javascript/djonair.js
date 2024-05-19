// Function to check if a string is a valid URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

async function updateDJInfo() {
    // URL for XerosRadio API
    const url = 'https://php.streamxerosradio.duckdns.org/api/xerosradio/';
    
    const djInfoElement = document.getElementById('djInfo');
    const artworkElement = document.getElementById('artwork');
    
    const fetchOptions = {
        method: 'GET',
        cache: 'no-cache'
    };

    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error('Het verzoek aan de XerosRadio Servers is mislukt. Probeer het later opnieuw.');
        }

        const data = await response.json();

        const { dj_live_status: djLiveStatus, dj_name: djName, dj_cover: djCover } = data.onair_info;

        if (djLiveStatus) {
            djInfoElement.textContent = djName;
            
            const artworkUrl = isValidUrl(djCover) ? djCover : 'https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/XerosRadio_Logo_Achtergrond_Wit';
            
            const newImage = new Image();
            newImage.src = artworkUrl;
            newImage.draggable = false;
            newImage.loading = 'lazy';
            newImage.alt = 'XerosRadio DJ';
            newImage.style.opacity = 1;
            newImage.style.width = '200px';
            newImage.style.height = '200px';

            // Disable right-click context menu
            newImage.addEventListener('contextmenu', (e) => e.preventDefault());
            
            artworkElement.innerHTML = '';
            artworkElement.appendChild(newImage);
        } else {
            djInfoElement.textContent = 'Nonstop Muziek';
            artworkElement.innerHTML = `<img src="${djCover}" alt="XerosRadio Nonstop Muziek" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
        }
    } catch (error) {
        console.error('Fout:', error);
        djInfoElement.textContent = 'XerosRadio is momenteel niet beschikbaar. Probeer het later opnieuw.';

        // Load the default image on error of XerosRadio API
        artworkElement.innerHTML = `<img src="https://res.cloudinary.com/xerosradio/image/upload/w_200,h_200,f_auto,q_auto/XerosRadio_Logo_Achtergrond_Wit" alt="XerosRadio" draggable="false" loading="lazy" style="width: 200px; height: 200px;">`;
    }
}

// Get new DJ info immediately from XerosRadio API and check if available every 5 seconds
setInterval(updateDJInfo, 5000);
updateDJInfo(); // Call the function immediately
