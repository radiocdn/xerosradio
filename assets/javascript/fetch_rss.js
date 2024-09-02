document.addEventListener('DOMContentLoaded', function() {
    const feedUrl = '/api/xerosradio/nieuws/'; // Path to your PHP script
    const container = document.getElementById('feed-container');
    const loadMoreButton = document.getElementById('load-more');
    const loader = document.getElementById('loader');
    let start = 0;
    const limit = 8;

    async function fetchAndDisplayFeed(url) {
        try {
            loader.style.display = 'block'; // Show loader
            const response = await fetch(url);
            const data = await response.json();
            loader.style.display = 'none'; // Hide loader

            if (data.error) {
                console.error(data.error);
                return;
            }

            const articles = data.articles;
            if (articles.length === 0) {
                loadMoreButton.style.display = 'none'; // Hide button if no more articles
                return;
            }

            // Create HTML content for each article
            articles.forEach((article, index) => {
                const articleDiv = document.createElement('div');
                articleDiv.classList.add('article');

                const title = document.createElement('h2');
                title.textContent = article.title;
                articleDiv.appendChild(title);

                const date = document.createElement('p');
                date.classList.add('date');
                date.textContent = new Date(article.pubDate).toLocaleDateString();
                articleDiv.appendChild(date);

                const link = document.createElement('a');
                link.href = article.link;
                link.textContent = 'Read more';
                link.target = '_blank';
                link.classList.add('read-more');
                articleDiv.appendChild(link);

                if (article.image) {
                    const img = document.createElement('img');
                    img.src = article.image;
                    img.alt = article.title;
                    img.classList.add('article-image');
                    articleDiv.appendChild(img);
                }

                const description = document.createElement('p');
                description.classList.add('description');
                description.textContent = article.description;
                description.style.display = 'none'; // Initially hidden
                articleDiv.appendChild(description);

                articleDiv.addEventListener('click', () => {
                    const isVisible = description.style.display === 'block';
                    description.style.display = isVisible ? 'none' : 'block';
                });

                container.appendChild(articleDiv);
            });

            start += limit; // Update start for next fetch

        } catch (error) {
            console.error('Error fetching RSS feed:', error);
        }
    }

    // Load initial articles
    fetchAndDisplayFeed(`${feedUrl}?start=${start}`);

    // Load more articles on button click
    loadMoreButton.addEventListener('click', () => {
        fetchAndDisplayFeed(`${feedUrl}?start=${start}`);
    });
});
