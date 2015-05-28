var permuteKey = require('./../support/permuteKey');
var cloneArray = require('./../support/cloneArray');
var catAndSlice = require('./../support/catAndSlice');
var isArray = Array.isArray;
var $types = require('./../support/types');
var $ref = $types.$ref;
var followReference = require('./followReference');

/**
 * The fastest possible optimize of paths.
 *
 * What it does:
 * - Any atom short-circuit / found value will be removed from the path.
 * - All paths will be exploded which means that collapse will need to be
 *   ran afterwords.
 * - Any missing path will be optimized as much as possible.
 */
module.exports = function optimizePathSets(cache, paths) {
    var optimized = [];
    paths.forEach(function(p) {
        optimizePathSet(cache, cache, p, 0, optimized, []);
    });

    return optimized;
};


/**
 * optimizes one pathSet at a time.
 */
function optimizePathSet(cache, cacheRoot, pathSet, depth, out, optimizedPath) {

    // at missing, report optimized path.
    if (!cache) {
        out[out.length] = catAndSlice(optimizedPath, pathSet, depth);
        return;
    }

    // If the reference is the last item in the path then do not
    // continue to search it.
    if (cache.$type === $ref && depth === pathSet.length) {
        return;
    }

    // all other sentinels are short circuited.
    // Or we found a primitive.
    if (cache.$type && cache.$type !== $ref || typeof cache !== 'object') {
        return;
    }

    var keySet = pathSet[depth];
    var nextDepth = depth + 1;
    var isKeySet = typeof keySet === 'object';
    var memo, key, next, nextOptimized;

    if (keySet && isKeySet) {
        memo = {
            arrOffset: 0,
            isArray: isArray(keySet)
        };
        key = permuteKey(keySet, memo);
    } else {
        key = keySet;
        memo = false;
    }

    do {
        next = cache[key];
        var optimizedPathLength = optimizedPath.length;
        if (key !== null) {
            optimizedPath[optimizedPathLength] = key;
        }

        if (next && next.$type === $ref && nextDepth < pathSet.length) {
            var refResults = followReference(cacheRoot, next.value);
            next = refResults[0];

            // must clone to avoid the mutation from above destroying the cache.
            nextOptimized = cloneArray(refResults[1]);
        } else {
            nextOptimized = optimizedPath;
        }

        optimizePathSet(next, cacheRoot, pathSet, nextDepth, out, nextOptimized);
        optimizedPath.length = optimizedPathLength;

        if (memo && !memo.done) {
            key = permuteKey(keySet, memo);
        }
    } while (memo && !memo.done);
}

