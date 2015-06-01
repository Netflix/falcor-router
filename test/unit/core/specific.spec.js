var TestRunner = require('./../../TestRunner');
var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var $atom = falcor.Model.atom;
var $error = falcor.Model.error;
var Observable = require('rx').Observable;

describe('Specific', function() {
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

    it('should validate that optimizedPathSets strips out already found data.', function(done) {
        this.timeout(10000);
        var serviceCalls = 0;
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
        var obs = router.
            get([['lists', [0, 1], 'summary']]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsong: {
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
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
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
                    jsong: {
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
        var title = 0;
        var rating = 0;
        var called = 0;
        var router = getPrecedenceRouter();
        router.
            get([['lists', 'abc', 0]]).
            doAction(function(x) {
                expect(x).to.deep.equals({
                    jsong: {
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
