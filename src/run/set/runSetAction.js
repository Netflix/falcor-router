/* eslint-disable max-len */
var outputToObservable = require('../conversion/outputToObservable');
var noteToJsongOrPV = require('../conversion/noteToJsongOrPV');
var spreadPaths = require('./../../support/spreadPaths');
var jsongMerge = require('./../../cache/jsongMerge');
var optimizePathSets = require('./../../cache/optimizePathSets');
var hasIntersection = require('./../../operations/matcher/intersection/hasIntersection');
var pathValueMerge = require('./../../cache/pathValueMerge');
var Observable = require('rx').Observable;
/* eslint-enable max-len */

module.exports = function outerRunSetAction(routerInstance, modelContext,
                                            jsongCache) {
    return function innerRunSetAction(matchAndPath) {
        return runSetAction(routerInstance, modelContext,
                            matchAndPath, jsongCache);
    };
};

function runSetAction(routerInstance, jsongMessage, matchAndPath, jsongCache) {
    var out;
    var match = matchAndPath.match;
    var arg = matchAndPath.path;

    // We are at our destination. Its time to get out
    // the pathValues from the JSONGraph message.
    if (match.isSet) {

        var paths = spreadPaths(jsongMessage.paths);

        // Determine which paths from the JSONGraph message haven't been set
        // into the JSONGraph cache. The `spreadPaths` operation takes care of
        // splitting complex paths into simple paths, but with the addition of
        // refsets, a single "simple" path can still explode out to multiple
        // other paths.
        //
        // Select each requested path with at least one corresponding optimized
        // path that intersects with the matched requested path.
        var pathIntersections =
            paths.
                // Optimizes each path.
                map(function(path) {
                    return {
                        requestedPath: path,
                        optimizedPaths: optimizePathSets(
                            jsongCache, [path], routerInstance.maxRefFollow)
                    };
                }).
                // only includes the paths from the set that intersect
                // the virtual path
                reduce(function(intersections, pair) {

                    var requested = match.requested;
                    var optimizedPaths = pair.optimizedPaths;
                    var rIntersectingPaths = intersections.requestedPaths;
                    var oIntersectingPaths = intersections.optimizedPaths;

                    var startLen = oIntersectingPaths.length;
                    var i = 0, n = optimizedPaths.length, optimizedPath;
                    for(; i < n; ++i) {
                        optimizedPath = optimizedPaths[i];
                        if (hasIntersection(optimizedPath, requested)) {
                            oIntersectingPaths.push(optimizedPath);
                        }
                    }

                    // If at least one optimized path intersects with the
                    // matched requested path, add the corresponding original
                    // requested path to the outer list.
                    if (oIntersectingPaths.length > startLen) {
                        rIntersectingPaths.push(pair.requestedPath);
                    }

                    return intersections;
                }, {
                    requestedPaths: [],
                    optimizedPaths: []
                });

        var requestedIntersectingPaths = pathIntersections.requestedPaths;
        var optimizedIntersectingPaths = pathIntersections.optimizedPaths;

        // Select a list of the intersecting path values.
        var intersectingPathValues = jsongMerge({}, {
            paths: requestedIntersectingPaths,
            jsonGraph: jsongMessage.jsonGraph
        }).values;

        // Build the optimized JSON tree for each intersecting path value to
        // pass to the set route handler.
        arg = intersectingPathValues.reduce(function(json, pv, index) {
            pathValueMerge(json, {
                value: pv.value,
                path: optimizedIntersectingPaths[index]
            });
            return json;
        }, {});
    }
    try {
        out = match.action.call(routerInstance, arg);
        out = outputToObservable(out);
    } catch (e) {
        out = Observable.throw(e);
    }

    return out.
        materialize().
        filter(function(note) {
            return note.kind !== 'C';
        }).
        map(noteToJsongOrPV(matchAndPath.path)).
        map(function(jsonGraphOrPV) {
            return [matchAndPath.match, jsonGraphOrPV];
        });
}
