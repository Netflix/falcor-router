var strip = require('./../../../src/operations/strip/strip');
var expect = require('chai').expect;
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

        expect(out).to.deep.equals([0, [{from: 1, to: 4}]]);
    });
    it('should strip out all elements if keys used.', function() {
        var arg = getRoutedToken(Keys.keys);
        var array = ['one', 2, 'three'];
        var out = strip(array, arg);
        expect(out).to.deep.equals([['one', 2, 'three'], []]);
    });
    it('should match numeric tokens.', function() {
        var matchedAtom = 5;
        var virtualAtom = 5;
        var out = strip(matchedAtom, virtualAtom);
        expect(out).to.deep.equals([5, []]);
    });
    it('should match mismatched tokens.', function() {
        var matchedAtom = 5;
        var virtualAtom = '5';
        var out = strip(matchedAtom, virtualAtom);
        expect(out).to.deep.equals([5, []]);
    });
    it('should return an empty complement on any routed token with non matched object input.', function() {
        var matchedAtom = 5;
        var virtualAtom = getRoutedToken(Keys.keys);
        var out = strip(matchedAtom, virtualAtom);
        expect(out).to.deep.equals([5, []]);
    });
});

function getRoutedToken(type, name) {
    return {
        type: type,
        named: Boolean(name),
        name: name
    };
}
