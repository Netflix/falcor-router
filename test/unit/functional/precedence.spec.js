var R = require('../../../src/Router');
var noOp = function() {};
var chai = require('chai');
var expect = chai.expect;
var Observable = require('../../../src/RouterRx').Observable;
var sinon = require('sinon');

describe('Precedence Matching', function() {
    it('should properly precedence match with different lengths.', function(done) {
        var shortGet = sinon.spy(function() {
            return Observable.empty();
        });
        var longerGet = sinon.spy(function() {
            return Observable.empty();
        });
        var router = new R([{
            route: 'get[{integers}][{keys}]',
            get: shortGet
        }, {
            route: 'get[{integers}][{keys}][{keys}]',
            get: longerGet
        }]);

        router.
            get([['get', 11, 'six']]).
            do(noOp, noOp, function() {
                expect(longerGet.callCount).to.equals(0);
                expect(shortGet.callCount).to.equals(1);
            }).
            subscribe(noOp, done, done);
    });
});
