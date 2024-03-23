$(document).ready(function() {
  var rssFeedUrl = 'https://corsproxy.io?https://feeds.nos.nl/nosnieuwsalgemeen';
  var feedLimit = 5; // Aantal nieuwsitems om weer te geven
  var imagePrefixUrl = 'https://wsrv.nl/?output=webp&url=';

  $.ajax(rssFeedUrl, {
    accepts: {
      xml: "application/rss+xml"
    },
    dataType: "xml",
    success: function(data) {
      var items = $(data).find('item').slice(0, feedLimit);
      var newsListContent = '';
      items.each(function() {
        var title = $(this).find('title').text();
        var link = $(this).find('link').text();
        var description = $(this).find('description').text().substr(0, 100) + '...'; // Verkort de beschrijving tot 100 tekens
        var imageUrl = $(this).find('enclosure').attr('url');
        if (imageUrl) {
          imageUrl = imagePrefixUrl + encodeURIComponent(imageUrl);
        }
        newsListContent += '<div class="newsItem">';
        if (imageUrl) {
          newsListContent += '<img src="' + imageUrl + '" alt="' + title + '">';
        }
        newsListContent += '<div class="content">';
        newsListContent += '<h3><a href="' + link + '" target="_blank">' + title + '</a></h3>';
        newsListContent += '<p>' + description + '</p>';
        newsListContent += '</div>'; // sluit .content
        newsListContent += '</div>'; // sluit .newsItem
      });
      $('#newsList').html(newsListContent);
    }
  });
});
