var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var pathValueMerge = require('./../../../src/cache/pathValueMerge');
var FalcorObservable = require('../../FalcorObservable');
var $atom = require('./../../../src/support/types').$atom;
var $ref = require('./../../../src/support/types').$ref;

describe('#set', function() {
    it('should return an empty Observable and just materialize values.', function(done) {
        var router = new R([]);
        var onUnhandledPaths = sinon.spy(function convert(paths) {
            return FalcorObservable.empty();
        });
        router.routeUnhandledPathsTo({set: onUnhandledPaths});

        var obs = router.
            set({
               jsonGraph: {
                   videos: {
                       summary: 5
                   }
               },
               paths: [
                   ['videos', 'summary']
               ]
            });
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: {$type: $atom}
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 5
                        }
                    },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });
    it('should call the routeUnhandledPathsTo when the route completely misses a route.', function(done) {
        var router = new R([]);
        var onUnhandledPaths = sinon.spy(function convert(jsonGraphEnv) {
            var returnValue = jsonGraphEnv.paths.reduce(function(jsonGraph, path) {
                pathValueMerge(jsonGraph.jsonGraph, {
                    path: path,
                    value: 'missing'
                });
                return jsonGraph;
            }, {jsonGraph: {}});

            return FalcorObservable.of(returnValue);
        });
        router.routeUnhandledPathsTo({set: onUnhandledPaths});

        var obs = router.
            set({
               jsonGraph: {
                   videos: {
                       summary: 5
                   }
               },
               paths: [
                   ['videos', 'summary']
               ]
            });
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 'missing'
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 5
                        }
                    },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should call the routeUnhandledPathsTo when the route partially misses a route.', function(done) {
        var router = new R([{
            route: 'videos.length',
            set: function() {
                return {
                    path: ['videos', 'length'],
                    value: 5
                };
            }
        }]);
        var onUnhandledPaths = sinon.spy(function convert(jsonGraphEnv) {
            var returnValue = jsonGraphEnv.paths.reduce(function(jsonGraph, path) {
                pathValueMerge(jsonGraph.jsonGraph, {
                    path: path,
                    value: 'missing'
                });
                return jsonGraph;
            }, {jsonGraph: {}});
            return FalcorObservable.of(returnValue);
        });
        router.routeUnhandledPathsTo({set: onUnhandledPaths});

        var obs = router.
            set({
               jsonGraph: {
                   videos: {
                       summary: 5,
                       length: 5
                   }
               },
               paths: [
                   ['videos', ['length', 'summary']]
               ]
            });
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 'missing',
                            length: 5
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        videos: {
                            summary: 5
                        }
                    },
                    paths: [
                        ['videos', 'summary']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should be able to send correctly constructed jsonGraph when set passes' +
       'through referencs.', function(done) {
        var router = new R([{
            route: 'videos.summary',
            set: function() {
                return {
                    path: ['videos', 'summary'],
                    value: 'boom'
                };
            }
        }, {
            route: 'lists[{integers:indices}]',
            get: function(pathSet) {
                var indices = pathSet.indices;

                return indices.map(function(idx) {
                    var group = 'videos';
                    if (idx === 1) {
                        group = 'unicorn';
                    }
                    else if (idx === 2) {
                        group = 'liger';
                    }
                    return {
                        path: ['lists', idx],
                        value: {$type: $ref, value: [group]}
                    };
                });
            }
        }]);
        var onUnhandledPaths = sinon.spy(function convert(jsonGraphEnv) {
            var unicorn = ['unicorn', 'summary'];
            var next = {jsonGraph: {}, paths: [unicorn]};
            pathValueMerge(next.jsonGraph, {
                path: unicorn,
                value: 'missing'
            });
            return FalcorObservable.of(next);
        });
        router.routeUnhandledPathsTo({set: onUnhandledPaths});

        var obs = router.
            set({
               jsonGraph: {
                   lists: {
                       0: {
                           summary: 'boom'
                       },
                       1: {
                           summary: 'goes'
                       },
                       2: {
                           summary: 'dinomite'
                       }
                   }
               },
               paths: [
                   ['lists', {to:2}, 'summary']
               ]
            });
        var onNext = sinon.spy();
        obs.
            do(onNext, noOp, function() {
                expect(onNext.calledOnce).to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        lists: {
                            0: {$type: $ref, value: ['videos']},
                            1: {$type: $ref, value: ['unicorn']},
                            2: {$type: $ref, value: ['liger']}
                        },
                        videos: {
                            summary: 'boom'
                        },
                        unicorn: {
                            summary: 'missing'
                        },
                        liger: {
                            summary: {$type: $atom}
                        }
                    }
                });
                expect(onUnhandledPaths.calledOnce).to.be.ok;
                expect(onUnhandledPaths.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: {
                        unicorn: {
                            summary: 'goes'
                        },
                        liger: {
                            summary: 'dinomite'
                        }
                    },
                    paths: [
                        [['liger', 'unicorn'], 'summary']
                    ]
                });
            }).
            subscribe(noOp, done, done);
    });
});
