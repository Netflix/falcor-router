var R = require('../src/Router');
var $atom = require('./../src/support/types').$atom;
var chai = require('chai');
var expect = chai.expect;
describe('Router', function() {
    require('./unit');
    require('./integration');
    xit('should ask for a missing path.', function(done) {
        var router = new R([]);
        var obs = router.
            get([['videos', 'summary']]);
        var called = false;
        obs.subscribe(function(res) {
            expect(res).to.deep.equals({videos: {summary: {$type: 'atom'}}});
            called = true;
        }, done, function() {
            expect(called, 'expect onNext called 1 time.').to.equal(true);
            done();
        });
    });
});
