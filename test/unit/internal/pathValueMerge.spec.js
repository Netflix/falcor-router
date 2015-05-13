var pathValueMerge = require('./../../../src/merge/pathValueMerge');
var Model = require('falcor').Model;
var $ref = Model.ref;
var $atom = Model.atom;
var expect = require('chai').expect;
var _ = require('lodash');

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
        expect(cache).to.deep.equals(expected);
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
        expect(cache).to.deep.equals(expected);
    });
    it('should write a complex branch path to the cache with pathValue.', function() {
        var expected = {
            there: {
                be: $atom('a value'),
            },
            could: {
                be: $atom('a value'),
            }
        };

        var cache = {
        };

        var pV = {
            path: [['could', 'there'], 'be'],
            value: $atom('a value')
        };

        pathValueMerge(cache, pV);
        expect(cache).to.deep.equals(expected);
    });
});
