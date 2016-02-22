var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');

describe('Multi-Indexer', function() {
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
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: 'one',
                            two: 'two'
                        }
                    }
                });
                expect(serviceCalls).to.equal(1);
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
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: {summary: 'one'},
                            two: {summary: 'two'}
                        }
                    }
                });
                expect(serviceCalls).to.equal(1);
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
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: {0: {0: 'one'}},
                            two: {0: {0: 'two'}}
                        }
                    }
                });
                expect(serviceCalls).to.equal(1);
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
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: 'one'
                        }
                    }
                });
                expect(serviceCalls).to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should fire multiple service calls', function(done) {
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var router = new R([{
            route: 'test["one", "two"]["three", "four"]',
            get: function(aliasMap) {
                var part1 = aliasMap[1];
                var part2 = aliasMap[2];
                serviceCalls++;

                expect(Array.isArray(part1)).to.be.ok;
                expect(Array.isArray(part2)).to.be.ok;
                var res = [];
                part1.forEach(function(p1) {
                    part2.forEach(function(p2) {
                        res.push({path: ['test', p1, p2], value: p1 + p2});
                    });
                });

                return res;
            }
        }]);

        router.
            get([
                ["test", 'one', 'three'],
                ["test", 'two', 'four']
            ]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        test: {
                            one: {three: 'onethree'},
                            two: {four: 'twofour'}
                        }
                    }
                });
                expect(serviceCalls).to.equal(2);
            }).
            subscribe(noOp, done, done);
    });
});
