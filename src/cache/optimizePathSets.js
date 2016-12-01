var iterateKeySet = require('falcor-path-utils').iterateKeySet;
var catAndSlice = require('./../support/catAndSlice');
var $types = require('./../support/types');
var $ref = $types.$ref;
var $refset = $types.$refset;
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
module.exports = function optimizePathSets(cache, paths, maxRefFollow) {
    var optimized = [];
    paths.forEach(function(p) {
        optimizePathSet(cache, cache, p, 0, optimized, [], maxRefFollow);
    });

    return optimized;
};


/**
 * optimizes one pathSet at a time.
 */
function optimizePathSet(cache, cacheRoot, pathSet,
                         depth, out, optimizedPath, maxRefFollow) {

    // at missing, report optimized path.
    if (cache === undefined) {
        out[out.length] = catAndSlice(optimizedPath, pathSet, depth);
        return;
    }

    var typeofCache = cache === null ? 'undefined' : typeof cache;
    var type = typeofCache !== 'object' ? undefined : cache.$type;

    // all other sentinels are short circuited.
    // Or we found a primitive (which includes null)
    if (typeofCache !== 'object' || (type && !(
        type === $ref || type === $refset))) {
        return;
    }

    // If the reference is the last item in the path then do not
    // continue to search it.
    if ((type === $ref || type === $refset) && depth === pathSet.length) {
        return;
    }

    var keySet = pathSet[depth];
    var nextDepth = depth + 1;
    var isBranchKey = nextDepth < pathSet.length;
    var iteratorNote = {};
    var key, next, nextOptimized;

    key = iterateKeySet(keySet, iteratorNote);
    do {
        next = cache[key];
        type = next && next.$type;
        var optimizedPathLength = optimizedPath.length;
        if (key !== null) {
            optimizedPath[optimizedPathLength] = key;
        }

        if (isBranchKey && type === $refset) {
            nextOptimized = [];
            var refsetPath = catAndSlice(next.value, pathSet, nextDepth);
            optimizePathSet(cacheRoot, cacheRoot, refsetPath, 0,
                            out, nextOptimized, maxRefFollow);
            optimizedPath.length = optimizedPathLength;
        } else {
            if (isBranchKey && type === $ref) {
                var refResults =
                    followReference(cacheRoot, next.value, maxRefFollow);
                next = refResults[0];

                // `followReference` clones the refPath before returning it.
                nextOptimized = refResults[1];
            } else {
                nextOptimized = optimizedPath;
            }

            optimizePathSet(next, cacheRoot, pathSet, nextDepth,
                            out, nextOptimized, maxRefFollow);
            optimizedPath.length = optimizedPathLength;
        }

        if (!iteratorNote.done) {
            key = iterateKeySet(keySet, iteratorNote);
        }
    } while (!iteratorNote.done);
}

