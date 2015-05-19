var TestRunner = require('./../../TestRunner');
var R = require('../../../src/Router');
var errors = require('../../../src/exceptions');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var Observable = require('rx').Observable;

describe('Virtual Collisions', function() {
    it('should collide when two paths have the exact same virtual path.', function() {
        try {
            new R([{
                route: 'videos[{integers}].summary',
                get: function() {}
            }, {
                route: 'videos[{integers}].summary',
                get: function() {}
            }]);
        } catch(e) {
            var str = ['videos', 'integers', 'summary'];
            expect(e.message).to.equal(errors.routeWithSamePath + ' ' + JSON.stringify(str));
        }
    });
    it('should collide when two paths have the same virtual path precedence.', function() {
        try {
            new R([{
                route: 'videos[{integers}].summary',
                get: function() {}
            }, {
                route: 'videos[{ranges}].summary',
                get: function() {}
            }]);
        } catch(e) {
            expect(e.message).to.equal(errors.routeWithSamePrecedence);
        }
    });
});
