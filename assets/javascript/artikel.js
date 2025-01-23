// Function to get the article ID from the URL parameters
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id'); // Retrieve the 'id' query parameter
}

// Function to validate article data
function isValidArticle(article) {
    return article && article.title && article.description && article.pubDate;
}

// Show a loading indicator
function showLoadingIndicator() {
    const container = document.getElementById('articles-container');
    container.innerHTML = '<p class="loading">Loading article...</p>';
}

// Hide the loading indicator
function hideLoadingIndicator() {
    const container = document.getElementById('articles-container');
    container.innerHTML = ''; // Clear the loading message
}

// Show an error message in the HTML
function showErrorMessage(error) {
    const container = document.getElementById('articles-container');
    const message =
        error.message.includes('Failed to fetch')
            ? 'Unable to connect to the server. Please check your connection.'
            : 'Sorry, the article could not be loaded.';
    container.innerHTML = `<p class="error">${message}</p>`;
}

// Function to display the article in HTML
function displayArticle(article) {
    const container = document.getElementById('articles-container');
    const articleDiv = document.createElement('div');
    articleDiv.classList.add('article');

    const fallbackImage = 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo'; // Default fallback image

    articleDiv.innerHTML = `
        <article>
            <header>
                <h2>${article.title || 'Untitled Article'}</h2>
            </header>
            <figure>
                <img 
                    src="${article.image || fallbackImage}" 
                    alt="${article.title || 'Article image'}" 
                    loading="lazy"
                >
            </figure>
            <p>${article.description || 'No description available.'}</p>
            <footer>
                <time datetime="${article.pubDate}">
                    <strong>Gepubliceerd om:</strong> ${article.pubDate ? new Date(article.pubDate).toLocaleString() : 'N/A'}
                </time>
            </footer>
        </article>
    `;
    container.appendChild(articleDiv);
}

// Function to fetch and display the article
async function fetchArticle(url) {
    // Show loading indicator before the fetch starts
    showLoadingIndicator();

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch the article. Please try again later.');
        }
        const article = await response.json();

        // Validate the response
        if (!isValidArticle(article)) {
            throw new Error('Invalid article data received.');
        }

        // Display the article
        hideLoadingIndicator();
        displayArticle(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        hideLoadingIndicator();
        showErrorMessage(error);
    }
}

// Cache for storing fetched articles to avoid redundant API calls
const cache = new Map();

// Function to fetch article with caching
async function fetchArticleWithCache(url) {
    if (cache.has(url)) {
        console.log('Using cached article data.');
        return displayArticle(cache.get(url));
    }

    console.log('Fetching article from API.');
    const response = await fetch(url);
    const article = await response.json();
    cache.set(url, article);
    return displayArticle(article);
}

// Main script logic
const articleId = getArticleIdFromUrl(); // Get the article ID from the URL

// Redirect to the homepage if no article ID is provided
if (!articleId) {
    window.location.href = '/';
}

// Construct the API URL for fetching the article
const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;

// Start fetching the article
fetchArticle(articleUrl);
console.log('Artikel Geladen');
