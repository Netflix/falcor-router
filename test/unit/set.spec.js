var TestRunner = require('./../TestRunner');
var Observable = require('rx').Observable;
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;

describe('Set', function() {
    it.only('should not perform a set, just a get.', function(done) {
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
