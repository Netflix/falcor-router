var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var Observable = require('../../../src/RouterRx').Observable;

describe('#call', function() {
    it('should ensure a missing function gets chained.', function(done) {
        var router = new R([]);
        var onCall = sinon.spy(function() {
            return Observable.of({
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
            do(onNext, noOp, function() {
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
            }).
            subscribe(noOp, done, done);
    });

    it('should ensure a missing function gets chained and will not materialize properly.', function(done) {
        var router = new R([]);
        var onCall = sinon.spy(function() {
            return Observable.of({
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
            do(onNext, noOp, function() {
                expect(onNext.callCount).to.equals(1);
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: { },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });
});
