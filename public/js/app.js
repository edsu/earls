$(function() {
  var template = Handlebars.compile($("#resource-template").html());
  var update = Handlebars.compile($("#update-template").html());

  $(stats).each(function(i, r) {
    $("#resources").append(template(r));
  });

  var socket = io({path: window.location.pathname + 'socket.io'});
  socket.on('update', function(r) {
    var u = $("#update");
    u.fadeOut('slow', function() {
      u.empty();
      u.append(update(r));
      u.fadeIn('slow');
    });

    // look to see if we need to adjust count of a resource
    var added = false;
    $("#resources article").each(function(i, article) {
      article = $(article);
      var url = article.find('a[class="title"]').attr('href');
      if (r.url === url) {
        added = true;
        var count = getCount(article);
        count += 1;
        var countEl = article.find('.count');
        countEl.empty();
        countEl.append(count);
        article.find(".avatars").append('<a href="' + r.url + '"><img class="avatar" src="' + r.tweet.user.profile_image_url_https + '"></a>');
      }
    });

    // if we changed the counts on the page we need to reorder them
    if (added) {
      var resources = $("#resources");
      var articles = $("#resources article");
      articles.sort(function (a,b) {
        return getCount(b) - getCount(a);
      });
      resources.empty();
      resources.append(articles);
    }
  });

  function getCount(e) {
    return parseInt($(e).find('.count').text(), 10);
  }

});

