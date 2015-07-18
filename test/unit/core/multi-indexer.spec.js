var TestRunner = require('./../../TestRunner');
var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var circularReference = require('./../../../src/exceptions').circularReference;
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var $atom = falcor.Model.atom;
var $error = falcor.Model.error;
var Observable = require('rx').Observable;
var sinon = require('sinon');

describe.only('Multi-Indexer', function() {
    it('should allow multiple string indexers to collapse into a single request in leaf position.', function(done) {
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var router = new R([{
            route: 'test["one", "two", "three"]',
            get: function(aliasMap) {
                var keys = aliasMap[1];
                serviceCalls++;

                expect(Array.isArray(keys)).to.be.ok;
                return keys.map(function(k) {
                    return {path: ['test', k], value: k};
                });
            }
        }]);

        router.
            get([["test", ['one', 'two']]]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: 'one',
                            two: 'two'
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should allow multiple string indexers to collapse into a single request in branch position.', function(done) {
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var router = new R([{
            route: 'test["one", "two", "three"].summary',
            get: function(aliasMap) {
                var keys = aliasMap[1];
                serviceCalls++;

                expect(Array.isArray(keys)).to.be.ok;
                return keys.map(function(k) {
                    return {path: ['test', k, 'summary'], value: k};
                });
            }
        }]);

        router.
            get([['test', ['one', 'two'], 'summary']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: {summary: 'one'},
                            two: {summary: 'two'},
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should allow multiple string indexers to collapse into a single request with named and unnamed routed tokens.', function(done) {
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var router = new R([{
            route: 'test["one", "two", "three"][{ranges}][{integers:ids}]',
            get: function(aliasMap) {
                var keys = aliasMap[1];
                serviceCalls++;

                expect(Array.isArray(keys)).to.be.ok;
                return keys.map(function(k) {
                    return {path: ['test', k, 0, 0], value: k};
                });
            }
        }]);

        router.
            get([['test', ['one', 'two'], 0, 0]]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: {0: {0: 'one'}},
                            two: {0: {0: 'two'}},
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should allow single string indexers to be coerced into an array when handed to route.', function(done) {
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var router = new R([{
            route: 'test["one", "two", "three"]',
            get: function(aliasMap) {
                var keys = aliasMap[1];
                serviceCalls++;

                expect(Array.isArray(keys)).to.be.ok;
                return keys.map(function(k) {
                    return {path: ['test', k], value: k};
                });
            }
        }]);

        router.
            get([["test", ['one']]]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: 'one'
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });
});
