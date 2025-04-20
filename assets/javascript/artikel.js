// Function to get article ID from the URL parameters
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Construct the article URL using the retrieved ID
const articleId = getArticleIdFromUrl();
if (!articleId) {
    window.location.href = '/'; // Redirect naar home als er geen ID is
}

const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;
const CACHE_KEY = `news_article_${articleId}`;
const CACHE_EXPIRATION_KEY = `${CACHE_KEY}_expires`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 uur in milliseconden

// Function to get cached article if valid
function getCachedArticle() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cacheExpiration = localStorage.getItem(CACHE_EXPIRATION_KEY);

    if (cachedData && cacheExpiration && Date.now() < parseInt(cacheExpiration, 10)) {
        console.log("✅ Laden vanuit cache");
        return JSON.parse(cachedData);
    }
    return null;
}

// Function to save article to cache
function cacheArticle(article) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(article));
    localStorage.setItem(CACHE_EXPIRATION_KEY, (Date.now() + CACHE_DURATION).toString());
}

// **1. Zet alvast placeholder metadata (voordat de API is geladen)**
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

// **2. Haal het artikel op (uit cache of API)**
async function fetchArticle(url) {
    const cachedArticle = getCachedArticle();
    if (cachedArticle) {
        displayArticle(cachedArticle);
        updateMetaTags(cachedArticle);
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Artikel niet gevonden.');
        }
        const article = await response.json();
        cacheArticle(article); // Opslaan in cache voor 24 uur
        updateMetaTags(article);
        displayArticle(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        displayError("Dit artikel kon niet geladen worden.");
    }
}

// **3. Update metadata zodra de API geladen is**
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

// **4. Artikel tonen**
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

    const formattedDate = new Intl.DateTimeFormat('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(article.pubDate));

    const articleDate = document.createElement('p');
    articleDate.innerHTML = `<strong>Gepubliceerd op:</strong> ${formattedDate}`;

    articleDiv.append(articleTitle, articleImage, articleDescription, articleDate);
    container.appendChild(articleDiv);
}

// **5. Foutmelding tonen**
function displayError(message) {
    const container = document.getElementById('articles-container');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error');
    errorDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(errorDiv);
}

// **6. Direct starten met laden**
fetchArticle(articleUrl);
console.log('Artikel laden gestart...');
