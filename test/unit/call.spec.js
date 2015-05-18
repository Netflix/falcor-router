var TestRunner = require('./../TestRunner');
var Observable = require('rx').Observable;
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var errors = require('./../../src/exceptions');

describe('Call', function() {
    it('should perform a simple call.', function(done) {
        var called = 0;
        getRouter().
            call(['videos', 1234, 'rating'], [5]).
            doAction(function(x) {
                expect(x).to.deep.equals({
                    jsong: {
                        videos: {
                            1234: {
                                rating: 5
                            }
                        }
                    }
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    xit('should use the path suffixes to execute on top of the call changes.', function(done) {
    });

    it('should completely onError when an error is thrown from call.', function(done) {
        getRouter(true, true).
            call(['videos', 1234, 'rating'], [5]).
            doAction(function() {
                throw 'Should not be called.  onNext';
            }, function(x) {
                expect(x.message).to.equal('Oops?');
            }, function() {
                throw 'Should not be called.  onCompleted';
            }).
            subscribe(noOp, function(e) {
                if (e.message === 'Oops?') {
                    done();
                    return;
                }
                done(e);
            });
    });

    it('should cause the router to on error only.', function(done) {
        getRouter(true).
            call(['videos', 1234, 'rating'], [5]).
            doAction(function() {
                throw 'Should not be called.  onNext';
            }, function(x) {
                expect(x.message).to.equal(errors.callJSONGraphWithouPaths);
            }, function() {
                throw 'Should not be called.  onCompleted';
            }).
            subscribe(noOp, function(e) {
                if (e.message === errors.callJSONGraphWithouPaths) {
                    done();
                    return;
                }
                done(e);
            });
    });


    function getRouter(noPaths, throwError) {
        return new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                if (throwError) {
                    throw new Error('Oops?');
                }
                return {
                    jsong: {
                        videos: {
                            1234: {
                                rating: args[0]
                            }
                        }
                    },
                    paths: !noPaths && [['videos', 1234, 'rating']] || undefined
                };
            }
        }]);
    }
});
