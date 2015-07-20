var stripFromArray = require('./../../../src/operations/strip/stripFromArray');
var expect = require('chai').expect;
var Keys = require('./../../../src/Keys');

describe('stripFromArray', function() {
    it('should strip out all elements if keys used.', function() {
        var arg = getRoutedToken(Keys.keys);
        var array = ['one', 2, 'three'];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([['one', 2, 'three'], []]);
    });

    it('should strip just the element specified.', function() {
        var arg = 'one';
        var array = ['one', 2, 'three'];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([['one'], [2, 'three']]);
    });

    it('should strip the array with the range.', function() {
        var arg = {from: 0, to: 3};
        var array = ['one', 2, 'three'];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([[2], ['one', 'three']]);
    });

    it('should strip the array with an array of ranges.', function() {
        var arg = [{from: 0, to: 1}, {from: 2, to: 2}];
        var array = ['one', 2, 'three'];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([[2], ['one', 'three']]);
    });

    it('should strip out the values from intersecting ranges, removing a fully matched array.', function() {
        var arg = 2;
        var array = [{from: 0, to: 1}, {from: 2, to: 2}];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([[2], [{from: 0, to: 1}]]);
    });

    it('should strip out the values from intersecting ranges, splitting a partially matched array.', function() {
        var arg = 2;
        var array = [{from: 0, to: 3}];
        var out = stripFromArray(arg, array);
        expect(out).to.deep.equals([[2], [{from: 0, to: 1}, {from: 3, to: 3}]]);
    });
});

function getRoutedToken(type, name) {
    return {
        type: type,
        named: Boolean(name),
        name: name
    };
}
