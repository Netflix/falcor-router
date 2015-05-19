var TestRunner = require('./../TestRunner');
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
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

    it('should ensure that collapse is being ran.', function(done) {
        var videos = Routes().Videos.Integers.Summary(function(path) {
            expect(path.concat()).to.deep.equal(['videos', [0, 1], 'summary']);
        });
        var genreLists = Routes().Genrelists.Integers(function(incomingPaths) {
            expect(incomingPaths.concat()).to.deep.equal(['genreLists', [{from: 0, to: 1}]]);
        });
        var router = new R(videos.concat(genreLists));
        var obs = router.
            get([['genreLists', [0, 1], 'summary']]);
        var called = false;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsong: {
                        genreLists: {
                            0: $ref('videos[0]'),
                            1: $ref('videos[1]')
                        },
                        videos: {
                            0: {
                                summary: $atom({title: 'Some Movie 0'})
                            },
                            1: {
                                summary: $atom({title: 'Some Movie 1'})
                            }
                        }
                    }
                });
                called = true;
            }, noOp, function() {
                expect(called, 'expect onNext called 1 time.').to.equal(true);
            }).
            subscribe(noOp, done, done);
    });

    it('should validate that paths are ran in parallel, not sequentially.', function(done) {
        this.timeout(10000);
        var calls;
        var serviceCalls = 0;
        var testedTwo = false;
        function called(res) {
            if (!calls) {
                calls = [];
            }
            calls[calls.length] = res;
            serviceCalls++;
            process.nextTick(function() {
                if (calls.length === 0) {
                    return;
                }

                expect(serviceCalls).to.equal(2);
                expect(calls.length).to.equal(2);
                calls.length = 0;
                testedTwo = true;
            });
        }
        var routes = [{
            route: 'one[{integers:ids}]',
            get: function(aliasMap) {
                return Observable.
                    from(aliasMap.ids).
                    delay(100).
                    map(function(id) {
                        if (id === 0) {
                            return {
                                path: ['one', id],
                                value: $ref('two.be[956]')
                            };
                        }
                        return {
                            path: ['one', id],
                            value: $ref('three.four[111]')
                        };
                    });
            }
        }, {
            route: 'two.be[{integers:ids}].summary',
            get: function(aliasMap) {
                called(1);
                return Observable.
                    from(aliasMap.ids).
                    delay(2000).
                    map(function(id) {
                        return {
                            path: ['two', 'be', id, 'summary'],
                            value: 'hello world'
                        };
                    });
            }
        }, {
            route: 'three.four[{integers:ids}].summary',
            get: function(aliasMap) {
                called(2);
                return Observable.
                    from(aliasMap.ids).
                    delay(2000).
                    map(function(id) {
                        return {
                            path: ['three', 'four', id, 'summary'],
                            value: 'hello saturn'
                        };
                    });
            }
        }];
        var router = new R(routes);
        var obs = router.
            get([['one', [0, 1], 'summary']]);
        var count = 0;
        var time = Date.now();
        obs.
            doAction(function(res) {
                var nextTime = Date.now();
                expect(nextTime - time >= 4000).to.equal(false);
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
                expect(testedTwo, 'process.nextTick').to.equal(true);
            }).
            subscribe(noOp, done, done);
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
                    });
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

    it('should return an error for the pathSet if unauthorized, sync', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) { return Observable.returnValue(5); },
            authorize: function() { return false; }
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
                            0: $error({message: 'unauthorized', exception: true}),
                            1: $error({message: 'unauthorized', exception: true})
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should return an error for the pathSet if unauthorized, async', function(done) {
        var routes = [{
            route: 'lists[{keys:ids}]',
            get: function(aliasMap) { return Observable.returnValue(5); },
            authorize: function() { return Observable.of(false).delay(100); }
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
                            0: $error({message: 'unauthorized', exception: true}),
                            1: $error({message: 'unauthorized', exception: true})
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });
});
