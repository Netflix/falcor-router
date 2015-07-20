var stripPath = require('./../../../src/operations/strip/stripPath');
var expect = require('chai').expect;
var Keys = require('./../../../src/Keys');

/**
 * normally i don't test internals but i think the merges
 * warrent internal testing.  The reason being is that the
 * merges are core to the product.  If i don't, i will have to
 * figure out where bugs are without much clarity into where they
 * are.
 */
describe('Strip Path', function() {
    describe('Fully Matched Paths', function() {
        it('should fully match a path with simple keys.', function() {
            var matchedPath = ['A', 'B', 'C'];
            var virtualPath = ['A', 'B', 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 'B', 'C'],
                []
            ]);
        });

        it('should fully match a path with simple keys and a virtual path with routedTokens.', function() {
            var matchedPath = ['A', 'B', 'C'];
            var virtualPath = ['A', getRoutedToken(Keys.keys), 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 'B', 'C'],
                []
            ]);
        });

        it('should fully match a path with array args.', function() {
            var matchedPath = ['A', ['B', 'D'], 'C'];
            var virtualPath = ['A', getRoutedToken(Keys.keys), 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', ['B', 'D'], 'C'],
                []
            ]);
        });

        it('should fully match a path with range args.', function() {
            var matchedPath = ['A', {from: 0, to: 5}, 'C'];
            var virtualPath = ['A', getRoutedToken(Keys.keys), 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', {from: 0, to: 5}, 'C'],
                []
            ]);
        });
    });

    describe('Partially Matched Paths', function() {
        it('should partially match a path with array keys.', function() {
            var matchedPath = ['A', ['B', 'D'], 'C'];
            var virtualPath = ['A', 'B', 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 'B', 'C'],
                [
                    ['A', 'D', 'C']
                ]
            ]);
        });

        it('should partially match a path with range.', function() {
            var matchedPath = ['A', {from: 0, to: 5}, 'C'];
            var virtualPath = ['A', 1, 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 1, 'C'],
                [
                    ['A', [{from: 0, to: 0}, {from: 2, to: 5}], 'C']
                ]
            ]);
        });

        it('should partially match a path with array range.', function() {
            var matchedPath = ['A', [{from: 0, to: 2}, {from: 5, to: 5}], 'C'];
            var virtualPath = ['A', 1, 'C'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 1, 'C'],
                [
                    ['A', [{from: 0, to: 0}, {from: 2, to: 2}, {from: 5, to: 5}], 'C']
                ]
            ]);
        });

        it('should test a multiple relative complement partial match.', function() {
            var matchedPath = [['A', 'B'], ['C', 'D'], ['E', 'F']];
            var virtualPath = ['A', 'C', 'E'];
            var out = stripPath(matchedPath, virtualPath);
            expect(out).to.deep.equals([
                ['A', 'C', 'E'],
                [
                    ['B', ['C', 'D'], ['E', 'F']],
                    ['A', 'D', ['E', 'F']],
                    ['A', 'C', 'F']
                ]
            ]);
        });
    });
});

function getRoutedToken(type, name) {
    return {
        type: type,
        named: Boolean(name),
        name: name
    };
}
