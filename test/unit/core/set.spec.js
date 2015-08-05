var R = require('../../../src/Router');
var Routes = require('./../../data');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var sinon = require("sinon");
var Promise = require("promise");

describe('Set', function() {

    xit('should correctly handle promise rejection.', function(done) {
        var did = false;
        var called = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                return Promise.reject({
                    message: "user not authorised",
                    unauthorized: true
                })
            }
        }]);
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
            doAction(function(result) {
                expect(result).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: {
                                    $type: "error", 
                                    value: {
                                        message: "not authorized",
                                        unauthorized: true
                                    }
                                }
                            },
                            333: {
                                rating: {
                                    $type: "error", 
                                    value: {
                                        message: "not authorized",
                                        unauthorized: true
                                    }
                                }
                            }
                        }
                    }
                });
                called++;
            }).
            subscribe(noOp, done, function() {
                if (!did) {
                    expect(called).to.equals(1);
                    done();
                }
            });
    });

    xit('should correctly handle synchronously thrown error.', function(done) {
        var did = false;
        var called = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                throw {
                    message: "not authorized",
                    unauthorized: true
                }
            }
        }]);
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
            doAction(function(result) {
                expect(result).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: {
                                    $type: "error", 
                                    value: {
                                        message: "not authorized",
                                        unauthorized: true
                                    }
                                }
                            },
                            333: {
                                rating: {
                                    $type: "error", 
                                    value: {
                                        message: "not authorized",
                                        unauthorized: true
                                    }
                                }
                            }
                        }
                    }
                });
                called++;
            }).
            subscribe(noOp, done, function() {
                if (!did) {
                    expect(called).to.equals(1);
                    done();
                }
            });
    });



    it('should perform a simple set.', function(done) {
        var did = false;
        var called = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                try {
                    expect(json).to.deep.equals({
                        videos: {
                            1234: { rating: 5 },
                            333: { rating: 5 }
                        }
                    });
                } catch (e) {
                    done(e);
                    did = true;
                }
                return [{
                    path: ['videos', 1234, 'rating'],
                    value: 5
                }, {
                    path: ['videos', 333, 'rating'],
                    value: 5
                }];
            }
        }]);
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
            doAction(function(result) {
                expect(result).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: 5
                            },
                            333: {
                                rating: 5
                            }
                        }
                    }
                });
                called++;
            }).
            subscribe(noOp, done, function() {
                if (!did) {
                    expect(called).to.equals(1);
                    done();
                }
            });
    });

    it('should perform a set with get reference following.', function(done) {
        var did = false;
        var called = 0;
        var refFollowed = false;
        var router = new R(
            Routes().Genrelists.Integers(function() {
                refFollowed = true;
            }).concat(
            [{
                route: 'videos[{integers:id}].rating',
                set: function(json) {
                    called++;
                    try {
                        expect(json).to.deep.equals({
                            videos: {
                                0: { rating: 5 }
                            }
                        });
                    } catch (e) {
                        done(e);
                        did = true;
                    }
                    return [{
                        path: ['videos', 0, 'rating'],
                        value: 5
                    }];
                }
            }]));

        router.
            set({
                jsonGraph: {
                    genreLists: {
                        0: {
                            rating: 5
                        }
                    }
                },
                paths: [
                    ['genreLists', 0, 'rating']
                ]
            }).
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        genreLists: {
                            0: $ref('videos[0]')
                        },
                        videos: {
                            0: {
                                rating: 5
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, function() {
                if (!did) {
                    try {
                        expect(called && refFollowed).to.be.ok;
                        done();
                    } catch(e) {
                        done(e);
                    }
                }
            });
    });

    it('should invoke getter on attempt to set read-only property.', function(done) {
        var onNext = sinon.spy();
        var router = new R([{
            route: 'a.b.c',
            get: function() {
                return {
                    path: ['a', 'b', 'c'],
                    value: 5
                };
            }
        }]);
        router.
            set({
                paths: [['a', 'b', 'c']],
                jsonGraph: {
                    a: {
                        b: {
                            c: 7
                        }
                    }
                }
            }).
            doAction(onNext).
            doAction(noOp, noOp, function(x) {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        a: {
                            b: {
                                c: 5
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });
});
