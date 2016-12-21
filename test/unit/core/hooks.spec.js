var chai = require('chai');
var expect = chai.expect;
var R = require('../../../src/Router');

describe('hooks', function () {
    it('should accept an error hook', function () {
        var callArgs = null;
        var callCount = 0;
        var callContext = null;

        var router = new R([], {
            hooks: {
                error: function () {
                  callArgs = Array.prototype.slice.call(arguments, 0);
                  callCount++;
                  callContext = this;
                }
            }
        });

        router._errorHook('Scuba', 'Steve', 'McGuire');

        expect(callArgs).to.deep.equal(['Scuba', 'Steve', 'McGuire']);
        expect(callCount).to.equal(1);
        expect(callContext).to.equal(router);
    });
});
