var pathValueMerge = require('./../../../src/cache/pathValueMerge');
var Model = require('falcor').Model;
var $ref = Model.ref;
var $atom = Model.atom;
var expect = require('chai').expect;

/**
 * normally i don't test internals but i think the merges
 * warrent internal testing.  The reason being is that the
 * merges are core to the product.  If i don't, i will have to
 * figure out where bugs are without much clarity into where they
 * are.
 */
describe('PathValue - Merge', function() {
    it('should write a simple path to the cache with pathValue.', function() {
        var expected = {
            there: {
                was: $atom('a value'),
                is: $atom('a value')
            }
        };

        var cache = {
            there: {
                was: $atom('a value')
            }
        };

        var pV = {
            path: ['there', 'is'],
            value: $atom('a value')
        };

        pathValueMerge(cache, pV);
        expect(cache).is.deep.equals(expected);
    });
    it('should write a complex leaf path to the cache with pathValue.', function() {
        var expected = {
            there: {
                was: $atom('a value'),
                is: $atom('a value')
            }
        };

        var cache = {
        };

        var pV = {
            path: ['there', ['is', 'was']],
            value: $atom('a value')
        };

        pathValueMerge(cache, pV);
        expect(cache).is.deep.equals(expected);
    });
    it('should write a complex branch path to the cache with pathValue.', function() {
        var expected = {
            there: {
                be: $atom('a value')
            },
            could: {
                be: $atom('a value')
            }
        };

        var cache = {
        };

        var pV = {
            path: [['could', 'there'], 'be'],
            value: $atom('a value')
        };

        pathValueMerge(cache, pV);
        expect(cache).is.deep.equals(expected);
    });
    it('should get the set refs.', function() {
        var pV = {
            path: ['there', 'is'],
            value: $ref('a')
        };
        var cache = {};
        var out = pathValueMerge(cache, pV);
        expect(out).is.deep.equals({
            references: [{
                path: ['there', 'is'],
                value: ['a']
            }],
            values: [],
            invalidations: []
        });
    });

    it('should get the set values.', function() {
        var cache = {
            jsonGraph: {
                there: {
                    is: $ref('a')
                }
            }
        };
        var pVs = {
            path: ['there', 'was', 'value'],
            value: 5
        };
        var out = pathValueMerge(cache, pVs);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'was', 'value'],
                value: 5
            }],
            references: [],
            invalidations: []
        });
    });

    it('should get a pathSet of values.', function() {
        var cache = {
            jsonGraph: {
                there: {
                    is: $ref('a')
                }
            }
        };
        var pVs = {
            path: ['there', 'was', ['value', 'v2', 'v3']],
            value: 5
        };
        var out = pathValueMerge(cache.jsonGraph, pVs);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'was', ['value', 'v2', 'v3']],
                value: 5
            }],
            references: [],
            invalidations: []
        });
        expect(cache).to.deep.equals({
            jsonGraph: {
                there: {
                    is: $ref('a'),
                    was: {
                        value: 5,
                        v2: 5,
                        v3: 5
                    }
                }
            }
        });
    });
});
