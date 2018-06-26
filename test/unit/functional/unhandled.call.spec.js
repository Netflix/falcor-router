var R = require('../../../src/Router');
var tap = require('falcor-observable').tap;
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var LegacyObservable = require('../../LegacyObservable');

describe('#call', function() {
    it('should ensure a missing function gets chained.', function(done) {
        var router = new R([]);
        var onCall = sinon.spy(function() {
            return LegacyObservable.of({
                jsonGraph: {
                    videos: {
                        summary: 5
                    }
                },
                paths: [
                    ['videos', 'summary']
                ]
            });
        });
        router.routeUnhandledPathsTo({
            call: onCall
        });
        var onNext = sinon.spy();
        router.
            call(['test'], []).
            pipe(tap(onNext, noOp, function() {
                expect(onNext.callCount).to.equals(1);
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 5
                        }
                    },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            })).
            subscribe(noOp, done, done);
    });

    it('should ensure a missing function gets chained and will not materialize properly.', function(done) {
        var router = new R([]);
        var onCall = sinon.spy(function() {
            return LegacyObservable.of({
                jsonGraph: { },
                paths: [
                    ['videos', 'summary']
                ]
            });
        });
        router.routeUnhandledPathsTo({
            call: onCall
        });
        var onNext = sinon.spy();
        router.
            call(['test'], []).
            pipe(tap(onNext, noOp, function() {
                expect(onNext.callCount).to.equals(1);
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: { },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            })).
            subscribe(noOp, done, done);
    });
});
