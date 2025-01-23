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

// Function to update metadata for SEO
function updateMetaTags(article) {
    // Update page title
    document.title = article.title;
    
    // Update meta description for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', article.description);
    }

    // Update Open Graph meta tags for better social media sharing
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    const metaOgDescription = document.querySelector('meta[property="og:description"]');
    const metaOgImage = document.querySelector('meta[property="og:image"]');
    const metaOgUrl = document.querySelector('meta[property="og:url"]');

    if (metaOgTitle) {
        metaOgTitle.setAttribute('content', article.title);
    }
    if (metaOgDescription) {
        metaOgDescription.setAttribute('content', article.description);
    }
    if (metaOgImage) {
        metaOgImage.setAttribute('content', article.image);
    }
    if (metaOgUrl) {
        metaOgUrl.setAttribute('content', window.location.href);
    }

    // Update Twitter Card meta tags
    const metaTwitterTitle = document.querySelector('meta[name="twitter:title"]');
    const metaTwitterDescription = document.querySelector('meta[name="twitter:description"]');
    const metaTwitterImage = document.querySelector('meta[name="twitter:image"]');

    if (metaTwitterTitle) {
        metaTwitterTitle.setAttribute('content', article.title);
    }
    if (metaTwitterDescription) {
        metaTwitterDescription.setAttribute('content', article.description);
    }
    if (metaTwitterImage) {
        metaTwitterImage.setAttribute('content', article.image);
    }
}

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
        displayError('Sorry, we could not load the article. Please try again later.');
    }
}

// Function to display the article in HTML
function displayArticle(article) {
    // Update SEO meta tags before displaying content
    updateMetaTags(article);

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

// Function to show error message in case of fetch failure
function displayError(message) {
    const container = document.getElementById('articles-container');
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error');
    errorDiv.innerHTML = `<p>${message}</p>`;
    container.appendChild(errorDiv);
}

// Fetch the article if an ID is present
if (articleId) {
    fetchArticle(articleUrl);
    console.log('Artikel Geladen');
}
