document.addEventListener('DOMContentLoaded', () => {
    const feedUrl = 'https://xr-api.faststreamdiensten.nl/api/xerosradio/nieuws/';
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

                // Titel met link
                const titleLink = document.createElement('a');
                titleLink.href = article.link;
                titleLink.target = '_blank';
                titleLink.rel = 'noopener noreferrer';
                titleLink.classList.add('feed-title-link');

                const title = document.createElement('h2');
                title.textContent = article.title;
                titleLink.appendChild(title);
                articleDiv.appendChild(titleLink);

                // Datum
                const date = document.createElement('p');
                date.classList.add('feed-date');
                date.textContent = new Date(article.pubDate).toLocaleDateString();
                articleDiv.appendChild(date);

                // Afbeelding met link
                if (article.image) {
                    const imageLink = document.createElement('a');
                    imageLink.href = article.link;
                    imageLink.target = '_blank';
                    imageLink.rel = 'noopener noreferrer';

                    const img = document.createElement('img');
                    img.src = article.image;
                    img.alt = article.title;
                    img.loading = 'lazy';
                    img.classList.add('feed-article-image');

                    imageLink.appendChild(img);
                    articleDiv.appendChild(imageLink);
                }

                // Beschrijving
                const description = document.createElement('p');
                description.classList.add('feed-description');
                description.textContent = article.description;
                articleDiv.appendChild(description);

                // Lees meer link
                const link = document.createElement('a');
                link.href = article.link;
                link.textContent = 'Lees meer';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.classList.add('feed-read-more');
                articleDiv.appendChild(link);

                // Toggle beschrijving
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
        const fallback = document.createElement('div');
        fallback.className = 'news-fallback';
        fallback.innerHTML = `
            <img src="https://res.cloudinary.com/xerosradio/image/upload/v1752406213/Assets/errornews_xerosradio.svg" draggable="false" loading="lazy" alt="Nieuwsfeed niet beschikbaar">
            <h3>Nieuws is niet beschikbaar, probeer het later op een ander moment</h3>
        `;

        const container = document.getElementById('feed-feed-container');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(fallback, container);
        }
    }

    fetchAndDisplayFeed(`${feedUrl}?start=${start}`);

    loadMoreButton.addEventListener('click', () => {
        fetchAndDisplayFeed(`${feedUrl}?start=${start}`);
    });
});
