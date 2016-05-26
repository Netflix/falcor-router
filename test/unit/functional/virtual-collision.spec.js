var R = require('../../../src/Router');
var errors = require('../../../src/exceptions');
var chai = require('chai');
var expect = chai.expect;

describe('Virtual Collisions', function() {
    it('should collide when two paths have the exact same virtual path.', function() {
        expect(function() {
            new R([{
                route: 'videos[{integers}].summary',
                get: function() {}
            }, {
                route: 'videos[{integers}].summary',
                get: function() {}
            }]);
        }).to.throw(errors.routeWithSamePrecedence, 'videos,integers,summary');
    });
    it('should not collide when two paths have the exact same virtual path but different ops.', function() {
        expect(function() {
            new R([{
                route: 'videos[{integers}].summary',
                get: function() {}
            }, {
                route: 'videos[{integers}].summary',
                set: function() {}
            }]);
        }).to.not.throw();
    });
    it('should not collide when two pathSets have the exact same virtual path but different ops.', function() {
        expect(function() {
            new R([{
                route: 'videos[{integers}]["summary", "title", "rating"]',
                get: function() {}
            }, {
                route: 'videos[{integers}].rating',
                set: function() {}
            }]);
        }).to.not.throw();
    });
    it('should collide when two paths have the same virtual path precedence.', function() {
        expect(function() {
            new R([{
                route: 'videos[{integers}].summary',
                get: function() {}
            }, {
                route: 'videos[{ranges}].summary',
                get: function() {}
            }]);
        }).to.throw(errors.routeWithSamePrecedence, 'videos,ranges,summary');
    });
});
