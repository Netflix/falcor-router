var jsongMerge = require('./../../../src/cache/jsongMerge');
var pathValueMerge = require('./../../../src/cache/pathValueMerge');
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
describe('JSONG - Merge', function() {
    it('should write a simple path to the cache.', function() {

        var jsong = {
            jsong: {
                there: {
                    is: $atom('a value')
                }
            },
            paths: [['there', 'is']]
        };

        mergeTest(jsong);
    });
    it('should write a path with a reference to a value.', function() {
        var jsong = {
            jsong: {
                there: {
                    is: $ref('a.value')
                },
                a: {
                    value: $atom('was here')
                }
            },
            paths: [['there', 'is']]
        };
        mergeTest(jsong);
    });
    it('should write a path with a reference to a branch.', function() {

        var jsong = {
            jsong: {
                there: {
                    is: $ref('a')
                },
                a: {
                    value: $atom('was here')
                }
            },
            paths: [['there', 'is', 'value']]
        };

        mergeTest(jsong);
    });
    it('should write a path with a reference to a reference.', function() {
        var jsong = {
            jsong: {
                there: {
                    is: $ref('a')
                },
                a: $ref('value'),
                value: $atom('was here')
            },
            paths: [['there', 'is']]
        };

        mergeTest(jsong);
    });
    it('should get the set refs.', function() {
        var jsong = {
            jsong: {
                there: {
                    is: $ref('a')
                }
            },
            paths: [['there', 'is']]
        };
        var cache = {};
        var refs = jsongMerge(cache, jsong);
        expect(refs).to.deep.equals([{
            path: ['there', 'is'],
            value: ['a']
        }]);
    });
});

function mergeTest(jsong) {
    var cache = {
        there: {
            was: $atom('a value')
        }
    };
    var expected = _.merge(cache, jsong);
    jsongMerge(cache, jsong);
    expect(cache).to.deep.equals(expected);
}
