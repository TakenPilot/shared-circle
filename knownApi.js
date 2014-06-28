module.exports = {

    /**
     * OAuth1.0a has been deprecated by the powers-that-be.
     * Still used in many places.
     * @see RFC5849
     */
    oauth1: {
        twitter: {
            host: 'https://api.twitter.com',
            consumerSecret: 'KxqYnpupEDBieiNR7TEx8aePlQ06QSCpBPvGsgfe0',
            apiViews: {
                'statuses/home_timeline.json': 'api/twitter/tweets',
                'statuses/retweets_of_me.json': 'api/twitter/tweets',
                'favorites/list.json': 'api/twitter/tweets',
                'users/suggestions.json': 'api/twitter/users',
                'friends/ids.json': 'api/twitter/users',
                'followers/ids.json': 'api/twitter/users'
            },
            defaultValues: {
                'oauth_consumer_key': 'kbukDKDeUi65S7vcSSfvA',
                'oauth_version': '1.0',
                'oauth_signature_method': 'HMAC-SHA1',
                'oauth_callback': 'http://localhost:1337/account/accept?api=twitter'
            },
            headerValues: [
                'oauth_consumer_key',
                'oauth_signature_method',
                'oauth_signature',
                'oauth_timestamp',
                'oauth_nonce',
                'oauth_version',
                'oauth_callback',
                'oauth_token',
                'oauth_verifier'
            ],
            fetchRequestToken: {
                method: 'POST',
                uri: 'oauth/request_token',
                required: {
                    'oauth_callback': true,
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_version': true
                },
                expected: {
                    'oauth_token': true,
                    'oauth_token_secret': true
                }
            },
            redirect: {
                method: 'GET',
                uri: 'oauth/authorize',
                required: {
                    'oauth_token': true,
                    'oauth_callback': true
                }
            },
            receiveUserBack: {
                expected: {
                    'oauth_token': true,
                    'oauth_verifier': true
                }
            },
            fetchAccessToken: {
                method: 'POST',
                uri: 'oauth/access_token',
                required: {
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_token': true,
                    'oauth_version': true,
                    'oauth_verifier': true
                },
                expected: {
                    'oauth_token': true,
                    'oauth_token_secret': true,
                    'oauth_callback_confirmed': true,
                    'user_id': true,
                    'screen_name': true
                }
            },
            request: {
                required: {
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_token': true,
                    'oauth_version': true
                }
            }
        },
        fitBit: {
            host: 'https://api.fitbit.com',
            consumerSecret: 'fb8ff056257b491fb899eaddb4c2fae8',
            apiViews: {},
            defaultValues: {
                'oauth_consumer_key': '3d50b483770c4de9835ff4a699bbfea7',
                'oauth_version': '1.0',
                'oauth_signature_method': 'HMAC-SHA1',
                'oauth_callback': 'http://localhost:1337/account/accept?api=fitBit'
            },
            headerValues: [
                'oauth_consumer_key',
                'oauth_signature_method',
                'oauth_signature',
                'oauth_timestamp',
                'oauth_nonce',
                'oauth_version',
                'oauth_callback',
                'oauth_token',
                'oauth_verifier'
            ],
            fetchRequestToken: {
                method: 'POST',
                uri: 'oauth/request_token',
                required: {
                    'oauth_callback': true,
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_version': true
                },
                expected: {
                    'oauth_token': true,
                    'oauth_token_secret': true,
                    'oauth_callback_confirmed': true
                }
            },
            redirect: {
                method: 'GET',
                uri: 'https://www.fitbit.com/oauth/authorize',
                required: {
                    'oauth_token': true,
                    'oauth_callback': true
                }
            },
            receiveUserBack: {
                expected: {
                    'oauth_token': true,
                    'oauth_verifier': true
                }
            },
            fetchAccessToken: {
                method: 'POST',
                uri: 'oauth/access_token',
                required: {
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_token': true,
                    'oauth_version': true,
                    'oauth_verifier': true
                },
                expected: {
                    'oauth_token': true,
                    'oauth_token_secret': true
                }
            },
            request: {
                required: {
                    'oauth_consumer_key': true,
                    'oauth_nonce': true,
                    'oauth_signature': true,
                    'oauth_signature_method': true,
                    'oauth_timestamp': true,
                    'oauth_token': true,
                    'oauth_version': true
                }
            }
        }
    },

    /**
     * OAuth2.0 was abandoned by the original and main author for very good reasons.
     * @see RFC6749
     * @see http://hueniverse.com/2012/07/26/oauth-2-0-and-the-road-to-hell/
     */
    oauth2: {}
};