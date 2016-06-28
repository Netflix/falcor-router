var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var circularReference = require('./../../../src/exceptions').circularReference;
var Promise = require('promise');

describe('Error', function() {
    it('should return an empty error when throwing a non error.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}]',
            get: function (alias) {
                /* eslint-disable no-throw-literal */
                throw 'hello world';
                /* eslint-enable no-throw-literal */
            }
        }]);
        var onNext = sinon.spy();

        router.
            get([["videos", 1, "title"]]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1: {
                                $type: 'error',
                                value: {}
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should throw an error when maxExpansion has been exceeded.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}]',
            get: function (alias) {
                return {
                    path: ['videos', 1],
                    value: $ref('videos[1]')
                };
            }
        }]);
        var obs = router.get([["videos", 1, "title"]]);
        var err = false;
        obs.
            doAction(
                noOp,
                function(e) {
                    expect(e.message).to.equals(circularReference);
                    err = true;
                }).
            subscribe(noOp, function(e) {
                if (err) {
                    return done();
                }
                return done(e);
            }, function() {
                done('should not of completed.');
            });
    });

    it('thrown non-Error should insert in the value property of $error object for all requested paths.', function(done) {
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            get: function(json) {
                /* eslint-disable no-throw-literal */
                throw {
                    message: "not authorized",
                    unauthorized: true
                };
                /* eslint-enable no-throw-literal */
            }
        }]);
        var onNext = sinon.spy();
        router.
            get([['videos', [1234, 333], 'rating']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            },
                            333: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('promise rejection of non Error should insert object as the value property within an error for all requested paths (either being set or get).', function(done) {
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                return Promise.reject({
                    message: "user not authorized",
                    unauthorized: true
                });
            }
        }]);
        var onNext = sinon.spy();
        router.
            set({
                jsonGraph: {
                    videos: {
                        1234: {
                            rating: 5
                        },
                        333: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['videos', [1234, 333], 'rating']
                ]
            }).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            },
                            333: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('thrown non-Error should insert in the value property of $error object for all requested paths (either being set or get).', function(done) {
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                /* eslint-disable no-throw-literal */
                throw {
                    message: "not authorized",
                    unauthorized: true
                };
                /* eslint-enable no-throw-literal */
            }
        }]);
        var onNext = sinon.spy();
        router.
            set({
                jsonGraph: {
                    videos: {
                        1234: {
                            rating: 5
                        },
                        333: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['videos', [1234, 333], 'rating']
                ]
            }).
            doAction(onNext).
            doAction(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            },
                            333: {
                                rating: {
                                    $type: "error",
                                    value: { }
                                }
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should call onError when an exception is thrown in a get request.', function(done) {
        var onError = sinon.spy();

        var router = new R([{
            route: 'videos[{integers:ids}][\'title\']',
            get: function (alias) {
                /* eslint-disable no-throw-literal */
                throw 'hello world';
                /* eslint-enable no-throw-literal */
            }
        }], {onError: onError});
        
        router.
            get([["videos", 1, "title"]]).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce).to.be.ok;

                var call = onError.getCall(0);
                expect(call.args[0]).to.equals('get');
                expect(call.args[1]).to.deep.equals(['videos', 1, 'title']);
                expect(call.args[2]).to.equals('hello world');
            }).
            subscribe(noOp, done, done);
    });

    it('should not call onError on a successful get', function(done) {
        var onError = sinon.spy();
        
        var router = new R([{
                route: 'videos[{integers:ids}][\'title\']',
                get: function(path) {
                    return { path: ['videos', [1], 'title'], value: "title" }
                }
        }], {onError: onError});

        router.get([['videos', 1, 'title']]).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce).to.not.be.ok;
            }).
            subscribe(noOp, done, done);
    });

    it('should call onError when an exception is thrown in a call request.', function(done) {
        var onError = sinon.spy();

        var router = new R([{
            route: 'videos[{integers:id}].ratings.length',
            call: function (callPath, args) {
                /* eslint-disable no-throw-literal */
                throw 'hello world';
                /* eslint-enable no-throw-literal */
            }
        }], {onError: onError});
        
        router.
            call(["videos", [1,2], "ratings", "length"]).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce).to.be.ok;

                var call = onError.getCall(0);
                expect(call.args[0]).to.equals('call');
                expect(call.args[1]).to.deep.equals(['videos', [1,2], 'ratings', 'length']);
                expect(call.args[2]).to.equals('hello world');
            }).
            subscribe(noOp, done, done);
    });

    it('should not call onError on a successful call', function(done) {
        var onError = sinon.spy();

        var router = new R([{
            route: 'a.b',
            call: function(callPath, args) {
                return [];
            }
        }], {onError: onError});

        router.
            call(['a', 'b']).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce, 'onError should not be called once').to.not.be.ok;
            }).
            subscribe(noOp, done, done);
    });

    it('should call onError when an exception is thrown in a set request.', function(done) {
        var onError = sinon.spy();

        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                /* eslint-disable no-throw-literal */
                throw 'hello world';
                /* eslint-enable no-throw-literal */
            }
        }], {onError: onError});
        
        router.
            set({
                jsonGraph: {
                    videos: {
                        1234: {
                            rating: 5
                        },
                        333: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['videos', [1234, 333], 'rating']
                ]
            }).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce).to.be.ok;

                var call = onError.getCall(0);
                expect(call.args[0]).to.equals('set');
                expect(call.args[1]).to.deep.equals(['videos', [ 1234, 333 ], 'rating']);
                expect(call.args[2]).to.equals('hello world');
            }).
            subscribe(noOp, done, done);
    });

    it('should not call onError on a successful set', function(done) {
        var onError = sinon.spy();

        var router = new R([{
            route: 'titlesById[{integers:titleIds}].userRating',
            set: function(json) {
                return [];
            }
        }], {onError: onError});

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "1": {
                            "userRating": 5
                        }
                    }
                },
                "paths": [
                    [
                        "titlesById",
                        1,
                        "userRating"
                    ]
                ]
            }).
            doAction(noOp, noOp, function() {
                expect(onError.calledOnce).to.not.be.ok;
            }).
            subscribe(noOp, done, done);
    });
});
