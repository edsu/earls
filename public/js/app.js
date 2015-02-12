$(function() {
  var template = Handlebars.compile($("#resource-template").html());
  $.getJSON('stats.json', function(stats) {
    $(stats).each(function(i, r) {
      $("#resources").append(template(r));
    });
  });
});
