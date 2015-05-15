var TestRunner = require('./../TestRunner');
var Observable = require('rx').Observable;
var R = require('../../src/Router');
var Routes = require('./../data');
var Expected = require('./../data/expected');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var falcor = require('falcor');
var $ref = falcor.Model.ref;

describe('Call', function() {
    xit('should perform a simple call.', function(done) {
        var called = 0;
        var router = new R([{
            route: 'videos[{integers:id}].rating',
            call: function(callPath, args) {
                ++called;
                debugger
            }
        }]);
        router.
            get([['videos', 1234, 'rating']], [5]).
            subscribe(noOp, done, function() {
                if (!did) {
                    expect(called).to.equals(1);
                    done();
                }
            });
    });
});
