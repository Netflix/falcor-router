var toPaths = require('./../../../src/operations/collapse/toPaths');
var toTree = require('./../../../src/operations/collapse/toTree');
var expect = require('chai').expect;

describe('toPaths', function() {
    it('should explode a simplePath.', function() {
        var out = ['one', 'two'];
        var input = {one: {two: null}};

        expect(toPaths(input)).to.deep.equals([out]);
    });

    it('should explode a complex.', function() {
        var input = {one: {two: null, three: null}};
        var out = ['one', ['three', 'two']];
        var output = toPaths(input);
        output[0][1].sort();

        expect(output).to.deep.equals([out]);
    });

    it('should explode a set of complex and simple paths.', function() {
        var out = [
            ['one', ['three', 'two']],
            ['one', {from: 0, to: 3}, 'summary']
        ];
        var input = {
            one: {
                0: { summary: null },
                1: { summary: null },
                2: { summary: null },
                3: { summary: null },
                three: null,
                two: null
            }
        };

        var output = toPaths(input);
        if (!Array.isArray(output[0][1])) {
            var tmp = output[0];
            output[0] = output[1];
            output[1] = tmp;
        }

        output[0][1].sort();

        expect(output).to.deep.equals(out);
    });

    it('should translate between toPaths and toTrees', function() {
        var input = {
            one: {
                0: { summary: null },
                1: { summary: null },
                2: { summary: null },
                3: { summary: null },
                three: null,
                two: null
            }
        };

        expect(toTree(toPaths(input))).to.deep.equals(input);
    });
});
