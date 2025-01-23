// Function to get the article ID from the URL parameters
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id'); // This will work with the 'id' query parameter
}

// Get the article ID using the old method
const articleId = getArticleIdFromUrl();

// Redirect to root if no article ID is provided
if (!articleId) {
    window.location.href = '/';
}

// Construct the API URL using the retrieved article ID
const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;

// Function to fetch and display the article
async function fetchArticle(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch the article. Please try again later.');
        }
        const article = await response.json();
        displayArticle(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        showErrorMessage('Sorry, we couldn’t load the article. Please try again later.');
    }
}

// Function to display the article in HTML
function displayArticle(article) {
    const container = document.getElementById('articles-container');
    const articleDiv = document.createElement('div');
    articleDiv.classList.add('article');

    const fallbackImage = 'https://res.cloudinary.com/xerosradio/image/upload/f_webp,q_auto/XerosRadio_Logo'; // Default fallback image

    articleDiv.innerHTML = `
        <h2>${article.title || 'Untitled Article'}</h2>
        <img 
            src="${article.image || fallbackImage}" 
            alt="${article.title || 'Article image'}" 
            loading="lazy"
        >
        <p>${article.description || 'No description available.'}</p>
        <p><strong>Gepubliceerd om:</strong> ${article.pubDate ? new Date(article.pubDate).toLocaleString() : 'N/A'}</p>
    `;
    container.appendChild(articleDiv);
}

// Function to display an error message in the HTML
function showErrorMessage(message) {
    const container = document.getElementById('articles-container');
    container.innerHTML = `<p class="error">${message}</p>`;
}

// Fetch and display the article
fetchArticle(articleUrl);
console.log('Artikel Geladen');
