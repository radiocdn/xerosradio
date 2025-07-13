document.addEventListener('DOMContentLoaded', () => {
    const feedUrl = 'https://xerosradiocdn.global.ssl.fastly.net/api/xerosradio/nieuws/';
    const container = document.getElementById('feed-feed-container');
    const loadMoreButton = document.getElementById('feed-load-more');
    const loader = document.getElementById('feed-loader');
    let start = 0;
    const limit = 8;
    let isLoading = false;
    let noMoreArticles = false;

    async function fetchAndDisplayFeed(url) {
        if (isLoading || noMoreArticles) return;

        isLoading = true;
        loader.style.display = 'block';

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            loader.style.display = 'none';

            if (!data.articles || data.articles.length === 0) {
                if (start === 0) {
                    showFallback();
                }
                noMoreArticles = true;
                loadMoreButton.style.display = 'none';
                return;
            }

            data.articles.forEach(article => {
                const articleDiv = document.createElement('div');
                articleDiv.classList.add('feed-article');

                const title = document.createElement('h2');
                title.textContent = article.title;
                articleDiv.appendChild(title);

                const date = document.createElement('p');
                date.classList.add('feed-date');
                date.textContent = new Date(article.pubDate).toLocaleDateString();
                articleDiv.appendChild(date);

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
                // Verberg description standaard via CSS class
                articleDiv.appendChild(description);

                const link = document.createElement('a');
                link.href = article.link;
                link.textContent = 'Lees meer';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.classList.add('feed-read-more');
                articleDiv.appendChild(link);

                articleDiv.addEventListener('click', () => {
                    description.classList.toggle('visible');
                });

                container.appendChild(articleDiv);
            });

            start += limit;
        } catch (error) {
            console.error('Fout Bij XerosRadio Nieuws Systeem:', error);
            loader.style.display = 'none';
            if (start === 0) showFallback();
            loadMoreButton.style.display = 'none';
        } finally {
            isLoading = false;
        }
    }

    function showFallback() {
        container.innerHTML = `
            <div class="news-unavailable" style="text-align: center; padding: 2rem;">
                <img src="https://res.cloudinary.com/xerosradio/image/upload/v1752406213/Assets/errornews_xerosradio.svg" 
                     style="width: 100px;" draggable="false" alt="Nieuwsfeed niet beschikbaar">
                <h3 style="color: white;">Nieuws is niet beschikbaar, probeer het later op een andere tijd</h3>
            </div>
        `;
    }

    fetchAndDisplayFeed(`${feedUrl}?start=${start}`);

    loadMoreButton.addEventListener('click', () => {
        fetchAndDisplayFeed(`${feedUrl}?start=${start}`);
    });
});
