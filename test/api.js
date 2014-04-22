var Controller = require('../api/controllers/ApiController'),
    rest = require('restler'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    _u = require('lodash');

describe('account', function () {

    var sandbox, req, res, testFn;

    beforeEach(function() {
        req = {param: _u.noop, session: {}, headers: {}, route: {}};
        res = {send: _u.noop, set: _u.noop};
        sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe ('request', function () {
        it('fails if missing information', function (done) {
            sandbox.stub(res, 'send', function (code) {
                expect(code).to.equal(400);
                done();
            });
            Controller.twitter(req, res);
        });

        it('get twitter something', function (done) {
            sandbox.stub(res, 'send', function (code) {
                expect(code).to.deep.equal([]);
                done();
            });
            sandbox.stub(rest, 'request').returns({on: function (name, fn) { testFn = fn; }});
            req.route = {
                method: 'GET',
                params: {
                    namespace: 'statuses',
                    method: 'user_timeline'
                }
            };
            Controller.twitter(req, res);
            testFn([]);
        });
    });
});