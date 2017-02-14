var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var $atom = falcor.Model.atom;
var Observable = require('../../../src/RouterRx').Observable;
var sinon = require('sinon');

describe('Get', function() {

    it('should execute a simple route matching.', function(done) {
        var router = new R(Routes().Videos.Summary());
        var obs = router.
            get([['videos', 'summary']]);
        var called = false;
        obs.
            subscribe(function(res) {
                expect(res).to.deep.equals(Expected().Videos.Summary);
                called = true;
            }, done, function() {
                expect(called, 'expect onNext called 1 time.').to.equal(true);
                done();
            });
    });

    it('should not return empty atoms for a null value in jsonGraph', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        jsonGraph: {
                            videos: {
                                falsey: null
                            }
                        },
                        paths: [['videos', 'falsey']]
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: null
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a null value atom in jsonGraph', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        jsonGraph: {
                            videos: {
                                falsey: $atom(null)
                            }
                        },
                        paths: [['videos', 'falsey']]
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: $atom(null)
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a zero value in jsonGraph', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        jsonGraph: {
                            videos: {
                                falsey: 0
                            }
                        },
                        paths: [['videos', 'falsey']]
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: 0
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a zero value atom in jsonGraph', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        jsonGraph: {
                            videos: {
                                falsey: $atom(0)
                            }
                        },
                        paths: [['videos', 'falsey']]
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: $atom(0)
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a zero path value', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        value: 0,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: 0
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a null path value', function(done) {

        var router = new R([{
            route: 'videos.falsey',
            get: function(path) {
                return Observable.of({
                    value: null,
                    path: ['videos', 'falsey']
                });
            }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: null
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a false path value with old observables', function(done) {
        var router = new R([{
            route: 'videos.falsey',
            get: function(path) {
                return {
                  subscribe: function (observer) {
                    observer.onNext({
                        value: false,
                        path: ['videos', 'falsey']
                    });
                    observer.onCompleted();
                    return {
                        dispose: function () {

                        }
                    };
                  }
                }
            }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: false
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should return observables consumable in an Rx4 and under format', function() {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        value: false,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var completed = false;
        var results = [];

        var source = router.get([['videos', 'falsey']]);
        var sub = source .subscribe({
                onNext: function (x) {
                    results.push(x);
                },
                onError: function () {
                    throw new Error('this should not be reached');
                },
                onCompleted: function () {
                    completed = true;
                }
            });

        expect(sub.dispose).to.be.a('function');
        expect(sub.unsubscribe).to.be.a('function');
        expect(completed).to.equal(true);
        expect(results).to.deep.equal([
          {
              jsonGraph: {
                  videos: {
                      falsey: false
                  }
              }
          }
        ]);
    });

    it('should not return empty atoms for a false path value', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        value: false,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: false
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should not return empty atoms for a empty string path value', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.of({
                        value: '',
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            falsey: ''
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should validate that optimizedPathSets strips out already found data.', function(done) {
        this.timeout(10000);
        var serviceCalls = 0;
        var onNext = sinon.spy();
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) {
                return Observable.
                    from(aliasMap.ids).
                    map(function(id) {
                        if (id === 0) {
                            return {
                                path: ['lists', id],
                                value: $ref('two.be[956]')
                            };
                        }
                        return {
                            path: ['lists', id],
                            value: $ref('lists[0]')
                        };
                    }).

                    // Note: this causes the batching to work.
                    toArray();
            }
        }, {
            route: 'two.be[{integers:ids}].summary',
            get: function(aliasMap) {
                return Observable.
                    from(aliasMap.ids).
                    map(function(id) {
                        serviceCalls++;
                        return {
                            path: ['two', 'be', id, 'summary'],
                            value: 'hello world'
                        };
                    });
            }
        }];
        var router = new R(routes);
        router.
            get([['lists', [0, 1], 'summary']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: $ref('two.be[956]'),
                            1: $ref('lists[0]')
                        },
                        two: {
                            be: {
                                956: {
                                    summary: 'hello world'
                                }
                            }
                        }
                    }
                });
                expect(serviceCalls).to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should do precedence stripping.', function(done) {
        var title = 0;
        var rating = 0;
        var called = 0;
        var router = getPrecedenceRouter(
            function onTitle(alias) {
                var expected = ['videos', [123], 'title'];
                expected.ids = expected[1];
                expect(alias).to.deep.equals(expected);
                title++;
            },
            function onRating(alias) {
                var expected = ['videos', [123], 'rating'];
                expected.ids = expected[1];
                expect(alias).to.deep.equals(expected);
                rating++;
            });

        router.
            get([['videos', 123, ['title', 'rating']]]).
            do(function(x) {
                expect(x).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            123: {
                                title: 'title 123',
                                rating: 'rating 123'
                            }
                        }
                    }
                });
                called++;
            }, noOp, function() {
                expect(title).to.equals(1);
                expect(rating).to.equals(1);
                expect(called).to.equals(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should do precedence matching.', function(done) {
        var getSpecific = sinon.spy(function() {
            return {
                path: ['a', 'specific'],
                value: 'hello world'
            };
        });
        var getKeys = sinon.spy(function(aliasMap) {
            return {
                path: ['a', 'specific'],
                value: 'hello world'
            };
        });
        var router = new R([{
            route: 'a.specific',
            get: getSpecific
        }, {
            route: 'a[{keys:keys}]',
            get: getKeys
        }]);

        router.
            get([
                ['a', 'specific']
            ]).
            do(noOp, noOp, function() {
                expect(getSpecific.calledOnce, 'getSpecific').to.be.ok;
                expect(getKeys.calledOnce, 'getKeys').to.be.not.ok;
            }).
            subscribe(noOp, done, done);
    });

    it('should grab a reference.', function(done) {
        var called = 0;
        var router = getPrecedenceRouter();
        router.
            get([['lists', 'abc', 0]]).
            do(function(x) {
                expect(x).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            abc: {
                                0: $ref('videos[0]')
                            }
                        }
                    }
                });
                called++;
            }, noOp, function() {
                expect(called).to.equals(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should not follow references if no keys specified after path to reference', function (done) {
        var routeResponse = {
            jsonGraph: {
                "ProffersById": {
                    "1": {
                        "ProductsList": {
                            "0": {
                                "$size": 52,
                                "$type": "ref",
                                "value": [
                                    "ProductsById",
                                    "CSC1471105X"
                                ]
                            },
                            "1": {
                                "$size": 52,
                                "$type": "ref",
                                "value": [
                                    "ProductsById",
                                    "HON4033T"
                                ]
                            }
                        }
                    }
                }
            }
        };
        var router = new R([
            {
                route: "ProductsById[{keys}][{keys}]",
                get: function (pathSet) {
                    throw new Error("reference was followed in error");
                }
            },
            {
                route: "ProffersById[{integers}].ProductsList[{ranges}]",
                get: function (pathSet) {
                    return Observable.of(routeResponse);
                }
            }
        ]);
        var obs = router.get([["ProffersById", 1, "ProductsList", {"from": 0, "to": 1}]]);
        var called = false;
        obs.
            do(function (res) {
                expect(res).to.deep.equals(routeResponse);
                called = true;
            }, noOp, function () {
                expect(called, 'expect onNext called 1 time.').to.equal(true);
            }).
            subscribe(noOp, done, done);
    });

    it('should tolerate routes which return an empty observable', function (done) {
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.empty();
            }
        }]);
        var obs = router.get([["videos", 1, "title"]]);
        var onNext = sinon.spy();

        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {videos: {1: {title: {$type: 'atom'}}}}
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should match all specific route handlers when input paths are collapsed', function (done) {

        var called = 0;
        var router = new R([
            { route: 'foo.name',   get: function() { return { path: ['foo', 'name'],   value: 'foo-name'}; } },
            { route: 'bar.name',   get: function() { return { path: ['bar', 'name'],   value: 'bar-name'}; } },
            { route: 'foo.rating', get: function() { return { path: ['foo', 'rating'], value: 'foo-rating'}; } },
            { route: 'bar.rating', get: function() { return { path: ['bar', 'rating'], value: 'bar-rating'}; } }
        ]);

        router.
            get([[['foo', 'bar'], ['name', 'rating']]]).
            do(function(x) {
                expect(x).to.deep.equals({
                    jsonGraph: {
                        'foo': {
                            name: 'foo-name',
                            rating: 'foo-rating'
                        },
                        'bar': {
                            name: 'bar-name',
                            rating: 'bar-rating'
                        }
                    }
                });
                called++;
            }, noOp, function() {
                expect(called).to.equals(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should fire the methodSummary hook, if the route returns jsonGraphs', function (done) {
        var i = 0;

        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.of({
                    jsonGraph: {
                        videos: {
                            1: {
                                title: 'Orange Is The New Black'
                            }
                        }
                    }
                }, {
                    jsonGraph: {
                        videos: {
                            2: {
                                title: 'Whatever'
                            }
                        }
                    }
                });
            }
        }],
        {
            now: function () {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'get',
                        pathSets: [['videos', [1, 2], 'title']],
                        start: 0,
                        routes: [
                            {
                                route: 'videos[{integers:ids}].title',
                                start: 1,
                                end: 4,
                                results: [
                                    {
                                        time: 2,
                                        value: {
                                            jsonGraph: {
                                                videos: {
                                                    1: {
                                                        title: 'Orange Is The New Black'
                                                    }
                                                }
                                            }
                                        }
                                    },
                                    {
                                        time: 3,
                                        value: {
                                            jsonGraph: {
                                                videos: {
                                                    2: {
                                                        title: 'Whatever'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                ],
                                pathSet: ['videos', [1, 2], 'title']
                            }
                        ],
                        end: 6,
                        results: [{
                            time: 5,
                            value: {
                                jsonGraph: {
                                    videos: {
                                        '1': {title: 'Orange Is The New Black'},
                                        '2': {title: 'Whatever'}
                                    }
                                }
                            }
                        }]
                    };

                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });
        router.get([['videos', [1, 2], 'title']])
            .subscribe();
    });

    it('should fire the methodSummary hook properly if you subscribe twice', function (done) {
        var i = 0;

         var expected = function (t) {
             return {
                method: 'get',
                pathSets: [['videos', [1, 2], 'title']],
                start: t + 0,
                routes: [
                    {
                        route: 'videos[{integers:ids}].title',
                        start: t + 1,
                        end: t + 4,
                        results: [
                            {
                                time: t + 2,
                                value: {path: ['videos', 1, 'title'], value: 'Orange Is The New Black'}
                            },
                            {
                                time: t + 3,
                                value: {path: ['videos', 2, 'title'], value: 'Whatever'}
                            }
                        ],
                        pathSet: ['videos', [1, 2], 'title']
                    }
                ],
                end: t + 6,
                results: [{
                    time: t + 5,
                    value: {
                        jsonGraph: {
                            videos: {
                                '1': {title: 'Orange Is The New Black'},
                                '2': {title: 'Whatever'}
                            }
                        }
                    }
                }]
            }
        };

        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.of({
                    path: ['videos', 1, 'title'],
                    value: 'Orange Is The New Black'
                }, {
                    path: ['videos', 2, 'title'],
                    value: 'Whatever'
                });
            }
        }],
        {
            now: function () {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    expect(summary).to.deep.equal(expected(i - 7));
                    if (i === 14) {
                        done();
                    }
                }
            }
        });

        var source$ = router.get([['videos', [1, 2], 'title']]);

        source$.subscribe();
        source$.subscribe();
    });

    it('should fire the methodSummary hook, if the route returns path values', function (done) {
        var i = 0;

        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.of({
                    path: ['videos', 1, 'title'],
                    value: 'Orange Is The New Black'
                }, {
                    path: ['videos', 2, 'title'],
                    value: 'Whatever'
                });
            }
        }],
        {
            now: function () {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'get',
                        pathSets: [['videos', [1, 2], 'title']],
                        start: 0,
                        routes: [
                            {
                                route: 'videos[{integers:ids}].title',
                                start: 1,
                                end: 4,
                                results: [
                                    {
                                        time: 2,
                                        value: {path: ['videos', 1, 'title'], value: 'Orange Is The New Black'}
                                    },
                                    {
                                        time: 3,
                                        value: {path: ['videos', 2, 'title'], value: 'Whatever'}
                                    }
                                ],
                                pathSet: ['videos', [1, 2], 'title']
                            }
                        ],
                        end: 6,
                        results: [{
                            time: 5,
                            value: {
                                jsonGraph: {
                                    videos: {
                                        '1': {title: 'Orange Is The New Black'},
                                        '2': {title: 'Whatever'}
                                    }
                                }
                            }
                        }]
                    };

                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });
        router.get([['videos', [1, 2], 'title']])
            .subscribe();
    });


    it('should fire the methodSummary hook if there is an error', function (done) {
        var i = 0;

        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.throw(new Error('bad luck for you'));
            }
        }],
        {
            now: function () {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'get',
                        pathSets: [['videos', 1, 'title']],
                        start: 0,
                        routes: [
                            {
                                route: 'videos[{integers:ids}].title',
                                start: 1,
                                end: 2,
                                results: [],
                                error: new Error('bad luck for you'),
                                pathSet: ['videos', 1, 'title']
                            }
                        ],
                        end: 4,
                        results: [{
                            time: 3,
                            value: {
                                jsonGraph: {
                                    videos: {
                                        '1': {
                                            title: {
                                                $type: 'error',
                                                value: {message: 'bad luck for you'}
                                            }
                                        }
                                    }
                                }
                            }
                        }]
                    };


                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });
        router.get([['videos', 1, 'title']])
            .subscribe();
    });


    it('should fire the pathError hook if the graph has a $type: "error" node in it', function (done) {
        var callCount = 0;
        var callContext = null;
        var callArgs = null;
        var router = new R([{
            route: 'videos[{integers:ids}].title',
            get: function (alias) {
                return Observable.of({
                    jsonGraph: {
                        videos: {
                            1: {
                                title: { $type: 'error', value: { message: 'bad luck for you' } }
                            }
                        }
                    }
                });
            }
        }],
        {
            hooks: {
                pathError: function () {
                    callCount++;
                    callArgs = Array.prototype.slice.call(arguments, 0);
                    callContext = this;
                }
            }
        });

        router.get([['videos',1,'title']])
            .do(
                function (jsonGraph) {
                    expect(jsonGraph).to.deep.equal({
                        jsonGraph: {
                            'videos': {
                                1: {
                                    'title': {
                                        $type: 'error', value: {
                                            message: 'bad luck for you'
                                        }
                                    }
                                }
                            }
                        }
                    })
                },
                noOp,
                function () {
                    expect(callCount).to.equal(1);
                    expect(callArgs).to.deep.equal([{
                        path: ['videos', 1, 'title'],
                        value: { $type: 'error', value: { message: 'bad luck for you' } }
                    }]);
                    expect(callContext).to.equal(router);
                }
            )
            .subscribe(
                noOp,
                done,
                done
            )
    });

    it('should fire the error hook passed in via options.hooks', function (done) {
      var callCount = 0;
      var callContext = null;
      var callArgs = null;
      var router = new R([{
          route: 'videos[{integers:ids}].title',
          get: function (alias) {
              throw new Error('bad luck for you');
          }
      }],
      {
          hooks: {
              error: function () {
                callCount++;
                callArgs = Array.prototype.slice.call(arguments, 0);
                callContext = this;
              }
          }
      });

      router.get([['videos',1,'title']])
          .do(
              function (jsonGraph) {
                  expect(jsonGraph).to.deep.equal({
                      jsonGraph: {
                          'videos': {
                              1: {
                                  'title': {
                                      $type: 'error', value: {
                                          message: 'bad luck for you'
                                      }
                                  }
                              }
                          }
                      }
                  })
              },
              noOp,
              function () {
                  expect(callCount).to.equal(1);
                  expect(callArgs).to.deep.equal([
                      new Error('bad luck for you')
                  ]);
                  expect(callContext).to.equal(router);
              }
          )
          .subscribe(
              noOp,
              done,
              done
          )
    });

    function getPrecedenceRouter(onTitle, onRating, options) {
        return new R([{
            route: 'videos[{integers:ids}].title',
            get: function(alias) {
                var ids = alias.ids;
                onTitle && onTitle(alias);
                return Observable.
                    from(ids).
                    map(function(id) {
                        return {
                            path: ['videos', id, 'title'],
                            value: 'title ' + id
                        };
                    });
            }
        }, {
            route: 'videos[{integers:ids}].rating',
            get: function(alias) {
                var ids = alias.ids;
                onRating && onRating(alias);
                return Observable.
                    from(ids).
                    map(function(id) {
                        return {
                            path: ['videos', id, 'rating'],
                            value: 'rating ' + id
                        };
                    });
            }

        }, {
            route: 'lists[{keys:ids}][{integers:indices}]',
            get: function(alias) {
                return Observable.
                    from(alias.ids).
                    flatMap(function(id) {
                        return Observable.
                            from(alias.indices).
                            map(function(idx) {
                                return {id: id, idx: idx};
                            });
                    }).
                    map(function(data) {
                        return {
                            path: ['lists', data.id, data.idx],
                            value: $ref(['videos', data.idx])
                        };
                    });
            }
        }],
        options);
    }
});
