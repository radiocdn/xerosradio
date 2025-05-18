// Functie om artikel-ID uit de URL te halen
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Artikel-ID ophalen
const articleId = getArticleIdFromUrl();
if (!articleId) {
    window.location.href = '/'; // Redirect naar home als er geen ID is
}

const articleUrl = `https://xerosradioweb.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;
const CACHE_KEY = `news_article_${articleId}`;
const CACHE_EXPIRATION_KEY = `${CACHE_KEY}_expires`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 uur

// Cache ophalen
function getCachedArticle() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheExpiration = localStorage.getItem(CACHE_EXPIRATION_KEY);
    if (cachedData && cacheExpiration && Date.now() < parseInt(cacheExpiration, 10)) {
        console.log("✅ Laden vanuit cache");
        return JSON.parse(cachedData);
    }
    return null;
}

// Artikel in cache opslaan
function cacheArticle(article) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(article));
    localStorage.setItem(CACHE_EXPIRATION_KEY, (Date.now() + CACHE_DURATION).toString());
}

// Placeholder metadata
document.title = "Laden... | XerosRadio Nieuws";
const defaultImage = "https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo";

const metaTags = {
    'description': "XerosRadio Nieuwsartikel aan het laden...",
    'og:title': "Laden... | XerosRadio Nieuws",
    'og:description': "Dit artikel is momenteel aan het laden.",
    'og:image': defaultImage,
    'og:url': window.location.href,
    'twitter:title': "Laden... | XerosRadio Nieuws",
    'twitter:description': "Dit artikel is momenteel aan het laden.",
    'twitter:image:src': defaultImage
};

Object.entries(metaTags).forEach(([property, content]) => {
    let metaTag = document.querySelector(`meta[name="${property}"], meta[property="${property}"]`);
    if (!metaTag) {
        metaTag = document.createElement("meta");
        if (property.startsWith("og:") || property.startsWith("twitter:")) {
            metaTag.setAttribute("property", property);
        } else {
            metaTag.setAttribute("name", property);
        }
        document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", content);
});

// Eerste letter hoofdletter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Datum formatteren in Nederlands met hoofdletters voor dag + maand
function formatDutchDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date)) return "Onbekende datum";

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateParts = new Intl.DateTimeFormat('nl-NL', options).formatToParts(date);

    let formatted = "";
    dateParts.forEach(part => {
        if (part.type === 'weekday' || part.type === 'month') {
            formatted += capitalize(part.value);
        } else {
            formatted += part.value;
        }
    });

    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const time = new Intl.DateTimeFormat('nl-NL', timeOptions).format(date);
    return `${formatted} ${time}`;
}

// Loading indicator
function showLoading() {
    const container = document.getElementById('articles-container');
    if (!container) return;
    container.innerHTML = `<p class="loading">Artikel wordt geladen...</p>`;
}

function hideLoading() {
    const loading = document.querySelector('.loading');
    if (loading) loading.remove();
}

// Artikel ophalen
async function fetchArticle(url) {
    const cachedArticle = getCachedArticle();
    if (cachedArticle) {
        displayArticle(cachedArticle);
        updateMetaTags(cachedArticle);
        return;
    }

    showLoading();

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Artikel niet gevonden.");
            } else {
                throw new Error("Serverfout: probeer het later opnieuw.");
            }
        }
        const article = await response.json();
        cacheArticle(article);
        updateMetaTags(article);
        hideLoading();
        displayArticle(article);
    } catch (error) {
        hideLoading();
        console.error('Error fetching article:', error);
        const userFriendlyMessage = error.message.includes('Artikel niet gevonden')
            ? "Het artikel bestaat niet of is verwijderd."
            : "Er ging iets mis met het laden. Controleer je internetverbinding of probeer het later opnieuw.";
        displayError(userFriendlyMessage);
    }
}

// Metadata bijwerken
function updateMetaTags(article) {
    document.title = article.title || "XerosRadio Nieuws";

    const updatedTags = {
        'description': article.description || "Lees het laatste nieuws op XerosRadio.",
        'og:title': article.title || "XerosRadio Nieuws",
        'og:description': article.description || "Lees het laatste nieuws op XerosRadio.",
        'og:image': article.image || defaultImage,
        'og:url': window.location.href,
        'twitter:title': article.title || "XerosRadio Nieuws",
        'twitter:description': article.description || "Lees het laatste nieuws op XerosRadio.",
        'twitter:image:src': article.image || defaultImage
    };

    Object.entries(updatedTags).forEach(([property, content]) => {
        const metaTag = document.querySelector(`meta[name="${property}"], meta[property="${property}"]`);
        if (metaTag) metaTag.setAttribute("content", content);
    });
}

// Artikel tonen
function displayArticle(article) {
    const container = document.getElementById('articles-container');
    if (!container) return;

    const articleDiv = document.createElement('div');
    articleDiv.classList.add('article');

    const articleTitle = document.createElement('h2');
    articleTitle.textContent = article.title;

    const articleImage = document.createElement('img');
    articleImage.src = article.image || defaultImage;
    articleImage.alt = article.title || "Artikel afbeelding";
    articleImage.loading = 'lazy';

    const articleDescription = document.createElement('p');
    articleDescription.textContent = article.description;

    const formattedDate = formatDutchDate(article.pubDate);
    const articleDate = document.createElement('p');
    articleDate.innerHTML = `<strong>Gepubliceerd op:</strong> ${formattedDate}`;

    articleDiv.append(articleTitle, articleImage, articleDescription, articleDate);
    container.appendChild(articleDiv);
}

// Foutmelding
function displayError(message) {
    const container = document.getElementById('articles-container');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error');
    errorDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(errorDiv);
}

// Start laden
fetchArticle(articleUrl);
console.log('Artikel laden gestart...');
