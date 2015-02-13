earls is a hack to display urls that are being tweeted with a given hashtag.
it uses node and redis to watch Twitter for new tweets with urls. The idea
is that it can help share information about what is being tweeted about
at conferences.

## Install

1. install [redis](http://redis.io) and [node](http://nodejs.org)
1. git clone https://github.com/edsu/earls
1. cd earls
1. npm install
1. set Twitter credentials in environment: TWITTER\_CONSUMER\_KEY, TWITTER\_CONSUMER\_SECRET, TWITTER\_ACCESS\_TOKEN, TWITTER\_ACCESS\_TOKEN\_SECRET
1. ./earls.js '#c4l15'

## Heroku

To get things to run on Heroku you'll need to set some environment variables.

```
heroku config:set EARLS_TRACK=#c4l15
heroku config:set TWITTER_CONSUMER_KEY=XXX
heroku config:set TWITTER_CONSUMER_SECRET=XXX
heroku config:set TWITTER_ACCESS_TOKEN_KEY=XXX
heroku config:set TWITTER_ACCESS_TOKEN_SECRET=XXX
```

