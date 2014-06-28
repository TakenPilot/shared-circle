var rest = require('restler'),
    _u = require('lodash'),
    cryptomath = require('cryptomath');

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
 */
function sendRequest(api, step, auth, data) {
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

    console.log('data Count', options.data, _.size(options.data));

    console.log('sending', uri, method, headers, options.data);
    return rest.request(uri, options)
}

function receiveUserBack (req, api) {
    var param, properties = {},
        step = api.receiveUserBack,
        expected = step.expected && Object.keys(step.expected);

    //take the user back, and get the oauth things that we're expecting from the header
    _u.each(expected, function (key) {
        param = req.param(key);
        if (param) {
            properties[key] = param;
        } else {
            console.error('Missing expected parameter ' + key);
        }
    });

    return properties;
}

function fetchAccessToken (api, properties, requestTokenSecret, callback) {
    var step = api.fetchAccessToken,
        auth = getAuthorizationHeader(api, step, properties, requestTokenSecret);

    return sendRequest(api, step, auth).on('success', function (message) {
      console.log('message', message);
      properties = convertFormToObj(message);
      callback(null, properties);
    }).on('error', function (message) {
        console.log('error message', message);
        callback(message);
    }).on('fail', function (message) {
        console.log('fail message', message);
        callback(message);
      });
}

function directUserAway (res, api, data) {
    var step = api.directUserAway,
        params = _u.map(Object.keys(step.required), function (key) {
            return key + '=' + cryptomath.applyPercentEncoding(data[key] || api.defaultValues[key]);
        }).join('&');

    res.set({ 'Location': getUri(api, step) + '?' + params });
    res.send(303);
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
    getAuth: function (req, res, api, data, callback) {
        var step = api.fetchRequestToken,
            auth = getAuthorizationHeader(api, step, data);

        sendRequest(api, step, auth).on('complete', function (message) {
            var data = convertFormToObj(message);

            callback(data);

            directUserAway(res, api, data);
        });
    },

    acceptAuth: function (req, res, api, requestTokenSecret, callback) {
        var result = receiveUserBack(req, api);
        fetchAccessToken(api, result, requestTokenSecret, callback);
    },

    request: function (api, step, data, accessTokenSecret) {
        step = _u.defaults(step, api.request);
        var auth = getAuthorizationHeader(api, step, data, accessTokenSecret);

        return sendRequest(api, step, auth, data);
    }
};