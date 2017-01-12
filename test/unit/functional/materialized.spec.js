var R = require('../../../src/Router');
var $atom = require('../../../src/support/types').$atom;
var noOp = function() {};
var sinon = require('sinon');
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var Observable = require('../../../src/RouterRx').Observable;
var delay = require('rxjs/operator/delay').delay;

describe('Materialized Paths.', function() {
    function partialRouter() {
        return new R([{
            route: 'one[{integers:ids}]',
            get: function(aliasMap) {
                return delay.call(Observable.of({
                    path: ['one', 0],
                    value: $ref(['two', 'be', 956])
                }), 100);
            }
        }]);
    }
    describe('#get', function() {
        it('should validate routes that do not return all the paths asked for.', function(done) {
            var router = partialRouter();
            var onNext = sinon.spy();
            router.
                get([['one', [0, 1], 'summary']]).
                do(onNext, noOp, function() {
                    expect(onNext.calledOnce).to.be.ok;
                    expect(onNext.getCall(0).args[0]).to.deep.equals({
                        jsonGraph: {
                            one: {
                                0: $ref(['two', 'be', 956]),
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
                }).
                subscribe(noOp, done, done);
        });

        it('should validate when no route is matched', function(done) {
            var routes = [];
            var router = new R(routes);
            var onNext = sinon.spy();
            router.
                get([['one', [0, 1], 'summary']]).
                do(onNext, noOp, function() {
                    expect(onNext.calledOnce).to.be.ok;
                    expect(onNext.getCall(0).args[0]).to.deep.equals({
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
                }).
                subscribe(noOp, done, done);
        });
    });
});
