var R = require('../../../src/Router');
var tap = require('falcor-observable').tap;
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;
var circularReference = require('./../../../src/exceptions').circularReference;

describe('Error', function() {
    it('should throw an error when maxExpansion has been exceeded.', function(done) {
        var router = new R([{
            route: 'videos[{integers:ids}]',
            get: function (alias) {
                return {
                    path: ['videos', 1],
                    value: $ref('videos[1]')
                };
            }
        }]);
        var obs = router.get([["videos", 1, "title"]]);
        var err = false;
        obs.
            pipe(tap(noOp, function(e) {
            expect(e.message).to.equals(circularReference);
            err = true;
        })).
            subscribe(noOp, function(e) {
                if (err) {
                    return done();
                }
                return done(e);
            }, function() {
                done('should not of completed.');
            });
    });

});
