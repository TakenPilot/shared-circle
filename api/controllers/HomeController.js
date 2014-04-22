/**
 * HomeController.js 
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

/**
 *
 * @type {{_links: {}}}
 * @see HAL
 */
var defaultResponse = {
    '_links': {
        self: {href: '/'},
        signInToTwitter: {title: 'Sign In to Twitter', href: '/account/associate?api=twitter'},
        getTwitterFeed: {title: 'Get Twitter Feed', href: '/api/twitter/statuses/home_timeline.json'},
        getTwitterReTweetsOfMe: {title: 'Get Twitter ReTweets of Me', href: '/api/twitter/statuses/retweets_of_me.json'},
        getTwitterFollowers: {title: 'Get Twitter Followers', href: '/api/twitter/followers/ids.json'},
        getTwitterFriends: {title: 'Get Twitter Friends', href: '/api/twitter/friends/ids.json'},
        getTwitterRecentFavorites: {title: 'Get Twitter Recent Favorites', href: '/api/twitter/favorites/list.json'}
    }
};

module.exports = {
	index: function (req, res) {
        if (res.viewExists && !req.wantsJSON) {
            res.view(defaultResponse);
        } else {
            res.send(defaultResponse);
        }
    }
};
