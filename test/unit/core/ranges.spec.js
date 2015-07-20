var TestRunner = require('./../../TestRunner');
var R = require('../../../src/Router');
var Routes = require('./../../data');
var Expected = require('./../../data/expected');
var noOp = function() {};

describe('Ranges', function() {
    it('should match integers for videos with int keys passed in.', function(done) {
        var router = new R(
            Routes().Videos.Ranges.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [{from: 1, to: 1}], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', 1, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].summary]).
            subscribe(noOp, done, done);
    });

    it('should match ranges for videos with array of ints passed in.', function(done) {
        var router = new R(
            Routes().Videos.Ranges.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [{from:1, to:2}], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', [1, 2], 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].summary, Expected().Videos[2].summary]).
            subscribe(noOp, done, done);
    });

    it('should match ranges for videos with array of ints passed in that are not adjacent.', function(done) {
        var router = new R(
            Routes().Videos.Ranges.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [{from:0, to:0}, {from:2, to:2}], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', [0, 2], 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[0].summary, Expected().Videos[2].summary]).
            subscribe(noOp, done, done);
    });

    it('should match ranges with a range passed in.', function(done) {
        var router = new R(
            Routes().Videos.Ranges.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [{from:0, to:2}], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', {from: 0, to: 2}, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[0].summary, Expected().Videos[1].summary, Expected().Videos[2].summary]).
            subscribe(noOp, done, done);
    });

    it('should match ranges as last key.', function(done) {
        var router = new R(
            Routes().Videos.State.Ranges(function(pathSet) {
                TestRunner.comparePath(['videos', 'state', [{from:0, to:0}]], pathSet);
            })
        );
        var obs = router.
            get([['videos', 'state', 0]]);

        TestRunner.
            run(obs, [Expected().Videos.state[0]]).
            subscribe(noOp, done, done);
    });
});

