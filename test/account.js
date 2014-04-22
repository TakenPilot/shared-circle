var Controller = require('../api/controllers/AccountController'),
    rest = require('restler'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    _u = require('lodash');

describe('account', function () {

    var sandbox, testFn,
        req = {param: _u.noop, session: {}, headers: {}},
        res = {send: _u.noop, set: _u.noop};

    beforeEach(function() {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe ('authorize', function () {
        it('fails if no api target', function (done) {
            sandbox.stub(res, 'send', function (code) {
                expect(code).to.equal(400);
                done();
            });
            Controller.associate(req, res);
        });

        it('get requestToken', function (done) {
            sandbox.stub(req, 'param').returns('twitter');
            sandbox.stub(res, 'set', function (headers) {
                expect(headers.Location).to.contain('https://api.twitter.com/oauth/authorize');
            });
            sandbox.stub(res, 'send', function (result) {
                expect(result).to.equal(303);
                done();
            });
            sandbox.stub(rest, 'request').returns({on: function (name, fn) { testFn = fn; }});

            Controller.associate(req, res);
            testFn('oauth_token=abc&oauth_token_secret=abcd');
        });
    });

    describe ('accept', function () {
        it('fails if no api target', function (done) {
            sandbox.stub(res, 'send', function (code) {
                expect(code).to.equal(400);
                done();
            });
            Controller.accept(req, res);
        });

        it('get accessToken', function (done) {
            sandbox.stub(req, 'param').returns('twitter');
            sandbox.stub(res, 'send', function (result) {
                expect(result).to.equal(200);
                done();
            });
            sandbox.stub(rest, 'request').returns({on: function (name, fn) { testFn = fn; }});

            Controller.accept(req, res);
            testFn('oauth_token=abc&oauth_token_secret=abcd');
        });
    });
});