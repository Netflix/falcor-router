var Rx = require('rx');
var Observable = Rx.Observable;
var pluckHighestPrecedence = require('./pluckHighestPrecedence');
var runByPrecedence = require('./runByPrecedence');
var toPaths = require('./../operations/collapse/toPaths');
var toTree = require('./../operations/collapse/toTree');
var optimizePathSets = require('./../cache/optimizePathSets');
var mergeCacheAndGatherRefsAndInvalidations = require('./mergeCacheAndGatherRefsAndInvalidations');
var isArray = Array.isArray;

/**
 * The recurse and match function will async recurse as long as
 * there are still more paths to be executed.  The match function
 * will return a set of objects that have how much of the path that
 * is matched.  If there still is more, denoted by suffixes,
 * paths to be matched then the recurser will keep running.
 */
module.exports = function recurseMatchAndExecute(match, actionRunner, paths, method) {
    return _recurseMatchAndExecute(match, actionRunner, paths, method);
};

/**
 * performs the actual recursing
 */
function _recurseMatchAndExecute(match, actionRunner, paths, method) {
    var jsongSeed = {};
    var missing = [];
    var invalidated = [];

    return Observable.

        // Each pathSet (some form of collapsed path) need to be sent independently.
        // for each collapsed pathSet will, if producing refs, be the highest likelihood
        // of collapsibility.
        from(paths).
        expand(function(nextPaths) {
            if (!nextPaths.length) {
                return Observable.empty();
            }

            var matchedResults = match(method, nextPaths);
            if (!matchedResults.matched.length) {
                return Observable.empty();
            }

            return runByPrecedence(matchedResults.matched, actionRunner).

                // Generate from the combined results the next requestable paths
                // and insert errors / values into the cache.
                flatMap(function(results) {
                    var value = results.value;
                    var suffix = results.match.suffix;
                    var hasSuffix = suffix.length;

                    if (!isArray(value)) {
                        value = [value];
                    }
                    var invalidationsNextPathsAndMessages =
                        mergeCacheAndGatherRefsAndInvalidations(jsongSeed, value);
                    var nextInvalidations = invalidationsNextPathsAndMessages[0];
                    var nextPaths = invalidationsNextPathsAndMessages[1];
                    var messages = invalidationsNextPathsAndMessages[2];

                    // Alters the behavior of the expand
                    messages.forEach(function(message) {
                        if (message.method) {
                            method = message.method;
                        }
                    });

                    nextInvalidations.forEach(function(invalidation) {
                        invalidated[invalidated.length] = invalidation;
                    });

                    // Merges the remaining suffix with remaining nextPaths
                    if (hasSuffix && nextPaths.length) {
                        nextPaths = nextPaths.map(function(next) {
                            return next.concat(suffix);
                        });
                    }

                    // Explodes and collapse the tree to remove
                    // redundants and get optimized next set of
                    // paths to evaluate.
                    nextPaths = optimizePathSets(jsongSeed, nextPaths);
                    if (nextPaths.length) {
                        nextPaths = toPaths(toTree(nextPaths));
                    }

                    missing = missing.concat(matchedResults.missingPaths);
                    return Observable.
                        from(nextPaths);
                }).
                defaultIfEmpty([]);

        }).
        reduce(function(acc, x) {
            return acc;
        }, null).
        map(function() {
            return {
                missing: missing,
                invalidated: invalidated,
                jsong: jsongSeed
            };
        });
}

