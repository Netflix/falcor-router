var stripFromRange = require('./../../../src/operations/strip/stripFromRange');
var expect = require('chai').expect;
var Keys = require('./../../../src/Keys');

describe('stripFromRange', function() {
    it('should split into 1 range when first arg === from', function() {
        var arg = 0;
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[0], [{from: 1, to: 4}]]);
    });
    it('should split into 1 range when first arg === to', function() {
        var arg = 4;
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[4], [{from: 0, to: 3}]]);
    });
    it('should split into 2 range when from < firstArg < to', function() {
        var arg = 2;
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[2], [
            {from: 0, to: 1},
            {from: 3, to: 4}
        ]]);
    });
    it('should pass in a string number as first argument.', function() {
        var arg = '2';
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[2], [
            {from: 0, to: 1},
            {from: 3, to: 4}
        ]]);
    });
    it('should pass in a routed token as the first argument.', function() {
        var arg = getRoutedToken(Keys.keys);
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[0, 1, 2, 3, 4], []]);
    });
    it('should pass in an array with mixed keys.', function() {
        var arg = [0, 'one', 2, 'three', 4];
        var range = {from: 0, to: 4};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[0, 2, 4], [{from: 1, to: 1}, {from: 3, to: 3}]]);
    });
    it('should return nothing when 1 length range is stripped.', function() {
        var arg = 0;
        var range = {from: 0, to: 0};
        var out = stripFromRange(arg, range);

        expect(out).to.deep.equals([[0], []]);
    });
});

function getRoutedToken(type, name) {
    return {
        type: type,
        named: Boolean(name),
        name: name
    };
}
