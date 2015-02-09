#!/usr/bin/env node

var _ = require("underscore");
var Twitter = require('twitter');

function addUrl(url) {
  console.log(url.expandedUrl);
}

var twtr = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

twtr.stream('statuses/filter', {track: '#c4l15'}, function(stream) {
  stream.on('data', function(tweet) {
    _.each(tweet.entities.urls, addUrl);
  });
  stream.on('error', function(error) {
    console.log(error);
  });
});

