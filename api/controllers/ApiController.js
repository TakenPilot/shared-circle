/**
 * ApiController.js 
 *
 * @description ::
 * @docs        :: http://sailsjs.org/#!documentation/controllers
 */

var _u = require('lodash'),
    patterns = require('../../knownApi'),
    OAuth = require('../services/OAuth');

function request (req, res, apiName) {
    var step, data, accessTokenSecret, params,
        route = req.route,
        query = req.query,
        api = patterns.oauth1[apiName];

    console.log(apiName, 'route', route, 'query', query);
    if (!req.session[apiName]) {
      console.log('req.session[apiName]', req.session[apiName]);
      res.send(400, 'Missing api in session');
    } else if (!route.params || !route.method) {
        console.log('route', route);
        res.send(400, 'Missing route')
    } else {
        accessTokenSecret = req.session[apiName].accessTokenSecret;
        params = route.params.join('/');
        step = {
            accept: 'application/json',
            method: route.method,
            uri: params
        };

        data = _u.contains(['POST', 'PUT'], route.method.toUpperCase()) ? req.body : req.query;
        data.oauth_token = req.session[apiName].accessToken;
        _.extend(data, query || {});
        OAuth.request(api, step, data, accessTokenSecret).then(function (result) {
            var view = api.apiViews[[route.params.namespace, route.params.method].join('/')];
            if (view && !res.wantsJSON) {
                console.log('view', view, result);
                res.view(view, {result: JSON.parse(result)});
            } else {
                console.log('json', result);
                res.send(result);
            }
        }).catch(function (error) {
            res.send(500, error);
        });
    }
}

module.exports = {
	twitter: function (req, res) {
        request(req, res, 'twitter');
    },

    fitBit: function (req, res) {
        request(req, res, 'fitBit');
    }
};
