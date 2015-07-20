var optimizePathSets = require('./../../../src/cache/optimizePathSets');
var Model = require('falcor').Model;
var $ref = Model.ref;
var $atom = Model.atom;
var expect = require('chai').expect;
var errors = require('./../../../src/exceptions');

/**
 * normally i don't test internals but i think the merges
 * warrent internal testing.  The reason being is that the
 * merges are core to the product.  If i don't, i will have to
 * figure out where bugs are without much clarity into where they
 * are.
 */
describe('optimizePathSets', function() {
    it('should optimize simple path.', function() {
        var cache = getCache();
        var paths = [['videosList', 3, 'summary']];

        var out = optimizePathSets(cache, paths);
        var expected = [['videos', 956, 'summary']];
        expect(out).to.deep.equal(expected);
    });

    it('should optimize a complex path.', function() {
        var cache = getCache();
        var paths = [['videosList', [0, 3], 'summary']];

        var out = optimizePathSets(cache, paths);
        var expected = [
            ['videosList', 0, 'summary'],
            ['videos', 956, 'summary']
        ];
        expect(out).to.deep.equal(expected);
    });

    it('should remove found paths', function() {
        var cache = getCache();
        var paths = [['videosList', [0, 3, 5], 'summary']];

        var out = optimizePathSets(cache, paths);
        var expected = [
            ['videosList', 0, 'summary'],
            ['videos', 956, 'summary']
        ];
        expect(out).to.deep.equal(expected);
    });

    it('should follow double references.', function() {
        var cache = getCache();
        var paths = [['videosList', 'double', 'summary']];

        var out = optimizePathSets(cache, paths);
        var expected = [
            ['videos', 956, 'summary']
        ];
        expect(out).to.deep.equal(expected);
    });

    it('should short circuit on ref.', function() {
        var cache = getCache();
        var paths = [['videosList', 'short', 'summary']];

        var out = optimizePathSets(cache, paths);
        var expected = [];
        expect(out).to.deep.equal(expected);
    });

    it('should throw.', function() {
        var cache = getCache();
        var paths = [['videosList', 'inner', 'summary']];

        var caught = false;
        try {
            optimizePathSets(cache, paths);
        } catch (e) {
            caught = true;
            expect(e.message).to.equals(errors.innerReferences);
        }
        expect(caught).to.equals(true);
    });
});

function getCache() {
    return {
        videosList: {
            3: $ref('videos[956]'),
            5: $ref('videos[5]'),
            double: $ref('videosList[3]'),
            short: $ref('videos[5].moreKeys'),
            inner: $ref('videosList[3].inner')
        },
        videos: {
            5: $atom('title')
        }
    };
}
