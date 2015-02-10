var resTemplate = null;

$(function() {
  resTemplate = Handlebars.compile($("#resource-template").html());
  getStats();
});

function getStats() {
 $.getJSON('stats.json', function(stats) {
    $(stats).each(function(i, r) {
      addResource(r);
    });
  });
}

function addResource(r) {
  var html = resTemplate(r);
  $("#resources").append(html);
}



