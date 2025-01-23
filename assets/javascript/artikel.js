// Functie om het artikel-ID uit de URL-parameters te halen
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id'); // Haalt de 'id'-queryparameter op
}

// Functie om artikelgegevens te valideren
function isValidArticle(article) {
    return article && article.title && article.description && article.pubDate;
}

// Toon een foutmelding in de HTML
function showErrorMessage() {
    const container = document.getElementById('articles-container');
    container.innerHTML = `<p class="error">Er is een fout opgetreden bij het laden van het artikel. Probeer het later opnieuw.</p>`;
}

// Functie om het artikel in HTML weer te geven
function displayArticle(article) {
    const container = document.getElementById('articles-container');
    
    const fallbackImage = 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo'; // Standaard fallback-afbeelding

    container.innerHTML = `
        <h2>${article.title || 'Geen titel beschikbaar'}</h2>
        <img src="${article.image || fallbackImage}" alt="${article.title || 'Artikel afbeelding'}" loading="lazy">
        <p>${article.description || 'Geen beschrijving beschikbaar.'}</p>
        <p><strong>Gepubliceerd op:</strong> ${article.pubDate ? new Date(article.pubDate).toLocaleString('nl-NL') : 'Niet beschikbaar'}</p>
    `;
}

// Functie om het artikel op te halen en weer te geven
async function fetchArticle(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Artikel niet beschikbaar');
        }
        const article = await response.json();

        // Valideer de respons
        if (!isValidArticle(article)) {
            throw new Error('Ongeldige artikelgegevens ontvangen');
        }

        // Toon het artikel
        displayArticle(article);
    } catch (error) {
        console.error('Fout bij ophalen artikel:', error.message); // Alleen loggen in de console
        showErrorMessage();
    }
}

// Hoofdscriptlogica
const articleId = getArticleIdFromUrl(); // Haal het artikel-ID uit de URL

// Redirect naar de homepage als er geen artikel-ID is opgegeven
if (!articleId) {
    window.location.href = '/';
}

// Stel de API-URL samen om het artikel op te halen
const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;

// Start het ophalen van het artikel
fetchArticle(articleUrl);
console.log('Artikel geladen');
