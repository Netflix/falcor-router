var R = require('../../../src/Router');
var Routes = require('./../../data');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var sinon = require("sinon");

describe('Set', function() {

    xit('should not transform set values before passing them to route. (undefined)', function(done) {
        var router = new R([{
            route: 'titlesById[{integers:titleIds}].userRating',
            set: function(json) {
                var exception = false
                try {
                    expect("userRating" in json.titlesById[1]).to.equals(true)
                    expect(json.titlesById[1]).to.equals(undefined)
                } catch (e) {
                    exception = true
                    done(e);
                }
                if (!exception) {
                    done()
                }

            }
        }]);

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "1": {
                            "userRating": undefined
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
            subscribe(noOp, noOp, noOp);
    });

    xit('should call the route when setting a value to null', function(done) {
        var called = false
        var router = new R([{
            route: 'titlesById[{integers:titleIds}].userRating',
            set: function(json) {
                called = true
                var exception = false
                try {
                    expect(json).to.deep.equals({
                        "titlesById": {
                            "1": {
                                "userRating": null
                            }
                        }
                    })
                } catch (e) {
                    exception = true
                    done(e);
                }
                if (!exception) {
                    done()
                }

            }
        }]);

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "1": {
                            "userRating": null
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
            subscribe(noOp, function() {
                expect(called).to.equals(true)
                done()
            }, noOp);
    });


    xit('should call get() with the same type of arguments when no route for set() found.', function(done) {
        var router = new R([
            {
                route: "titlesById[{integers:titleIds}].rating",
                get: function(json) {

                    var exception = false
                    try {
                        expect(json).to.deep.equals(
                            [
                               "titlesById",
                               [
                                  0
                               ],
                               "rating"
                            ]
                        )
                    } catch (e) {
                        exception = true
                        done(e);
                    }
                    if (!exception) {
                        done()
                    }
                }

            }
        ]);

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "0": {
                            "rating": 5
                        }
                    }
                },
                "paths": [["titlesById", 0, "rating"]]
            }).
            subscribe(noOp, noOp, noOp);
    });



    xit('should not transform set values before passing them to route. (0)', function(done) {
        var router = new R([{
            route: 'titlesById[{integers:titleIds}].userRating',
            set: function(json) {
                var exception = false
                try {
                    expect(json).to.deep.equals({
                        "titlesById": {
                            "1": {
                                "userRating": 0
                            }
                        }
                    })
                } catch (e) {
                    exception = true
                    done(e);
                }
                if (!exception) {
                    done()
                }

            }
        }]);

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "1": {
                            "userRating": 0
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
            subscribe(noOp, noOp, noOp);
    });


    xit('should not transform set values before passing them to route.  ("")', function(done) {
        var router = new R([{
            route: 'titlesById[{integers:titleIds}].userRating',
            set: function(json) {
                var exception = false
                try {
                    expect(json).to.deep.equals({
                        "titlesById": {
                            "1": {
                                "userRating": ""
                            }
                        }
                    })
                } catch (e) {
                    exception = true
                    done(e);
                }
                if (!exception) {
                    done()
                }

            }
        }]);

        router.
            set({
                "jsonGraph": {
                    "titlesById": {
                        "1": {
                            "userRating": ""
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
            subscribe(noOp, noOp, noOp);
    });

    it('should call the error hook when an error occurs.', function(done) {
      var errorHook = sinon.spy();

      var router = new R([{
          route: ['im', 'a', 'route', 'yo'],
          set: function(jsonGraph) {
              throw new Error('error lawl');
          }
      }],
      {
          hooks: {
              error: errorHook
          }
      });

      router.set({
          jsonGraph: {
              im: {
                  a: {
                      route: {
                          yo: 'weeeee!'
                      }
                  }
              }
          },
          paths: [['im', 'a', 'route', 'yo']]
      })
      .do(function() {
          expect(errorHook.callCount).to.equal(1);
          expect(errorHook.calledWith(new Error('error lawl'))).to.be.ok;
      })
      .subscribe(noOp, done, done);
    });

    it('should correctly collapse and pluck paths with jsonGraph and set.', function(done) {
        var router = new R([{
            route: ['path', 'to', ['a', 'b', 'c']],
            set: function(jsonGraph) {
                return {
                    paths: [['path', 'to', ['a', 'b', 'c']]],
                    jsonGraph: jsonGraph
                };
            }
        }]);
        var onNext = sinon.spy();
        router.
            set({
                jsonGraph: {
                    path: {
                        to: {
                            a: 'aaa',
                            b: 'bbb',
                            c: 'ccc'
                        }
                    }
                },
                paths: [
                    ['path', 'to', ['a', 'b', 'c']]
                ]
            }).
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        path: {
                            to: {
                                a: 'aaa',
                                b: 'bbb',
                                c: 'ccc'
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should execute the methodSummary hook on a simple set.', function(done) {
        var i = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            set: function(json) {
                return [{
                    path: ['videos', 1234, 'rating'],
                    value: 5
                }, {
                    path: ['videos', 333, 'rating'],
                    value: 5
                }];
            }
        }], {
            now: function () {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'set',
                        start: 0,
                        jsonGraphEnvelope: {
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
                        },
                        routes: [
                            {
                                route: 'videos[{integers:id}].rating',
                                pathSet: ['videos', [1234, 333], 'rating'],
                                start: 1,
                                results: [{
                                    time: 2,
                                    value: [
                                        { path: ['videos', 1234, 'rating'], value: 5 },
                                        { path: ['videos', 333, 'rating'], value: 5 }
                                    ]
                                }],
                                end: 3
                            }
                        ],
                        results: [{
                            time: 4,
                            value: {
                                jsonGraph: {
                                    videos: { '333': { rating: 5 }, '1234': { rating: 5 } }
                                }
                            }
                        }],
                        end: 5
                    };
                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });
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
            subscribe();
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
            do(function(result) {
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

    it('should ensure that set gets called with only the data it needs.', function(done) {
        var routerSet = sinon.spy(function (jsonGraph) {
            return {jsonGraph: jsonGraph};
        });
        var router = new R([{
            route: "titlesById[{integers:titleIds}].userRating",
            set: routerSet
        }, {
            route: "genreLists[{integers:titleIds}]",
            get: function(p) {
                var id = p.titleIds[0];
                return {
                    path: ['genreLists', id],
                    value: $ref(['titlesById', id])
                };
            }
        }]);


        var onNext = sinon.spy();
        router.
            set({
                "jsonGraph": {
                    "genreLists": {
                        "9": {
                            "userRating": 9
                        },
                        "10": {
                            "userRating": 10
                        }
                    }
                },
                "paths": [
                    ["genreLists", 9, "userRating"],
                    ["genreLists", 10, "userRating"]
                ]
            }).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce, 'onNext calledOnce').to.be.ok;
                expect(routerSet.calledTwice, 'routerSet calledTwice').to.be.ok;
                expect(routerSet.getCall(0).args[0]).to.deep.equals({
                    "titlesById": {
                        "9": {
                            "userRating": 9
                        }
                    }
                });
                expect(routerSet.getCall(1).args[0]).to.deep.equals({
                    "titlesById": {
                        "10": {
                            "userRating": 10
                        }
                    }
                });
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    "jsonGraph": {
                        "genreLists": {
                            9: $ref('titlesById[9]'),
                            10: $ref('titlesById[10]')
                        },
                        "titlesById": {
                            "10": {
                                "userRating": 10
                            },
                            "9": {
                                "userRating": 9
                            }
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
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
            do(function(res) {
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
            do(onNext).
            do(noOp, noOp, function(x) {
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
