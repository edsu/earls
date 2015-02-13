#!/usr/bin/env node

var fs = require('fs');
var url = require('url');
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

/*
 * The main web server function. This will create a webserver
 * and then listen to Twitter for new tweets with URLs.
 */

function main(track) {
  var app = express();
  var server = http.Server(app);
  var io = sockio(server);
  var db = getRedis();

  app.use(express.static('public'));
  app.enable('trust proxy');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'hbs');

  app.get('/', function(req, res) {
    res.render('index', {track: track});
  });

  app.get('/stats.json', function(req, res) {
    getStats(db, function (stats) {
      res.json(stats);
    });
  });

  listenForTweets(track, db);
  app.listen(3000);
}


/*
 * get a redis connection
 */

function getRedis(redisUrl) {
  var rtg = redisUrl || process.env.REDISTOGO_URL || "redis://localhost:6379";
  var uri = url.parse(rtg);
  var db = redis.createClient(uri.port, uri.hostname);
  if (uri.auth) {
    console.log('auth:', uri.auth);
    var auth = uri.auth.split(':').pop();
    db.auth(auth);
  }
  return db;
}

/*
 * Listen for tweets to add to the database.
 */

function listenForTweets(track, db) {
  console.log('listening for new tweets:', track);
  var twtr = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });
  var stats = new Stats(db);
  twtr.stream('statuses/filter', {track: track}, function(stream) {
    stream.on('data', stats.checkTweet);
    stream.on('error', function(error) {
      console.log(error);
    });
  });
}


/*
 * a class to extract stats from Tweets
 */

function Stats(db) {
  var that = this;
  var lookupUrl = function(job, done) {
    console.log('looking up url: ' + job.url);
    request(job.url, function (error, response, body) {
      if (! error) {
        var mimetype = response.headers['content-type'];
        var title = response.request.uri.href;
        if (mimetype && mimetype.match(/html/)) {
          var $ = cheerio.load(body);
          title = $("head title").text();
        }
        that.addResource({
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
  };
  this.db = db;
  this.queue = async.queue(lookupUrl, 2);
}

Stats.prototype.checkTweet = function(tweet) {
  var that = this;
  console.log('processing tweet: ' + tweet.id_str);
  _.each(tweet.entities.urls, function(urlEntity) {
    var url = urlEntity.expanded_url;
    console.log('queueing lookup for ' + url);
    that.queue.push({url: url, tweet: tweet}, function (err) {
      if (! err) {
        console.log("finished processing url: " + url);
      } else {
        console.log("error while processing url: " + err);
      }
    });
  });
};

Stats.prototype.addResource = function(r) {
  var tweetId = 'tweet:' + r.tweet.id_str;
  var avatar = r.tweet.user.profile_image_url;
  var name = r.tweet.user.screen_name;
  var tweetUrl = "https://twitter.com/" + r.tweet.user.screen_name + "/statuses/" + r.tweet.id_str;

  console.log("tallying: ", r.url, r.title, name, tweetUrl);

  this.db.hset(r.url, "title", r.title);
  this.db.zincrby('urls', 1, r.url);
  this.db.lpush('tweets:' + r.url, tweetId);
  this.db.hset(tweetId, "url", tweetUrl);
  this.db.hset(tweetId, "name", name);
  this.db.hset(tweetId, "avatar", avatar);
};


/*
 * a function to get a big chunk of statistics back from redis
 */

function getStats(db, callback) {

  var addTitle = function(score, callback) {
    db.hget(score.url, 'title', function(err, result) {
      score.title = result;
      callback(null, score);
    });
  };

  var addTweets = function(score, callback) {
    db.lrange('tweets:' + score.url, 0, -1, function (err, tweets) {
      async.mapSeries(tweets, addTweetInfo, function (err, results) {
        score.tweets = results;
        callback(null, score);
      });
    });
  };

  var addTweetInfo = function(tweetId, callback) {
    db.hgetall(tweetId, function (err, tweet) {
      callback(null, tweet);
    });
  };

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


/*
 * when run from command line
 */

if (require.main === module) {
  var track = process.argv[2] || process.env.EARLS_TRACK;
  if (! track) {
    console.log("please supply track either as argument or using EARLS_TRACK environment variable");
    process.exit(1);
  } else {
    main(track);
  }
}

exports.Stats = Stats;
exports.getRedis = getRedis;
