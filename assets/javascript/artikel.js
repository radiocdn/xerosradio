// Function to get article ID from the URL parameters
function getArticleIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id'); // Replace 'id' with your query parameter key if needed
}

// Construct the article URL using the retrieved ID
const articleId = getArticleIdFromUrl();

// Redirect if no article ID is provided
if (!articleId) {
    window.location.href = '/'; // Redirect to root URL if no article ID
}

const articleUrl = `https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/?article=${articleId}`;

// Function to fetch and display the article
async function fetchArticle(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        displayArticle(data);
    } catch (error) {
        console.error('Error fetching article:', error);
    }
}

// Function to display the article in HTML
function displayArticle(article) {
    const container = document.getElementById('articles-container');
    const articleDiv = document.createElement('div');
    articleDiv.classList.add('article');

    articleDiv.innerHTML = `
        <h2>${article.title}</h2>
        <img src="${article.image}" alt="${article.title}" loading="lazy">
        <p>${article.description}</p>
        <p><strong>Gepubliceerd om:</strong> ${new Date(article.pubDate).toLocaleString()}</p>
    `;
    container.appendChild(articleDiv);
}

// Fetch the article if an ID is present
if (articleId) {
    fetchArticle(articleUrl);
    console.log('Artikel Geladen');
}
