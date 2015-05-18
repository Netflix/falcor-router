var Rx = require('rx');
var Observable = Rx.Observable;
var jsongMerge = require('./../cache/jsongMerge');
var pathValueMerge = require('./../cache/pathValueMerge');
var isJSONG = require('./../support/isJSONG');
var pluckHighestPrecedence = require('./pluckHighestPrecedence');
var precedenceAndReduce = require('./precedenceAndReduce');
var falcor = require('falcor');
var toPaths = require('./../operations/collapse/toPaths');
var toTree = require('./../operations/collapse/toTree');

/**
 * The recurse and match function will async recurse as long as
 * there are still more paths to be executed.  The match function
 * will return a set of objects that have how much of the path that
 * is matched.  If there still is more, denoted by suffixes,
 * paths to be matched then the recurser will keep running.
 */
module.exports = function recurseMatchAndExecute(match, actionRunner, paths) {
    return _recurseMatchAndExecute(match, actionRunner, paths, 0);
};

/**
 * performs the actual recursing
 */
function _recurseMatchAndExecute(match, actionRunner, paths, loopCount) {
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

            // TODO: Don't forget to check the cache to remove any paths
            // that have already been evaluated.
            var matchedResults = match(nextPaths);
            return precedenceAndReduce(matchedResults.matched, actionRunner).

                // Generate from the combined results the next requestable paths
                // and insert errors / values into the cache.
                flatMap(function(results) {
                    var values = results.values;
                    var suffix = results.match.suffix;
                    var hasSuffix = suffix.length;
                    var nextPaths = [];
                    var insertedReferences = [];
                    var len = -1;

                    values.forEach(function(jsongOrPV) {
                        var refs = [];
                        if (isJSONG(jsongOrPV)) {
                            refs = jsongMerge(jsongSeed, jsongOrPV);
                        } else {
                            if (jsongOrPV.value === undefined) {
                                invalidated[invalidated.length] = jsongOrPV;
                            } else {
                                refs = pathValueMerge(jsongSeed, jsongOrPV);
                            }
                        }

                        if (hasSuffix && refs.length) {
                            refs.forEach(function(refs) {
                                nextPaths[++len] = refs.concat(suffix);
                            });
                        }
                    });

                    // Explodes and collapse the tree to remove
                    // redundants and get optimized next set of
                    // paths to evaluate.
                    nextPaths = toPaths(toTree(nextPaths));

                    missing = missing.concat(matchedResults.missingPaths);
                    return Observable.
                        from(nextPaths).
                        defaultIfEmpty([]);
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

