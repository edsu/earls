#!/usr/bin/env node

/*
 * This script is useful if you have some tweets in a file (that you 
 * created with twarc) and you would like to load them into your 
 * earls instance. This can happen when you haven't been running earls
 * the whole duration of the event that you are tracking.
 */

var fs = require('fs');
var earls = require('./earls');
var readline = require('readline');

var filename = process.argv[2];
var redisUrl = process.argv[3];
var db = earls.getRedis(redisUrl);

var stats = new earls.Stats(db);

var rd = readline.createInterface({
  input: fs.createReadStream(filename),
  output: process.stdout,
  terminal: false
});

var count = 0;

rd.on('line', function(line) {
  var tweet = JSON.parse(line);
  console.log(tweet.id_str);
  stats.checkTweet(tweet);
  count += 1;
});

rd.on('close', function() {
  console.log("queued " + count + " tweets for processing");
  stats.queue.drain = function() {
    console.log("finished processing tweets");
    process.exit(0);
  };
});
