var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var pathValueMerge = require('./../../../src/cache/pathValueMerge');
var FalcorObservable = require('../../FalcorObservable');
var $atom = require('./../../../src/support/types').$atom;

describe('#get', function() {
    it('should return an empty Observable and just materialize values.', function(done) {
        var router = new R([]);
        var onUnhandledPaths = sinon.spy(function convert(paths) {
            return FalcorObservable.empty();
        });
        router.routeUnhandledPathsTo({get: onUnhandledPaths});

        var obs = router.
            get([['videos', 'summary']]);
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce, 'onNext should be called.').to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: {$type: $atom}
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals([
                    ['videos', 'summary']
                ]);
            }).
            subscribe(noOp, done, done);
    });
    it('should call the routeUnhandledPathsTo when the route completely misses a route.', function(done) {
        var router = new R([]);
        var onUnhandledPaths = sinon.spy(function convert(paths) {
            var returnValue = paths.reduce(function(jsonGraph, path) {
                pathValueMerge(jsonGraph.jsonGraph, {
                    path: path,
                    value: 'missing'
                });
                return jsonGraph;
            }, {jsonGraph: {}});
            return FalcorObservable.of(returnValue);
        });
        router.routeUnhandledPathsTo({get: onUnhandledPaths});

        var obs = router.
            get([['videos', 'summary']]);
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 'missing'
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals([
                    ['videos', 'summary']
                ]);
            }).
            subscribe(noOp, done, done);
    });

    it('should call the routeUnhandledPathsTo when the route partially misses a route.', function(done) {
        var router = new R([{
            route: 'videos.length',
            get: function() {
                return {
                    path: ['videos', 'length'],
                    value: 5
                };
            }
        }]);
        var onUnhandledPaths = sinon.spy(function convert(paths) {
            var returnValue = paths.reduce(function(jsonGraph, path) {
                pathValueMerge(jsonGraph.jsonGraph, {
                    path: path,
                    value: 'missing'
                });
                return jsonGraph;
            }, {jsonGraph: {}});
            return FalcorObservable.of(returnValue);
        });
        router.routeUnhandledPathsTo({get: onUnhandledPaths});

        var obs = router.
            get([['videos', ['length', 'summary']]]);
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 'missing',
                            length: 5
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals([
                    ['videos', 'summary']
                ]);
            }).
            subscribe(noOp, done, done);
    });
});
