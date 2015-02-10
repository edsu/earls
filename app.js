#!/usr/bin/env node

var fs = require('fs');
var async = require('async');
var redis = require('redis');
var _ = require('underscore');
var cheerio = require('cheerio');
var Twitter = require('twitter');
var request = require('request');
var readline = require('readline');

var track = "#c4l15";

var db = redis.createClient();
var queue = async.queue(lookupUrl, 1);

function main() {
  listenForTweets(track);
}

function listenForTweets() {
  console.log('listening for new tweets');
  var twtr = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });
  twtr.stream('statuses/filter', {track: track}, function(stream) {
    stream.on('data', checkTweet);
    stream.on('error', function(error) {
      console.log(error);
    });
  });
}

function checkTweet(tweet) {
  console.log('processing tweet: ' + tweet.id_str);
  _.each(tweet.entities.urls, function(urlEntity) {
    var url = urlEntity.expanded_url;
    console.log('queueing lookup for ' + url);
    queue.push({url: url, tweet: tweet}, function (err) {
      if (! err) {
        console.log("finished processing url: " + url);
      } else {
        console.log("error while processing url: " + err);
      }
    });
  });
}

function lookupUrl(job, done) {
  console.log('looking up url: ' + job.url);
  request(job.url, function (error, response, body) {
    if (! error) {
      var $ = cheerio.load(body);
      addResource({
        url: response.request.uri.href,
        title: $("head title").text(),
        tweet: job.tweet
      });
      done();
      $ = null;
    } else {
      done(error);
    }
  });
}

function addResource(r) {
  var tweetId = 'tweet:' + r.tweet.id_str;
  var avatar = r.tweet.user.profile_image_url;
  var name = r.tweet.user.screen_name;
  var tweetUrl = "https://twitter.com/" + r.tweet.user.screen_name + "/statuses/" + r.tweet.id_str;

  console.log("tallying: ", r.url, r.title, name, tweetUrl);

  db.hset(r.url, "title", r.title);
  db.zincrby('urls', 1, r.url);
  db.lpush('tweets:' + r.url, tweetId);
  db.hset(tweetId, "url", tweetUrl)
  db.hset(tweetId, "name", name);
  db.hset(tweetId, "avatar", avatar);
}

function loadExisting() {
  var rd = readline.createInterface({
    input: fs.createReadStream('tweets.json'),
    output: process.stdout,
    terminal: false
  });
  rd.on('line', function(line) {
    var tweet = JSON.parse(line);
    checkTweet(tweet);
  });
}

if (require.main === module) {
  loadExisting();
  main();
}
