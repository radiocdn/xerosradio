document.addEventListener('DOMContentLoaded', function () {
    const feedUrl = 'https://xerosradiocdn.global.ssl.fastly.net/api/xerosradio/nieuws/';
    const container = document.getElementById('feed-feed-container');
    const loadMoreButton = document.getElementById('feed-load-more');
    const loader = document.getElementById('feed-loader');
    let start = 0;
    const limit = 8;

    async function fetchAndDisplayFeed(url) {
        try {
            loader.style.display = 'block';
            const response = await fetch(url);
            const data = await response.json();
            loader.style.display = 'none';

            if (!data.articles || data.articles.length === 0) {
                showFallback();
                loadMoreButton.style.display = 'none';
                return;
            }

            const articles = data.articles;

            articles.forEach(article => {
                const articleDiv = document.createElement('div');
                articleDiv.classList.add('feed-article');

                const title = document.createElement('h2');
                title.textContent = article.title;
                articleDiv.appendChild(title);

                const date = document.createElement('p');
                date.classList.add('feed-date');
                date.textContent = new Date(article.pubDate).toLocaleDateString();
                articleDiv.appendChild(date);

                const link = document.createElement('a');
                link.href = article.link;
                link.textContent = 'Lees meer';
                link.target = '_blank';
                link.classList.add('feed-read-more');
                articleDiv.appendChild(link);

                if (article.image) {
                    const img = document.createElement('img');
                    img.src = article.image;
                    img.alt = article.title;
                    img.loading = 'lazy';
                    img.classList.add('feed-article-image');
                    articleDiv.appendChild(img);
                }

                const description = document.createElement('p');
                description.classList.add('feed-description');
                description.textContent = article.description;
                description.style.display = 'none';
                articleDiv.appendChild(description);

                articleDiv.addEventListener('click', () => {
                    const isVisible = description.style.display === 'block';
                    description.style.display = isVisible ? 'none' : 'block';
                });

                container.appendChild(articleDiv);
            });

            start += limit;

        } catch (error) {
            console.error('Fout Bij XerosRadio Nieuws Systeem:', error);
            loader.style.display = 'none';
            showFallback();
            loadMoreButton.style.display = 'none';
        }
    }

    function showFallback() {
    // Verberg normale container
    container.style.display = 'none';
    loadMoreButton.style.display = 'none';

    const fallback = document.getElementById('news-unavailable-container');
    fallback.style.display = 'flex';
    fallback.innerHTML = `
        <img src="https://res.cloudinary.com/xerosradio/image/upload/v1752406213/Assets/errornews_xerosradio.svg" 
             style="width: 100px;" draggable="false" alt="Nieuwsfeed niet beschikbaar">
        <h3>Nieuws is niet beschikbaar,<br>probeer het later op een andere tijd</h3>
    `;
}

    fetchAndDisplayFeed(`${feedUrl}?start=${start}`);

    loadMoreButton.addEventListener('click', () => {
        fetchAndDisplayFeed(`${feedUrl}?start=${start}`);
    });
});
