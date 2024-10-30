document.addEventListener('DOMContentLoaded', function() {
    const feedUrl = 'https://xerosradioapi.global.ssl.fastly.net/api/xerosradio/nieuws/'; // Path to your PHP script
    const container = document.getElementById('feed-feed-container'); // Updated ID
    const loadMoreButton = document.getElementById('feed-load-more'); // Updated ID
    const loader = document.getElementById('feed-loader'); // Updated ID
    let start = 0;
    const limit = 8; // Number of articles to fetch per request

    async function fetchAndDisplayFeed(url) {
        try {
            loader.style.display = 'block'; // Show loader
            const response = await fetch(url);
            const data = await response.json();
            loader.style.display = 'none'; // Hide loader

            if (!data.articles) {
                console.error('Geen Artikelen Gevonden Uit Het XerosRadio Systeem');
                return;
            }

            const articles = data.articles;
            if (articles.length === 0) {
                loadMoreButton.style.display = 'none'; // Hide button if no more articles
                return;
            }

            // Create HTML content for each article
            articles.forEach(article => {
                const articleDiv = document.createElement('div');
                articleDiv.classList.add('feed-article'); // Updated class

                const title = document.createElement('h2');
                title.textContent = article.title;
                articleDiv.appendChild(title);

                const date = document.createElement('p');
                date.classList.add('feed-date'); // Updated class
                date.textContent = new Date(article.pubDate).toLocaleDateString();
                articleDiv.appendChild(date);

                const link = document.createElement('a');
                link.href = article.link;
                link.textContent = 'Lees meer';
                link.target = '_blank';
                link.classList.add('feed-read-more'); // Updated class
                articleDiv.appendChild(link);

                if (article.image) {
                    const img = document.createElement('img');
                    img.src = article.image;
                    img.alt = article.title;
                    img.loading = 'lazy';
                    img.classList.add('feed-article-image'); // Updated class
                    articleDiv.appendChild(img);
                }

                const description = document.createElement('p');
                description.classList.add('feed-description'); // Updated class
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
            console.error('Fout Bij XerosRadio Nieuws Systeem:', error);
        }
    }

    // Load initial articles
    fetchAndDisplayFeed(`${feedUrl}?start=${start}`);

    // Load more articles on button click
    loadMoreButton.addEventListener('click', () => {
        fetchAndDisplayFeed(`${feedUrl}?start=${start}`);
    });
});
