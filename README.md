earls is a hack to display web resources that are being tweeted with a given hashtag.
It uses node and redis to watch Twitter for new tweets with urls, then fetches the web resource, attempts to pull the title out of the HTML, and then stashes away some results into a Redis database The idea
is that it can help share information about what is being tweeted about at conferences, and other real or virtual events that people are tweeting at.

When your event is over it is easy to create a static site of your earls 
instance and turn off the node server and redis backend, and just let it be 
served up as HTML, CSS and JavaScript.

## Install

1. install [redis](http://redis.io) and [node](http://nodejs.org)
1. git clone https://github.com/edsu/earls
1. cd earls
1. npm install
1. set Twitter credentials in environment: TWITTER\_CONSUMER\_KEY, TWITTER\_CONSUMER\_SECRET, TWITTER\_ACCESS\_TOKEN, TWITTER\_ACCESS\_TOKEN\_SECRET
1. ./earls.js '#c4l15'

## Heroku

To get things to run on Heroku you'll need to set some environment variables
before you can push there:

```
heroku config:set EARLS_TRACK="#c4l15"
heroku config:set TWITTER_CONSUMER_KEY=XXX
heroku config:set TWITTER_CONSUMER_SECRET=XXX
heroku config:set TWITTER_ACCESS_TOKEN=XXX
heroku config:set TWITTER_ACCESS_TOKEN_SECRET=XXX
```

## Loading

earls listens for new tweets. If you'd like to add some existing tweets that
you've collected with [twarc](http://github.com/edsu/twarc) you can load them
into redis like so:

    ./load.js tweets.json 

This will connect to a local redis instance by default. If you would like to 
load into a remote herkou redis db get the redis URI from the resources tab in 
the Heroku admin, and then pass it in as a second parameter:

    ./load.js tweets.json redis://redistogo:YOURPASSWORDHERE@mummichog.redistogo.com:10771

Loading existing tweets is useful when you haven't been running earls since the
beginning of an event, and you would like to load some of this historical data.

## Archiving

Once an event is over you can create a static snapshot very easily using 
wget, and host it yourself or create a permanent redirect to a Github Pages 
site.

For example if you had an earls instance running at http://inkdroid.org/pda2015/
you could:

    wget --page-requisites --no-host-directories --cut-dirs 1 http://inkdroid.org/pda2015/
    git init 
    git add *
    git commit -m 'snapshot of earls instance' -a
    git remote add origin git@github.com:edsu/pda2015.git
    git checkout -b gh-pages
    git push origin gh-pages
    # goto http://edsu.github.io/pda2015/

## A gentle guide to setting up on Heroku for the uninitiated
[get a heroku account](https://signup.heroku.com/)

install git

[install node](https://nodejs.org/)

[install toolbelt](https://toolbelt.heroku.com/)

## and go!
+ on heroku page, created your new app, eg., `test-earls`
+ on [twitter's developer page](https://dev.twitter.com/) create a new app and record the twitter authentication credentials we pass to Heroku below. 
+ in the terminal, type the following sequence of commands. Note that XXX are your credentials from Twitter:

`$ git clone https://github.com/edsu/earls`

`$ cd earls`

`$ heroku login`

`$ heroku config:set EARLS_TRACK="#msudai" --app test-earls`

`$ heroku config:set TWITTER_CONSUMER_KEY=XXX --app test-earls`

`$ heroku config:set TWITTER_CONSUMER_SECRET=XXX --app test-earls`

`$ heroku config:set TWITTER_ACCESS_TOKEN=XXX --app test-earls`

`$ heroku config:set TWITTER_ACCESS_TOKEN_SECRET=XXX --app test-earls`

`$ git init`

`$ heroku git:remote -a sg-earls`

`$  git add .`

`$ git commit -am "do it"`

`$ git push heroku master`

...at this point, once you're back to the prompt, the url for your app will be displayed. You need to give Heroku credit card details for this to go live; since you are most likely using the Free Tier of service on Heroku, you will not be billed.

## Additional packages on Heroku 

Install a logging package so you can see where it has gone wrong:

`$ heroku addons:create papertrail:choklad`

Install Redistogo from Heroku addons.

`$ heroku addons:create redistogo:nano`

## Getting data into Heroku from twarc archive

To get the data up into your instance I found a few dependencies for Node.js needed to be installed on my OSX Yosemite machine:

`$ npm install async`

`$ npm install redis`

`$ npm install underscore`

`$ npm install cheerio`

`$ npm install express`

`$ npm install twitter`

`$ npm install request`

`$ npm install socket.io`

For Twarc this might need to be installed:

`$ pip install pyopenssl ndg-httpsclient pyasn1` 

Which enabled SSL requests to work.


