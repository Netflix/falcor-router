var Observable = require('../../../src/RouterRx').Observable;
var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var $atom = falcor.Model.atom;
var sinon = require("sinon");
var Promise = require("promise");
var doneOnError = require('./../../doneOnError');
var errorOnCompleted = require('./../../errorOnCompleted');
var errorOnNext = require('./../../errorOnNext');
var CallNotFoundError = require('./../../../src/errors/CallNotFoundError');
var CallRequiresPathsError = require('./../../../src/errors/CallRequiresPathsError');

describe('Call', function() {
    it('should be able to return nothing from a call', function(done) {
        var router = new R([{
            route: 'a.b',
            call: function(callPath, args) {
                return undefined;
            }
        }]);

        var onNext = sinon.spy();
        router.
            call(['a', 'b']).
            do(onNext, noOp, function() {
                expect(onNext.calledOnce, 'onNext called once').to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {},
                    paths: []
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should be able to return empty array from a call', function(done) {
        var router = new R([{
            route: 'a.b',
            call: function(callPath, args) {
                return [];
            }
        }]);

        var onNext = sinon.spy();
        router.
            call(['a', 'b']).
            do(onNext, noOp, function() {
                expect(onNext.calledOnce, 'onNext called once').to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {},
                    paths: []
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should call the methodSummary hook when there are errors', function (done) {
        var i = 0;
        var router = new R([
            {
                route: "titlesById[{integers:id}].name",
                get: function(pathSet) {
                    throw new Error('Live or die? Too bad! <HONK>');
                }
            },
            {
                route: 'genrelist[10].titles.push',
                call: function(callPath, args) {
                    return [
                        {
                            path: ['genrelist', 10, 'titles', 100],
                            value: { $type: 'ref', value: ['titlesById', 54] }
                        }
                    ];
                }
            },
            {
                route: 'genrelist[10].titles.length',
                get: function (pathSet) {
                    return [{
                        path: ['genrelist', 10, 'titles', 'length'],
                        value: 50
                    }]
                }
            }
        ], {
            now: function ()  {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'call',
                        start: 0,
                        end: 10,
                        callPath: ['genrelist', 10, 'titles', 'push'],
                        args: ['title100'],
                        refPaths: [['name']],
                        thisPaths: [['length']],
                        routes: [
                            {
                                start: 1,
                                route: 'genrelist[10].titles.push',
                                pathSet: ['genrelist', 10, 'titles', 'push'],
                                results: [{
                                    time: 2,
                                    value: [
                                        {
                                            path: ['genrelist', 10, 'titles', 100],
                                            value: { $type: 'ref', value: ['titlesById', 54] }
                                        }
                                    ]
                                }],
                                end: 3
                            },
                            {
                                start: 4,
                                end: 5,
                                route: 'titlesById[{integers:id}].name',
                                pathSet: ['titlesById', 54, 'name'],
                                results: [],
                                error: new Error('Live or die? Too bad! <HONK>')
                            },
                            {
                                start: 6,
                                end: 8,
                                route: 'genrelist[10].titles.length',
                                pathSet: ['genrelist', 10, 'titles', 'length'],
                                results: [{
                                    time: 7,
                                    value: [{ path: ['genrelist', 10, 'titles', 'length'], value: 50 }]
                                }]
                            }
                        ],
                        results: [{
                            time: 9,
                            value: {
                                jsonGraph: {
                                    genrelist: {
                                        '10': {
                                            titles: {
                                                '100': { $type: 'ref', value: ['titlesById', 54] },
                                                length: 50
                                            }
                                        }
                                    },
                                    titlesById: {
                                        '54': {
                                            name: {
                                                $type: 'error',
                                                value: { message: 'Live or die? Too bad! <HONK>' }
                                            }
                                        }
                                    }
                                },
                                paths: [
                                    ['genrelist', 10, 'titles', 'length'],
                                    ['genrelist', 10, 'titles', 100, 'name']
                                ]
                            }
                        }]
                    };

                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });

        router.testValue = 1;
        router.call(['genrelist', 10, 'titles', 'push'], ["title100"], [['name']], [['length']]).
            subscribe();
    });

    it('should call the methodSummary hook for path value returns', function (done) {
        var i = 0;
        var router = new R([
            {
                route: "titlesById[{integers:id}].name",
                get: function(pathSet) {
                    return [{
                        path: ['titlesById', 54, 'name'],
                        value: 'Die Hard'
                    }];
                }
            },
            {
                route: 'genrelist[10].titles.push',
                call: function(callPath, args) {
                    return [
                        {
                            path: ['genrelist', 10, 'titles', 100],
                            value: { $type: 'ref', value: ['titlesById', 54] }
                        }
                    ];
                }
            },
            {
                route: 'genrelist[10].titles.length',
                get: function (pathSet) {
                    return [{
                        path: ['genrelist', 10, 'titles', 'length'],
                        value: 50
                    }]
                }
            }
        ], {
            now: function ()  {
                return i++;
            },
            hooks: {
                methodSummary: function (summary) {
                    var expected = {
                        method: 'call',
                        start: 0,
                        end: 11,
                        callPath: ['genrelist', 10, 'titles', 'push'],
                        args: ['title100'],
                        refPaths: [['name']],
                        thisPaths: [['length']],
                        routes: [
                            {
                                start: 1,
                                route: 'genrelist[10].titles.push',
                                pathSet: ['genrelist', 10, 'titles', 'push'],
                                results: [{
                                    time: 2,
                                    value: [
                                        {
                                            path: ['genrelist', 10, 'titles', 100],
                                            value: { $type: 'ref', value: ['titlesById', 54] }
                                        }
                                    ]
                                }],
                                end: 3
                            },
                            {
                                start: 4,
                                end: 6,
                                route: 'titlesById[{integers:id}].name',
                                pathSet: ['titlesById', 54, 'name'],
                                results: [{
                                    time: 5,
                                    value: [{ path: ['titlesById', 54, 'name'], value: 'Die Hard'}]
                                }]
                            },
                            {
                                start: 7,
                                end: 9,
                                route: 'genrelist[10].titles.length',
                                pathSet: ['genrelist', 10, 'titles', 'length'],
                                results: [{
                                    time: 8,
                                    value: [{ path: ['genrelist', 10, 'titles', 'length'], value: 50 }]
                                }]
                            }
                        ],
                        results: [{
                            time: 10,
                            value: {
                                jsonGraph: {
                                    genrelist: {
                                        '10': {
                                            titles: {
                                                '100': { $type: 'ref', value: ['titlesById', 54] },
                                                length: 50
                                            }
                                        }
                                    },
                                    titlesById: { '54': { name: 'Die Hard' } }
                                },
                                paths: [
                                    ['genrelist', 10, 'titles', 'length'],
                                    ['genrelist', 10, 'titles', 100, 'name']
                                ]
                            }
                        }]
                    };


                    expect(summary).to.deep.equal(expected);
                    done();
                }
            }
        });

        router.testValue = 1;
        router.call(['genrelist', 10, 'titles', 'push'], ["title100"], [['name']], [['length']]).
            subscribe();
    });

    it('should bind "this" properly on a call that tranverses through a reference.', function(done) {
        var values = [];
        var router = new R([
            {
                route: "genrelist.myList",
                get: function(pathSet) {
                    values.push(this.testValue);
                    return [{
                        path: ['genrelist', 'myList'],
                        value: $ref(['genrelist', 10])
                    }];
                }
            },
            {
                route: 'genrelist[10].titles.push',
                call: function(callPath, args) {
                    values.push(this.testValue);
                    return [
                        {
                            path: ['genrelist', 10, 'titles', 100],
                            value: "title100"
                        },
                        {
                            path: ['genrelist',10, 'titles', 'length'],
                            value: 101
                        }
                    ];
                }
            }
        ]);

        router.testValue = 1;
        router.call(['genrelist', 'myList', 'titles', 'push'], ["title100"]).
            do(noOp, noOp, function() {
                expect(values).to.deep.equals([1, 1]);
            }).
            subscribe(noOp, done, done);
    });


    it('should return invalidations.', function(done) {
        var router = new R([{
            route: 'genrelist[{integers:indices}].titles.remove',
            call: function(callPath, args) {
                return callPath.indices.reduce(function(acc, genreIndex) {
                    return acc.concat([
                        {
                            path: ['genrelist', genreIndex, 'titles',
                                {from: 2, to: 2}
                            ],
                            invalidated: true
                        },
                        {
                            path: ['genrelist', genreIndex, 'titles', 'length'],
                            value: 2
                        }
                    ]);
                }, []);
            }
        }]);

        var onNext = sinon.spy();
        router.
            call(['genrelist', 0, 'titles', 'remove'], [1]).
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    "invalidated": [
                        [
                            "genrelist",
                            0,
                            "titles",
                            {
                                "from": 2,
                                "to": 2
                            }
                        ]
                    ],
                    "jsonGraph": {
                        "genrelist": {
                            "0": {
                                "titles": {
                                    "length": 2
                                }
                            }
                        }
                    },
                    "paths": [
                        [
                            "genrelist",
                            0,
                            "titles",
                            "length"
                        ]
                    ]
                });
            }).
            subscribe(noOp, done, done);

    });

    it('should onError when a Promise.reject of Error is returned from call.', function(done) {
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                return Promise.reject(new Error("Oops?"));
            }
        }]);

        var onError = sinon.spy();
        var onNext = sinon.spy();
        router.
            call(['videos', 1234, 'rating'], [5]).
            do(onNext, onError).
            do(noOp, function() {
                expect(onNext.callCount).to.equal(0);
                expect(onError.getCall(0).args[0].message).to.equal('Oops?');
            }).
            subscribe(noOp, doneOnError(done), errorOnCompleted(done));
    });

    it('should execute error hooks when an error occurs.', function(done) {
        var callCount = 0;
        var callContext = null;
        var callArgs = null;

        var router = new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                return Promise.reject(new Error("Oops?"));
            }
        }], {
            hooks: {
                error: function () {
                    callCount++;
                    callArgs = Array.prototype.slice.call(arguments, 0);
                    callContext = this;
                }
            }
        });

        router.
            call(['videos', 1234, 'rating'], [5]).
            do(noOp, function(err) {
                expect(callCount).to.equal(1);
                expect(callArgs).to.deep.equal([err]);
                expect(callContext).to.equal(router);
            }).
            subscribe(noOp, doneOnError(done), errorOnCompleted(done));
    });

    it('should onError when an Observable.throw of Error is returned from call.', function(done) {
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                return Observable.throw(new Error("Oops?"));
            }
        }]);

        var onError = sinon.spy();
        var onNext = sinon.spy();
        router.
            call(['videos', 1234, 'rating'], [5]).
            do(onNext, onError).
            do(noOp, function() {
                expect(onNext.callCount).to.equal(0);
                expect(onError.getCall(0).args[0].message).to.equal('Oops?');
            }).
            subscribe(noOp, doneOnError(done), errorOnCompleted(done));
    });


    it('should return paths in jsonGraphEnvelope if route returns a promise of jsonGraphEnvelope with paths.', function(done) {
        var onNext = sinon.spy();

        var router = new R([{
            route: 'genrelist[{integers:indices}].titles.push',
            call: function(callPath, args) {
                return Promise.resolve({
                    "jsonGraph": {
                        "genrelist": {
                            "0": {
                                "titles": {
                                    "18": {
                                        "$type": "ref",
                                        "value": ["titlesById", 1]
                                    },
                                    "length": 19
                                }
                            }
                        }
                    },
                    "paths": [
                        ["genrelist", 0, "titles", ["18", "length"]]
                    ]
                });
            }
        }]);

        router.
            call(['genrelist', 0, 'titles', 'push'], [{$type: "ref", value: ['titlesById', 1]}], [], []).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    "jsonGraph": {
                        "genrelist": {
                            "0": {
                                "titles": {
                                    "18": {
                                        "$type": "ref",
                                        "value": ["titlesById", 1]
                                    },
                                    "length": 19
                                }
                            }
                        }
                    },
                    "paths": [
                        ["genrelist", 0, "titles", [18, "length"]]
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should completely onError when an error is thrown from call.', function(done) {
        getRouter(true, true).
            call(['videos', 1234, 'rating'], [5]).
            do(function() {
                throw new Error('Should not be called.  onNext');
            }, function(x) {
                expect(x.message).to.equal('Oops?');
            }, function() {
                throw new Error('Should not be called.  onCompleted');
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
            do(noOp, function(x) {
                expect(x instanceof CallRequiresPathsError).to.be.ok;
            }).
            subscribe(
                errorOnNext(done),
                doneOnError(done),
                errorOnCompleted(done)
            );
    });


    it('should return paths in jsonGraphEnvelope if array of pathValues is returned from promise.', function(done) {
        var onNext = sinon.spy();

        var router = new R([{
            route: 'genrelist[{integers:indices}].titles.push',
            call: function(callPath, args) {
                return Promise.resolve([
                   {
                      "path": ["genrelist", 0, "titles", 18],
                      "value": {
                         "$type": "ref",
                         "value": ["titlesById", 1]
                      }
                   },
                   {
                      "path": ["genrelist", 0, "titles", "length"],
                      "value": 19
                   }
                ]);
            }
        }]);

        router.
            call(['genrelist', 0, 'titles', 'push'], [{$type: "ref", value: ['titlesById', 1]}], [], []).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    "jsonGraph": {
                        "genrelist": {
                            "0": {
                                "titles": {
                                    "18": {
                                        "$type": "ref",
                                        "value": ["titlesById", 1]
                                    },
                                    "length": 19
                                }
                            }
                        }
                    },
                    "paths": [
                        ["genrelist", 0, "titles", [18, "length"]]
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });



    it('should perform a simple call.', function(done) {
        var onNext = sinon.spy();
        getRouter().
            call(['videos', 1234, 'rating'], [5]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            1234: {
                                rating: 5
                            }
                        }
                    },
                    paths: [['videos', 1234, 'rating']]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should pass the #30 base call test with only suffix.', function(done) {
        var onNext = sinon.spy();
        getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], [['name']]).
            do(onNext).
            do(noOp, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]')
                            }
                        },
                        listsById: {
                            0: {
                                name: 'Thrillers'
                            }
                        }
                    },
                    paths: [
                        ['lolomo', 0, 'name']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should pass the #30 base call test with only paths.', function(done) {
        var called = 0;
        getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], null, [['length']]).
            do(function(jsongEnv) {
                expect(jsongEnv).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]'),
                                length: 1
                            }
                        }
                    },
                    paths: [
                        ['lolomo', 'length'],
                        ['lolomos', 123, '0']
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    it('should pass the #30 base call test with both paths and suffixes.', function(done) {
        var called = 0;
        getExtendedRouter().
            call(['lolomo', 'pvAdd'], ['Thrillers'], [['name']], [['length']]).
            do(function(jsongEnv) {
                expect(jsongEnv).to.deep.equals({
                    jsonGraph: {
                        lolomo: $ref('lolomos[123]'),
                        lolomos: {
                            123: {
                                0: $ref('listsById[0]'),
                                length: 1
                            }
                        },
                        listsById: {
                            0: {
                                name: 'Thrillers'
                            }
                        }
                    },
                    paths: [
                        ['lolomo', 'length'],
                        ['lolomo', 0, 'name']
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });


    it('should allow item to be pushed onto collection.', function(done) {
        var onNext = sinon.spy();
        getCallRouter().
            call(['genrelist', 0, 'titles', 'push'], [{ $type: 'ref', value: ['titlesById', 1] }]).
            do(onNext).
            do(noOp, noOp, function(x) {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        genrelist: {
                            0: {
                                titles: {
                                    2: {
                                        $type: 'ref',
                                        value: ['titlesById', 1]
                                    }
                                }
                            }
                        }
                    },
                    paths: [
                        ['genrelist', 0, 'titles', '2']
                    ]
                });
            }, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
            }).
            subscribe(noOp, done, done);
    });

    it('should evaluate path suffixes on result of a function that adds an item to a collection.', function(done) {
        var called = 0;
        var onNext = sinon.spy();
        getCallRouter().
            call(['genrelist', 0, 'titles', 'push'],
                 [{ $type: 'ref', value: ['titlesById', 1] }],
                 [['name'], ['rating']]).
            do(onNext).
            do(noOp, noOp, function(x) {
                expect(onNext.called).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        genrelist: {
                            0: {
                                titles: {
                                    2: {
                                        $type: 'ref',
                                        value: ['titlesById', 1]
                                    }
                                }
                            }
                        },
                        titlesById: {
                            1: {
                                name: 'Orange is the new Black',
                                rating: 5
                            }
                        }
                    },
                    paths: [
                        ['genrelist', 0, 'titles', 2, ['name', 'rating']]
                    ]
                });
                ++called;
            }).
            subscribe(noOp, done, function() {
                expect(called).to.equals(1);
                done();
            });
    });

    it('should throw when calling a function that does not exist.', function(done) {
        var router = new R([]);
        var onError = sinon.spy();
        router.
            call(['videos', 1234, 'rating'], [5]).
            do(noOp, onError).
            do(noOp, function() {
                expect(onError.calledOnce).to.be.ok;

                var args = onError.getCall(0).args;
                expect(args[0] instanceof CallNotFoundError).to.be.ok;
            }).
            subscribe(
                errorOnNext(done),
                doneOnError(done),
                errorOnCompleted(done)
            );
    });

    it('should throw when calling a function that does not exist, but get handler does.', function(done) {
        var router = new R([{
            route: 'videos[1234].rating',
            get: function() { }
        }]);
        var onError = sinon.spy();
        router.
            call(['videos', 1234, 'rating'], [5]).
            do(noOp, onError).
            do(noOp, function() {
                expect(onError.calledOnce).to.be.ok;

                var args = onError.getCall(0).args;
                expect(args[0] instanceof CallNotFoundError).to.be.ok;
            }).
            subscribe(
                errorOnNext(done),
                doneOnError(done),
                errorOnCompleted(done)
            );
    });

    function getCallRouter() {
        return new R([{
            route: 'genrelist[{integers}].titles.push',
            call: function(callPath, args) {
                return {
                    path: ['genrelist', 0, 'titles', 2],
                    value: {
                        $type: 'ref',
                        value: ['titlesById', 1]
                    }
                };
            }
        },
        {
            route: 'genrelist[{integers}].titles[{integers}]',
            get: function(pathSet) {
                return {
                    path: ['genrelist', 0, 'titles', 1],
                    value: {
                        $type: 'ref',
                        value: ['titlesById', 1]
                    }
                };
            }
        },
        {
            route: 'titlesById[{integers}]["name", "rating"]',
            get: function(callPath, args) {
                return [
                    {
                        path: ['titlesById', 1, 'name'],
                        value: 'Orange is the new Black'
                    },
                    {
                        path: ['titlesById', 1, 'rating'],
                        value: 5
                    }
                ];
            }
        }]);
    }

    function getRouter(noPaths, throwError) {
        return new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                if (throwError) {
                    throw new Error('Oops?');
                }
                return {
                    jsonGraph: {
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

    function getExtendedRouter(initialIdsAndNames) {
        var listsById = {};
        var idsAndNames = initialIdsAndNames || {};
        Object.keys(idsAndNames).reduce(function(acc, id) {
            var name = idsAndNames[id];
            listsById[id] = {name: name, rating: 3};
            return acc;
        }, listsById);

        function listsLength() {
            return Object.keys(listsById).length;
        }

        function addToList(name) {
            var length = listsLength();
            listsById[length] = {
                name: name,
                rating: 5
            };

            return length;
        }
        return new R([{
            route: 'lolomo',
            get: function() {
                return {
                    path: ['lolomo'],
                    value: $ref('lolomos[123]')
                };
            }
        }, {
            route: 'lolomos[{keys:ids}][{integers:indices}]',
            get: function(alais) {
                var id = alais.ids[0];
                return Observable.
                    from(alais.indices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['lolomos', id, idx],
                                value: $ref(['listsById', idx])
                            };
                        }
                        return {
                            path: ['lolomos', id],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'lolomos[{keys:ids}].length',
            get: function(alias) {
                var id = alias.ids[0];
                return {
                    path: ['lolomos', id, 'length'],
                    value: listsLength()
                };
            }
        }, {
            route: 'listsById[{integers:indices}].name',
            get: function(alais) {
                return Observable.
                    from(alais.indices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['listsById', idx, 'name'],
                                value: listsById[idx].name
                            };
                        }
                        return {
                            path: ['listsById', idx],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'listsById[{integers:indices}].invalidate',
            call: function(alias, args) {
                var indices = alias.indices;
                return indices.map(function(idx) {
                    return {
                        path: ['listsById', idx, 'name']
                    };
                });
            }
        }, {
            route: 'listsById[{integers:indices}].rating',
            get: function(alais) {
                return Observable.
                    from(alais.indices).
                    map(function(idx) {
                        if (listsById[idx]) {
                            return {
                                path: ['listsById', idx, 'rating'],
                                value: listsById[idx].rating
                            };
                        }
                        return {
                            path: ['listsById', idx],
                            value: $atom(undefined)
                        };
                    });
            }
        }, {
            route: 'lolomos[{keys:ids}].pvAdd',
            call: function(callPath, args) {
                var id = callPath.ids[0];
                var idx = addToList(args[0]);
                return {
                    path: ['lolomos', id, idx],
                    value: $ref(['listsById', idx])
                };
            }

        }, {
            route: 'lolomos[{keys:ids}].jsongAdd',
            call: function(callPath, args) {
                var id = callPath.ids[0];
                var idx = addToList(args[0]);
                var lolomos = {};
                lolomos[id] = {};
                lolomos[id][idx] = $ref(['listsById', idx]);
                return {
                    jsonGraph: {
                        lolomos: lolomos
                    },
                    paths: [['lolomos', id, idx]]
                };
            }
        }]);
    }
});
