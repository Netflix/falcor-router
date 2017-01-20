var jsongMerge = require('./../../../src/cache/jsongMerge');
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
            jsonGraph: {
                there: {
                    is: $atom('a value')
                }
            },
            paths: [['there', 'is']]
        };

        var out = mergeTest(jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is'],
                value: $atom('a value')
            }],
            references: []
        });
    });

    it('should write a falsey number to the cache.', function() {

        var jsong = {
            jsonGraph: {
                there: {
                    is: 0
                }
            },
            paths: [['there', 'is']]
        };

        var out = mergeTest(jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is'],
                value: 0
            }],
            references: []
        });
    });

    it('should write a falsey string to the cache.', function() {

        var jsong = {
            jsonGraph: {
                there: {
                    is: ''
                }
            },
            paths: [['there', 'is']]
        };

        var out = mergeTest(jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is'],
                value: ''
            }],
            references: []
        });
    });

    it('should write a false boolean to the cache.', function() {

        var jsong = {
            jsonGraph: {
                there: {
                    is: false
                }
            },
            paths: [['there', 'is']]
        };

        var out = mergeTest(jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is'],
                value: false
            }],
            references: []
        });
    });

    it('should write a null to the cache.', function() {

        var jsong = {
            jsonGraph: {
                there: {
                    is: null
                }
            },
            paths: [['there', 'is']]
        };

        var out = mergeTest(jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is'],
                value: null
            }],
            references: []
        });
    });

    it('should write a path with a reference to a value.', function() {
        var jsong = {
            jsonGraph: {
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
            jsonGraph: {
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
            jsonGraph: {
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
            jsonGraph: {
                there: {
                    is: $ref('a')
                }
            },
            paths: [['there', 'is']]
        };
        var cache = {};
        var out = jsongMerge(cache, jsong);
        expect(out).to.deep.equals({
            values: [],
            references: [{
                path: ['there', 'is'],
                value: ['a']
            }]
        });
    });

    it('should get the set values and refs.', function() {
        var jsong = {
            jsonGraph: {
                there: {
                    is: $ref('a'),
                    was: $ref('b')
                },
                a: {
                    value: 5
                }
            },
            paths: [
                ['there', 'is', 'value'],
                ['there', 'was']
            ]
        };
        var cache = {};
        var out = jsongMerge(cache, jsong);
        expect(out).to.deep.equals({
            values: [{
                path: ['there', 'is', 'value'],
                value: 5
            }],
            references: [{
                path: ['there', 'was'],
                value: ['b']
            }]
        });
    });

    it('should fire the router pathError hook if $type:"error" is found while walking', function () {
        var jsong = {
            jsonGraph: {
                this: {
                    is: {
                        deep: {
                            yo: { $type: 'error', value: { message: 'lol error' } }
                        }
                    }
                }
            },
            paths: [['this', 'is', 'deep', 'yo']]
        };
        var callArgs = null;
        var callCount = 0;
        var mockRouter = {
            _pathErrorHook: function () {
                callCount++;
                callArgs = Array.prototype.slice.call(arguments);
            }
        }
        var cache = {};
        var out = jsongMerge(cache, jsong, mockRouter);
        expect(out).to.deep.equal({
            values: [{
                path: ['this', 'is', 'deep', 'yo'],
                value: { $type: 'error', value: { message: 'lol error' } }
            }],
            references: []
        });
        expect(callArgs).to.deep.equals([
            {
                path: ['this', 'is', 'deep', 'yo'],
                value : {
                    $type: 'error', value: { message: 'lol error'}
                }
            }
        ]);
        expect(callCount).to.equals(1);
    });
});

function mergeTest(jsong) {
    var cache = {
        there: {
            was: $atom('a value')
        }
    };
    var expected = _.merge(cache, jsong.jsonGraph);
    var out = jsongMerge(cache, jsong);
    expect(cache).to.deep.equals(expected);

    return out;
}
