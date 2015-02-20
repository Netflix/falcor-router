var TestRunner = require('./../TestRunner');
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;

describe('Keys', function() {
    it('should match integers for videos with int keys passed in.', function(done) {
        var router = new R(
            Routes().Videos.Keys.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', 1, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].Summary]).
            subscribe(noOp, done, done);
    });
    
    it('should match keys.', function(done) {
        var router = new R(
            Routes().Videos.Keys.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', ['someKey'], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', 'someKey', 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos.someKey.Summary]).
            subscribe(noOp, done, done);
    });

    it('should match array of keys.', function(done) {
        var router = new R(
            Routes().Videos.Keys.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [1, 'someKey'], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', [1, 'someKey'], 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].Summary, Expected().Videos.someKey.Summary]).
            subscribe(noOp, done, done);
    });

    it('should match range.', function(done) {
        var router = new R(
            Routes().Videos.Keys.Summary(function(pathSet) {
                TestRunner.comparePath(['videos', [0, 1, 2], 'summary'], pathSet);
            })
        );
        var obs = router.
            get([['videos', {to: 2}, 'summary']]);

        TestRunner.
            run(obs, [
                Expected().Videos[0].Summary,
                Expected().Videos[1].Summary,
                Expected().Videos[2].Summary
            ]).
            subscribe(noOp, done, done);
    });
    it('should match keys as last key.', function(done) {
        var router = new R(
            Routes().Videos.State.Keys(function(pathSet) {
                TestRunner.comparePath(['videos', 'state', ['specificKey']], pathSet);
            })
        );
        var obs = router.
            get([['videos', 'state', 'specificKey']]);

        TestRunner.
            run(obs, [Expected().Videos.state.specificKey]).
            subscribe(noOp, done, done);
    });
});

