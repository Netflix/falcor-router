var TestRunner = require('./../TestRunner');
var R = require('../../bin/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;

describe('Integers', function() {
    it('should match integers for videos with int keys passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', 1, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].Summary]).
            subscribe(noOp, done, done);
    });

    it('should match integers for videos with array of ints passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1, 2], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', [1, 2], 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].Summary, Expected().Videos[2].Summary]).
            subscribe(noOp, done, done);
    });

    it('should match integers for videos with range passed in.', function(done) {
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [0, 1], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', {to: 1}, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[0].Summary, Expected().Videos[1].Summary]).
            subscribe(noOp, done, done);
    });
});