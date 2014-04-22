var rest = require('restler'),
    _u = require('lodash'),
    crypto = require('crypto');

/**
 * Create random string
 * @param {integer} [length]
 * @returns {string}
 */
function createNonce(length) {
    length = length || 20;
    var digits = '';
    for(var i = 0; i < length; i++) {
        digits += Math.floor(Math.random() * 36).toString(36);
    }
    return digits;
}

/**
 * Timestamp in milliseconds
 * @returns {string}
 */
function getTimestamp() {
    return (Math.floor(_u.now()/1000)).toString();
}

/**
 * @param {integer} code
 * @param {string} char
 * @returns {boolean}
 */
function isAllowedInRFC3986(code, char) {
    return (code >= 0x30 && code <= 0x39) ||
        (code >= 0x41 && code <= 0x5A) ||
        (code >= 0x61 && code <= 0x7A) ||
        _u.contains(['-','.','_','~'], char);
}

/**
 * The built-in URI encoding isn't standards compliant.
 * @param {string} str
 * @returns {string}
 */
function applyPercentEncoding(str) {
    var code;
    return str && _u.reduce(str, function (str, char) {
        code = char.charCodeAt(0);
        if (isAllowedInRFC3986(code, char)) {
            return str + char;
        } else {
            return str + '%' + code.toString(16).toUpperCase()
        }
    }, '');
}

/**
 * Sort an object's properties
 * Used in generating a consistent signature
 * @param {object} obj
 * @returns {object}
 */
function sortObject(obj) {
    return _u.reduce(Object.keys(obj).sort(), function (newObj, key) {
        newObj[key] = obj[key];
        return newObj;
    }, {});
}

/**
 *
 * @param {{host: string}} api
 * @param {{method: 'GET'|'POST', uri: string}} step
 * @param {{}} params
 * @param {string} consumerSecret
 * @param {string} [tokenSecret]
 */
function createHMACSignature(api, step, params, consumerSecret, tokenSecret) {
    var text, signingToken, parameterStr,
        method = step.method;

    parameterStr = applyPercentEncoding(_u.map(sortObject(params), function (value, key) {
        return key + '=' + applyPercentEncoding(value);
    }).join('&'));

    console.log('parameterStr Count', params, _.size(params));

    signingToken = applyPercentEncoding(consumerSecret) + '&';
    if (tokenSecret) {
        signingToken +=  applyPercentEncoding(tokenSecret)
    }

    text = [
        method.toUpperCase(),
        applyPercentEncoding(getUri(api, step)),
        parameterStr
    ].join('&');

    return crypto.createHmac('sha1', signingToken).update(text).digest('base64');
}

/**
 * @param {{}} api
 * @param {{}} params
 * @returns {string}
 */
function createAuthorizationHeaderFromParams(api, params) {
    params = _u.pick(params, api.headerValues);
    return "OAuth " + _u.map(sortObject(params), function (value, key) {
        return key + '="' + applyPercentEncoding(value) + '"';
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
            case 'oauth_nonce': fields[name] = createNonce(); break;
            case 'oauth_timestamp': fields[name] = getTimestamp(); break;
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
            'User-Agent': 'Attempt at a twitter client',
            'Accept': step.accept || '*/*',
            'Authorization': auth
        };

    options = {
        method: method,
        headers: headers
    };
    data = sortObject(_.omit(data, api.headerValues));
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
            return key + '=' + applyPercentEncoding(data[key] || api.defaultValues[key]);
        }).join('&');

    res.set({ 'Location': getUri(api, step) + '?' + params });
    res.send(303);
}

/**
 *
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