var TestRunner = require('./TestRunner');
var R = require('../bin/Router');
var Routes = require('./data');
var Expected = require('./data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;


describe('Router', function() {
    it('should execute a simple route matching.', function(done) {
        var router = new R(Routes().Videos.Summary());
        var obs = router.
            get([['videos', 'summary']]);
        
        TestRunner.
            run(obs, [Expected().Videos.Summary]).
            subscribe(noOp, done, done);
    });
    
    it('should match integers for videos with int keys passed in.', function(done) {
        debugger;
        var router = new R(
            Routes().Videos.Integers.Summary(function(pathSet) {
                expect(pathSet).to.deep.equals(['videos', [1], 'summary']);
            })
        );
        var obs = router.
            get([['videos', 1, 'summary']]);

        TestRunner.
            run(obs, [Expected().Videos[1].Summary]).
            subscribe(noOp, done, done);
    });
});