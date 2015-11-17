var R = require('../../../src/Router');
var $atom = require('../../../src/support/types').$atom;
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var Observable = require('rx').Observable;
var sinon = require('sinon');

// TODO: Determine if we will still materialized paths.
describe('Materialized Paths.', function() {
    xit('should validate routes that do not return all the paths asked for.', function(done) {
        var routes = [{
            route: 'one[{integers:ids}]',
            get: function(aliasMap) {
                return Observable.
                    returnValue({
                        path: ['one', 0],
                        value: $ref('two.be[956]')
                    });
            }
        }];
        var router = new R(routes);
        var obs = router.
            get([['one', [0, 1], 'summary']]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        one: {
                            0: $ref('two.be[956]'),
                            1: {
                                summary: {
                                    $type: $atom
                                }
                            }
                        },
                        two: {
                            be: {
                                956: {
                                    summary: {
                                        $type: $atom
                                    }
                                }
                            }
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    xit('should validate when no route is matched', function(done) {
        var routes = [];
        var router = new R(routes);
        var obs = router.
            get([['one', [0, 1], 'summary']]);
        var count = 0;
        obs.
            doAction(function(res) {
                expect(res).to.deep.equals({
                    jsonGraph: {
                        one: {
                            0: {
                                summary: {
                                    $type: $atom
                                }
                            },
                            1: {
                                summary: {
                                    $type: $atom
                                }
                            }
                        }
                    }
                });
                count++;
            }, noOp, function() {
                expect(count, 'expect onNext called 1 time.').to.equal(1);
            }).
            subscribe(noOp, done, done);
    });

    it('should never materialize (get).', function(done) {
        var routes = [{
            route: 'one[{integers}].summary',
            get: function() {
                return Observable.empty();
            }
        }];
        var router = new R(routes);
        var obs = router.
            get([['one', [0, 1], 'summary']]);
        var onNext = sinon.spy();

        obs.
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce, 'expect onNext called 1 time.').to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: { }
                });
            }).
            subscribe(noOp, done, done);
    });

    it('should never materialize (set).', function(done) {
        var routes = [{
            route: 'one[{integers}].summary',
            set: function() {
                return Observable.empty();
            }
        }];
        var router = new R(routes);
        var obs = router.
            set({
                jsonGraph: {
                    one: {
                        0: {
                            summary: 'yeah!'
                        }
                    }
                },
                paths: [
                    ['one', 0, 'summary']
                ]
            });
        var onNext = sinon.spy();

        obs.
            doAction(onNext, noOp, function() {
                expect(onNext.calledOnce, 'expect onNext called 1 time.').to.be.ok;
                expect(onNext.getCall(0).args[0]).to.deep.equals({
                    jsonGraph: { }
                });
            }).
            subscribe(noOp, done, done);
    });
});
