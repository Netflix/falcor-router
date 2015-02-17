var TestRunner = require('./TestRunner');
var R = require('../bin/Router');
var Routes = require('./data');
var Expected = require('./data/expected');
var noOp = function() {};


describe('Router', function() {
    it('should execute a simple route matching.', function(done) {
        var router = new R(Routes().Videos.Summary);
        var obs = router.
            get([['videos', 'summary']]);
        
        TestRunner.
            run(obs, [Expected().Videos.Summary]).
            subscribe(noOp, done, done);
    });
});