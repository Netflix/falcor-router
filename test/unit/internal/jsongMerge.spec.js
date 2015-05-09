var jsongMerge = require('./../../../src/merge/jsongMerge');
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
describe('JSONG - Merge', function() {
    it.only('should write a simple path to the cache.', function() {
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

        var jsong = {
            jsong: {
                there: {
                    is: $atom('a value')
                }
            },
            paths: [['there', 'is']]
        };

        jsongMerge(cache, jsong);
        expect(cache).to.deep.equals(expected);
    });
});
