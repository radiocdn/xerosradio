// Function to get article ID from the URL parameters
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id'); // Pas 'id' aan als de query-parameter anders is
}

// Construct the article URL using the retrieved ID
const articleId = getArticleIdFromUrl();

// Redirect if no article ID is provided
if (!articleId) {
    window.location.href = '/'; // Redirect naar de hoofdpagina indien geen ID
}

const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;

// Function to update metadata for SEO
function updateMetaTags(article) {
    document.title = article.title || 'XerosRadio Nieuws';
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', article.description || 'Lees het laatste nieuws op XerosRadio.');
    }

    // Open Graph meta tags
    const metaOgTags = {
        'og:title': article.title || 'XerosRadio Nieuws',
        'og:description': article.description || 'Lees het laatste nieuws op XerosRadio.',
        'og:image': article.image || 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo',
        'og:url': window.location.href
    };

    Object.entries(metaOgTags).forEach(([property, content]) => {
        const metaTag = document.querySelector(`meta[property="${property}"]`);
        if (metaTag) metaTag.setAttribute('content', content);
    });

    // Twitter meta tags
    const metaTwitterTags = {
        'twitter:title': article.title || 'XerosRadio Nieuws',
        'twitter:description': article.description || 'Lees het laatste nieuws op XerosRadio.',
        'twitter:image:src': article.image || 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo'
    };

    Object.entries(metaTwitterTags).forEach(([name, content]) => {
        const metaTag = document.querySelector(`meta[name="${name}"]`);
        if (metaTag) metaTag.setAttribute('content', content);
    });
}

// Function to fetch and display the article
async function fetchArticle(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) throw new Error('Artikel niet gevonden.');
            if (response.status === 500) throw new Error('Serverfout. Probeer later opnieuw.');
            throw new Error('Kon het artikel niet laden.');
        }
        const data = await response.json();
        displayArticle(data);
    } catch (error) {
        console.error('Error fetching article:', error);
        displayError(error.message);
    }
}

// Function to display the article in HTML
function displayArticle(article) {
    updateMetaTags(article);

    const container = document.getElementById('articles-container');
    if (!container) return;

    const articleDiv = document.createElement('div');
    articleDiv.classList.add('article');

    // Voorkom XSS door innerHTML niet direct met gebruikersgegevens te vullen
    const articleTitle = document.createElement('h2');
    articleTitle.textContent = article.title;

    const articleImage = document.createElement('img');
    articleImage.src = article.image || 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo';
    articleImage.alt = article.title || 'Artikel afbeelding';
    articleImage.loading = 'lazy';

    const articleDescription = document.createElement('p');
    articleDescription.textContent = article.description;

    const articleDate = document.createElement('p');
    articleDate.innerHTML = `<strong>Gepubliceerd op:</strong> ${new Date(article.pubDate).toLocaleString()}`;

    articleDiv.append(articleTitle, articleImage, articleDescription, articleDate);
    container.appendChild(articleDiv);
}

// Function to show error message in case of fetch failure
function displayError(message) {
    const container = document.getElementById('articles-container');
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error');
    errorDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(errorDiv);
}

// Fetch the article if an ID is present
if (articleId) {
    fetchArticle(articleUrl);
    console.log('Artikel geladen');
}
