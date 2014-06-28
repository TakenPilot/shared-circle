/*globals OAuth*/

/**
 * AccountController.js 
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

var patterns = require('../../knownApi'),
    OAuth = require('../services/OAuth'),
    Promise = require('bluebird');

function getApiSteps (apiTarget) {
    return apiTarget && (patterns.oauth2[apiTarget] || patterns.oauth1[apiTarget]);
}

module.exports = {

    associations: function (req, res) {
        res.send({
            twitter: !!req.session.twitter,
            fitBit: !!req.session.fitBit
        });
    },

    /**
     * Associate an OAuth authentication to an account (or for the test, a session)
     * @param req
     * @param res
     */
    associate: function (req, res) {
        var apiName = req.param('api'),
            api = getApiSteps(apiName),
            data;

        if (api) {
            data = _.pick(req.query, api.headerValues);
            OAuth.getAuth(res, api, data).then(function (data) {
                console.log('associate', 'result', result);
                req.session[apiName] = {
                    requestToken: result.oauth_token,
                    requestTokenSecret: result.oauth_token_secret
                };
                return OAuth.directUserAway(res, api, data);
            }).catch(function (message) {
                res.send(500, message);
            });
        } else {
            res.send(400, 'Missing api target');
        }
    },

    /**
     * Accept an authentication for an account (or for the test, a session)
     * @param req
     * @param res
     */
    accept: function (req, res) {
        var apiName = req.param('api'),
            api = getApiSteps(apiName);

        if (!api) {
            res.send(400, 'Missing api target');
        } else if (!req.session[apiName]) {
            res.send(400, 'Missing api in session');
        } else if (!req.session[apiName].requestTokenSecret) {
            res.send(400, 'Missing request token authorization');
        } else {
            OAuth.acceptAuth(req, res, api, req.session[apiName].requestTokenSecret).then(function (result) {
              req.session[apiName].accessToken = result['oauth_token'];
              req.session[apiName].accessTokenSecret = result['oauth_token_secret'];
              delete result['oauth_token_secret'];

              if (res.viewExists && !req.wantsJSON) {
                res.view(result);
              } else {
                res.json(200, result);
              }
            }).catch(function (error) {
                res.send(400, error);
            });
        }
    }
};
