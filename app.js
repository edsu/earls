#!/usr/bin/env node

// you might want to change this :)
var track = "#c4l15";

var fs = require('fs');
var http = require('http');
var path = require('path');
var async = require('async');
var redis = require('redis');
var _ = require('underscore');
var cheerio = require('cheerio');
var express = require('express');
var Twitter = require('twitter');
var request = require('request');
var sockio = require('socket.io');
var readline = require('readline');

var db = redis.createClient();
var queue = async.queue(lookupUrl, 1);

function main() {
  listenForTweets(track);
  runWeb();
}

function runWeb() {
  var app = express();
  var server = http.Server(app);
  var io = sockio(server);

  app.use(express.static('public'));
  app.enable('trust proxy');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'hbs');

  app.get('/', function(req, res) {
    getStats(function (stats) {
      res.render('index.hbs', {track: track, stats: stats});
    });
  });

  app.get('/stats.json', function(req, res) {
    getStats(function (stats) {
      res.json(stats);
    });
  });

  app.listen(3000);
}

function addTitle(score, callback) {
  db.hget(score.url, 'title', function(err, result) {
    score.title = result;
    callback(null, score);
  });
}

function addTweets(score, callback) {
  db.lrange('tweets:' + score.url, 0, -1, function (err, tweets) {
    async.mapSeries(tweets, addTweetInfo, function (err, results) {
      score.tweets = results;
      callback(null, score);
    });
  });
}

function addTweetInfo(tweetId, callback) {
  db.hgetall(tweetId, function (err, tweet) {
    callback(null, tweet);
  });
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
      var mimetype = response.headers['content-type'];
      if (mimetype && mimetype.match(/html/)) {
        var $ = cheerio.load(body);
        var title = $("head title").text();
      } else {
        var title = response.request.uri.href;
      }

      addResource({
        url: response.request.uri.href,
        title: title,
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

function getStats(callback) {
  db.zrevrange('urls', 0, 200, 'withscores', function(err, results) {
    scores = [];
    for (var i = 0; i < results.length; i+=2) {
      scores.push({
        url: results[i],
        count: results[i + 1]
      });
    }
    async.mapSeries(scores, addTitle, function(err, results) {
      async.mapSeries(scores, addTweets, function(err, results) {
        callback(results);
      });
    });
  });
}

function loadExisting(filename) {
  var rd = readline.createInterface({
    input: fs.createReadStream(filename),
    output: process.stdout,
    terminal: false
  });
  rd.on('line', function(line) {
    var tweet = JSON.parse(line);
    checkTweet(tweet);
  });
}

if (require.main === module) {
  //loadExisting('tweets.json');
  main();
}
