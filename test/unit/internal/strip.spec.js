var strip = require('./../../../src/operations/strip/strip');
var expect = require('chai').expect;
var _ = require('lodash');
var Keys = require('./../../../src/Keys');

/**
 * normally i don't test internals but i think the merges
 * warrent internal testing.  The reason being is that the
 * merges are core to the product.  If i don't, i will have to
 * figure out where bugs are without much clarity into where they
 * are.
 */
describe('Strip', function() {
    require('./strip.fromArray.spec');
    require('./strip.fromRange.spec');

    it('should split into 1 range when virtualAtom === matchedAtom.from', function() {
        var arg = 0;
        var range = {from: 0, to: 4};
        var out = strip(range, arg);

        expect(out).to.deep.equals([[0], [{from: 1, to: 4}]]);
    });
    it('should split into 1 range when virtualAtom === matchedAtom.to', function() {
        var arg = 4;
        var range = {from: 0, to: 4};
        var out = strip(range, arg);

        expect(out).to.deep.equals([[4], [{from: 0, to: 3}]]);
    });
    it('should split into 1 range when matchedAtom.from < virtualAtom < matchedAtom.to', function() {
        var arg = 2;
        var range = {from: 0, to: 4};
        var out = strip(range, arg);

        expect(out).to.deep.equals([[2], [
            {from: 0, to: 1},
            {from: 3, to: 4}
        ]]);
    });
    it('should pass in a string number as virtualAtom.', function() {
        var arg = '2';
        var range = {from: 0, to: 4};
        var out = strip(range, arg);

        expect(out).to.deep.equals([[2], [
            {from: 0, to: 1},
            {from: 3, to: 4}
        ]]);
    });
    it('should pass in a routed token as virtualAtom.', function() {
        var arg = getRoutedToken(Keys.keys);
        var range = {from: 0, to: 4};
        var out = strip(range, arg);
        expect(out).to.deep.equals([{from: 0, to: 4}, []]);
    });
    it('should pass in an array with mixed keys.', function() {
        var arg = [0, 'one', 2, 'three', 4];
        var range = {from: 0, to: 4};
        var out = strip(range, arg);

        expect(out).to.deep.equals([[0, 2, 4], [{from: 1, to: 1}, {from: 3, to: 3}]]);
    });
    it('should return nothing when 1 length range is stripped.', function() {
        var arg = 0;
        var range = {from: 0, to: 0};
        var out = strip(range, arg);

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
