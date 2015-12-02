var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');

describe('Unhandled Paths.', function() {
    it('should denote a route that does not exist as "unhandled paths" when the path is not matched.', function(done) {
        var router = new R([]);
        var onNext = sinon.spy();
        router.
            get([['videos', 123, 'title']]).
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {},
                    unhandledPaths: [
                        ['videos', 123, 'title']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should denote a route that does not exist as "unhandled paths." when the path is matched.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function(keys) {
                return {
                    path: ['videos', 0, 'title'],
                    value: 'Running Man'
                };
            }
        }]);
        var onNext = sinon.spy();
        router.
            get([['videos', 0, ['title', 'rating']]]).
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            0: {
                                title: 'Running Man'
                            }
                        }
                    },
                    unhandledPaths: [
                        ['videos', 0, 'rating']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should emit an unhandled path value through pathValues.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function(keys) {
                return {
                    path: ['videos', 0, 'title'],
                    unhandled: true
                };
            }
        }]);
        var onNext = sinon.spy();
        router.
            get([['videos', 0, 'title']]).
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {},
                    unhandledPaths: [
                        ['videos', 0, 'title']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should emit an unhandled path value through jsonGraph.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function(keys) {
                return {
                    jsonGraph: {},
                    unhandledPaths: [
                        ['videos', 0, 'title']
                    ]
                };
            }
        }]);
        var onNext = sinon.spy();
        router.
            get([['videos', 0, 'title']]).
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {},
                    unhandledPaths: [
                        ['videos', 0, 'title']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should emit an unhandledPath and have an unhandledPath via route miss.  should be combined.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function(keys) {
                return {
                    path: ['videos', 0, 'title'],
                    unhandled: true
                };
            }
        }]);
        var onNext = sinon.spy();
        router.
            get([['videos', 0, ['title', 'rating']]]).
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: { },
                    unhandledPaths: [
                        ['videos', 0, ['rating', 'title']]
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });
});
