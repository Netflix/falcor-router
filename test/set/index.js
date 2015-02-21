var TestRunner = require('./../TestRunner');
var Observable = require('rx').Observable;
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;

describe('Set', function() {
    it('should set comment message.', function(done) {
        var router = new R(Routes().Cache.Comments.Message);
        var get = Observable.defer(function() {
            return router.
                get([['comments', 'abc']]);
        });
        var set = router.
            set({
                jsong: {
                    comments: {
                        abc: {
                            hello: ', World!',
                            $type: 'leaf'
                        }
                    }
                },
                paths: [['comments', 'abc']]
            });

        get.
            doAction(function(x) {
                expect(x.jsong).to.deep.equals({
                    comments: {
                        abc: {
                            $type: 'leaf',
                            $size: 50,
                            message: 'hello abc'
                        }
                    }
                });
            }).
            flatMap(function() {
                return set;
            }).
            flatMap(function() {
                return get;
            }).
            doAction(function(x) {
                expect(x.jsong).to.deep.equals({
                    comments: {
                        abc: {
                            hello: ', World!',
                            $type: 'leaf',
                            $size: 51
                        }
                    }
                });
            }).
            subscribe(noOp, done, done);
    });
    it('should execute a get when the length of the matched path is less then the requested path.', function(done) {
        var router = new R(Routes().Videos.State.Integers());
        var count = 0;
        var obs = router.
            set({
                jsong: {
                    videos: {
                        state: {
                            0: {
                                status: 'not gonna do it'
                            }
                        }
                    }
                },
                paths: [['videos', 'state', 0, 'status']]
            });

        TestRunner.
            run(obs, [Expected().Videos.state[0]]).
            subscribe(noOp, done, done);
    });
});
