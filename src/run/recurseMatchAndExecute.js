var Rx = require('../RouterRx.js');
var Observable = Rx.Observable;
var runByPrecedence = require('./precedence/runByPrecedence');
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var optimizePathSets = require('./../cache/optimizePathSets');
var mCGRI = require('./mergeCacheAndGatherRefsAndInvalidations');
var isArray = Array.isArray;

/**
 * The recurse and match function will async recurse as long as
 * there are still more paths to be executed.  The match function
 * will return a set of objects that have how much of the path that
 * is matched.  If there still is more, denoted by suffixes,
 * paths to be matched then the recurser will keep running.
 */
module.exports = function recurseMatchAndExecute(
        match, actionRunner, paths,
        method, routerInstance, jsongCache) {

    return _recurseMatchAndExecute(
        match, actionRunner, paths,
        method, routerInstance, jsongCache);
};

/**
 * performs the actual recursing
 */
function _recurseMatchAndExecute(
        match, actionRunner, paths,
        method, routerInstance, jsongCache) {
    var unhandledPaths = [];
    var invalidated = [];
    var reportedPaths = [];
    var currentMethod = method;
    return Observable.

        // Each pathSet (some form of collapsed path) need to be sent
        // independently.  for each collapsed pathSet will, if producing
        // refs, be the highest likelihood of collapsibility.
        from(paths).
        expand(function(nextPaths) {
            if (!nextPaths.length) {
                return Observable.empty();
            }

            // We have to return an Observable of error instead of just
            // throwing.
            var matchedResults;
            try {
                matchedResults = match(currentMethod, nextPaths);
            } catch (e) {
                return Observable.throw(e);
            }

            // When there is explicitly not a match then we need to handle
            // the unhandled paths.
            if (!matchedResults.length) {
                unhandledPaths.push(nextPaths);
                return Observable.empty();
            }
            return runByPrecedence(nextPaths, matchedResults, actionRunner).
                // Generate from the combined results the next requestable paths
                // and insert errors / values into the cache.
                flatMap(function(results) {
                    var value = results.value;
                    var suffix = results.match.suffix;

                    // TODO: MaterializedPaths, use result.path to build up a
                    // "foundPaths" array.  This could be used to materialize
                    // if that is the case.  I don't think this is a
                    // requirement, but it could be.
                    if (!isArray(value)) {
                        value = [value];
                    }

                    var invsRefsAndValues =
                        mCGRI(jsongCache, value, routerInstance);
                    var invalidations = invsRefsAndValues.invalidations;
                    var unhandled = invsRefsAndValues.unhandledPaths;
                    var messages = invsRefsAndValues.messages;
                    var pathsToExpand = [];

                    if (suffix.length > 0) {
                        pathsToExpand = invsRefsAndValues.references;
                    }

                    // Merge the invalidations and unhandledPaths.
                    invalidations.forEach(function(invalidation) {
                        invalidated[invalidated.length] = invalidation.path;
                    });

                    unhandled.forEach(function(unhandledPath) {
                        unhandledPaths[unhandledPaths.length] = unhandledPath;
                    });

                    // Merges the remaining suffix with remaining nextPaths
                    pathsToExpand = pathsToExpand.map(function(next) {
                        return next.value.concat(suffix);
                    });

                    // Alters the behavior of the expand
                    messages.forEach(function(message) {
                        // mutates the method type for the matcher
                        if (message.method) {
                            currentMethod = message.method;
                        }

                        // Mutates the nextPaths and adds any additionalPaths
                        else if (message.additionalPath) {
                            var path = message.additionalPath;
                            pathsToExpand[pathsToExpand.length] = path;
                            reportedPaths[reportedPaths.length] = path;
                        }

                        // Any invalidations that come down from a call
                        else if (message.invalidations) {
                            message.
                                invalidations.
                                forEach(function(invalidation) {
                                    invalidated.push(invalidation);
                                });
                        }

                        // We need to add the unhandledPaths to the jsonGraph
                        // response.
                        else if (message.unhandledPaths) {
                            unhandledPaths = unhandledPaths.
                                concat(message.unhandledPaths);
                        }
                    });

                    // Explodes and collapse the tree to remove
                    // redundants and get optimized next set of
                    // paths to evaluate.
                    pathsToExpand = optimizePathSets(
                        jsongCache, pathsToExpand, routerInstance.maxRefFollow);

                    if (pathsToExpand.length) {
                        pathsToExpand = collapse(pathsToExpand);
                    }

                    return Observable.
                        from(pathsToExpand);
                }).
                defaultIfEmpty([]);

        }, Number.POSITIVE_INFINITY, Rx.Scheduler.queue).
        reduce(function(acc, x) {
            return acc;
        }, null).
        map(function() {
            return {
                unhandledPaths: unhandledPaths,
                invalidated: invalidated,
                jsonGraph: jsongCache,
                reportedPaths: reportedPaths
            };
        });
}
