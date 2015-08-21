var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var Observable = require('rx').Observable;
var sinon = require('sinon');

describe('Get', function() {

    it('should execute a simple route matching.', function(done) {
        var router = new R(Routes().Videos.Summary());
        var obs = router.
            get([['videos', 'summary']]);
        var called = false;
        obs.subscribe(function(res) {
            expect(res).to.deep.equals(Expected().Videos.Summary);
            called = true;
        }, done, function() {
            expect(called, 'expect onNext called 1 time.').to.equal(true);
            done();
        });
    });

    it('should not return empty atoms for a zero path value', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.return({
                        value: 0,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
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
                    return Observable.return({
                        value: null,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
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

    it('should not return empty atoms for a false path value', function(done) {

        var router = new R([{
                route: 'videos.falsey',
                get: function(path) {
                    return Observable.return({
                        value: false,
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
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
                    return Observable.return({
                        value: '',
                        path: ['videos', 'falsey']
                    });
                }
        }]);

        var onNext = sinon.spy();

        router.get([['videos', 'falsey']]).
            doAction(onNext).
            doAction(noOp, noOp, function() {
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
            doAction(onNext).
            doAction(noOp, noOp, function() {
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
            doAction(function(x) {
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

    it('should grab a reference.', function(done) {
        var called = 0;
        var router = getPrecedenceRouter();
        router.
            get([['lists', 'abc', 0]]).
            doAction(function(x) {
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
            doAction(function (res) {
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
        var called = false;
        obs.subscribe(function (res) {
            expect(res).to.deep.equals({
                jsonGraph: {videos: {1: {title: {$type: 'atom'}}}}
            });
            called = true;
        }, done, function () {
            expect(called, 'expect onNext called 1 time.').to.equal(true);
            done();
        });
    });

    function getPrecedenceRouter(onTitle, onRating) {
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
        }]);
    }
});
