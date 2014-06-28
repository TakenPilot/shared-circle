var rest = require('restler'),
    _u = require('lodash'),
    cryptomath = require('cryptomath'),
    Promise = require('bluebird');

/**
 *
 * @param {{host: string}} api
 * @param {{method: 'GET'|'POST', uri: string}} step
 * @param {{}} params
 * @param {string} consumerSecret
 * @param {string} [tokenSecret]
 */
function createHMACSignature(api, step, params, consumerSecret, tokenSecret) {
    return cryptomath.createHMACSignature(
        step.method,
        getUri(api, step),
        params,
        consumerSecret,
        tokenSecret
    );
}

/**
 * @param {{}} api
 * @param {{}} params
 * @returns {string}
 */
function createAuthorizationHeaderFromParams(api, params) {
    params = _u.pick(params, api.headerValues);
    return "OAuth " + _u.map(cryptomath.sortObject(params), function (value, key) {
        return key + '="' + cryptomath.applyPercentEncoding(value) + '"';
    }).join(', ');
}

/**
 * @param {{}} step
 * @returns {boolean}
 */
function isSignatureRequired(step) {
    return step.required['oauth_signature'];
}

function getFields(api, step, data) {
    var lookup = _u.extend(_.clone(api.defaultValues), data || {}),
      required = Object.keys(step.required),
        fields = {};
    _u.each(required, function (name) {
        switch(name) {
            case 'oauth_signature': break; //this needs to be added last, so ignore this value
            case 'oauth_nonce': fields[name] = cryptomath.createNonce(); break;
            case 'oauth_timestamp': fields[name] = cryptomath.getTimestamp(); break;
            default:
                if (lookup[name]) {
                    fields[name] = lookup[name];
                } else if (step.required[name]) {
                    console.error('Missing required field ' + name);
                }
                break;
        }
    });

    //lastly, add any data that isn't required and hasn't been added yet.
    return _.defaults(fields, data);
}

function getUri(api, step) {
    if (step.uri.indexOf('http') > -1) {
        return step.uri
    } else {
        return api.host + '/' + step.uri;
    }
}

function convertFormToObj(message) {
    var properties = {};
    _u.each(message.split('&'), function (property) {
        var keyValuePair = property.split('=');
        properties[keyValuePair[0]] = keyValuePair[1];
    });
    return properties;
}

/**
 * @param api
 * @param step
 * @param auth
 * @param [data]
 * @returns {Promise}
 */
function sendRequest(api, step, auth, data) {
    new Promise(function (resolve, reject) {
        data = data || {};
        var options,
            uri = getUri(api, step),
            method = step.method.toUpperCase(),
            headers = {
                'User-Agent': 'Attempt at an oauth client',
                'Accept': step.accept || '*/*',
                'Authorization': auth
            };

        options = {
            method: method,
            headers: headers
        };
        data = cryptomath.sortObject(_.omit(data, api.headerValues));
        if (method !== 'PUT' && method !== 'POST' && _.size(data)) {
            uri += '?' + _.map(_.pairs(data), function (kv) { return kv.join('='); }).join('&')
        } else {
            options.data = data;
        }

        rest.request(uri, options).on('success', function (message) {
            resolve(convertFormToObj(message));
        }).on('error', function (message) {
            reject(message);
        }).on('fail', function (message) {
            reject(message);
        });
    });
}

/**
 *
 * @param req
 * @param {{receiveUserBack}} api
 * @returns {Promise}
 */
function receiveUserBack (req, api) {
    return new Promise(function (resolve, reject) {
        var param, properties = {},
            step = api.receiveUserBack,
            expected = step && step.expected;

        //take the user back, and get the oauth things that we're expecting from the header
        _u.each(expected, function (key) {
            param = req.param(key);
            if (param) {
                properties[key] = param;
            } else {
                reject('Missing expected parameter ' + key);
            }
        });

        resolve(properties);
    });
}

function fetchAccessToken (api, properties, requestTokenSecret) {
    var step = api.fetchAccessToken,
        auth = getAuthorizationHeader(api, step, properties, requestTokenSecret);

    return sendRequest(api, step, auth);
}

/**
 * @param api
 * @param step
 * @param [data]
 * @param [tokenSecret]
 * @returns {string}
 */
function getAuthorizationHeader(api, step, data, tokenSecret) {
    var signature,
        fields = getFields(api, step, data);
    console.log('fields', fields);
    if (isSignatureRequired(step)) {
        signature = createHMACSignature(api, step, fields, api.consumerSecret, tokenSecret);
        fields['oauth_signature'] = signature;
    }
    return createAuthorizationHeaderFromParams(api, fields);
}

module.exports = {
    /**
     * Get an OAuth1.0a authentication token from a service based on an api template.
     *
     * The API template must have a fetchRequestToken configuration object with:
     *   {'GET'|'POST'} method
     *   {string} uri
     *   {object} required  Each property of this object must be given from the user of the service, otherwise error
     *   {object} expected  Each property of this object must be given by the response, otherwise error
     *
     *
     * @param res
     * @param {{fetchRequestToken: {}}} api
     * @param data
     * @param callback
     */
    getAuth: function (res, api, data, callback) {
        var step = api.fetchRequestToken,
            auth = getAuthorizationHeader(api, step, data);

        return sendRequest(api, step, auth);
    },

    directUserAway: function (res, api, data) {
        return new Promise(function (resolve) {
            var step = api.redirect,
                params = _u.map(Object.keys(step.required), function (key) {
                    return key + '=' + cryptomath.applyPercentEncoding(data[key] || api.defaultValues[key]);
                }).join('&');

            res.set({ 'Location': getUri(api, step) + '?' + params });
            res.send(303);
            resolve();
        });
    },

    /**
     *
     * @param req
     * @param res
     * @param api
     * @param requestTokenSecret
     * @returns {Promise}
     */
    acceptAuth: function (req, res, api, requestTokenSecret) {
        return receiveUserBack(req, api).then(function (result) {
            return fetchAccessToken(api, result, requestTokenSecret);
        });
    },

    request: function (api, step, data, accessTokenSecret) {
        step = _u.defaults(step, api.request);
        var auth = getAuthorizationHeader(api, step, data, accessTokenSecret);

        return sendRequest(api, step, auth, data);
    }
};