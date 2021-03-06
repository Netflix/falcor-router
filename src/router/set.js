var set = 'set';
var recurseMatchAndExecute = require('./../run/recurseMatchAndExecute');
var runSetAction = require('./../run/set/runSetAction');
var materialize = require('../run/materialize');
var Observable = require('falcor-observable').Observable;
var defaultIfEmpty = require('falcor-observable').defaultIfEmpty;
var map = require('falcor-observable').map;
var mergeMap = require('falcor-observable').mergeMap;
var tap = require('falcor-observable').tap;
var spreadPaths = require('./../support/spreadPaths');
var pathValueMerge = require('./../cache/pathValueMerge');
var optimizePathSets = require('falcor-path-utils').optimizePathSets;
var hasIntersectionWithTree =
    require('./../operations/matcher/intersection/hasIntersectionWithTree');
var getValue = require('./../cache/getValue');
var normalizePathSets = require('../operations/ranges/normalizePathSets');
var pathUtils = require('falcor-path-utils');
var collapse = pathUtils.collapse;
var mCGRI = require('./../run/mergeCacheAndGatherRefsAndInvalidations');
var MaxPathsExceededError = require('../errors/MaxPathsExceededError');
var getPathsCount = require('./getPathsCount');
var outputToObservable = require('../run/conversion/outputToObservable');

/**
 * @returns {Observable.<JSONGraph>}
 * @private
 */
module.exports = function routerSet(jsonGraph) {

    var router = this;

    var source = Observable.defer(function() {
        var jsongCache = {};

        var methodSummary;
        if (router._methodSummaryHook) {
            methodSummary = {
                method: 'set',
                jsonGraphEnvelope: jsonGraph,
                start: router._now(),
                results: [],
                routes: []
            };
        }

        var action = runSetAction(router, jsonGraph, jsongCache, methodSummary);
        jsonGraph.paths = normalizePathSets(jsonGraph.paths);

        var innerSource = getPathsCount(jsonGraph.paths) > router.maxPaths ?
            Observable.throw(new MaxPathsExceededError())
            : recurseMatchAndExecute(router._matcher, action,
                jsonGraph.paths, set, router, jsongCache).pipe(

            // Takes the jsonGraphEnvelope and extra details that comes out
            // of the recursive matching algorithm and either attempts the
            // fallback options or returns the built jsonGraph.
            mergeMap(function(details) {
                var out = {
                    jsonGraph: details.jsonGraph
                };

                // If there is an unhandler then we should call that method and
                // provide the subset of jsonGraph that represents the missing
                // routes.
                if (details.unhandledPaths.length && router._unhandled) {
                    var unhandledPaths = details.unhandledPaths;
                    var jsonGraphFragment = {};

                    // PERFORMANCE:
                    //   We know this is a potential performance downfall
                    //   but we want to see if its even a corner case.
                    //   Most likely this will not be hit, but if it does
                    //   then we can take care of it
                    // Set is interesting.  This is what has to happen.
                    // 1. incoming paths are spread so that each one is simple.
                    // 2. incoming path, one at a time, are optimized by the
                    //    incoming jsonGraph.
                    // 3. test intersection against incoming optimized path and
                    //    unhandledPathSet
                    // 4. If 3 is true, build the jsonGraphFragment by using a
                    //    pathValue of optimizedPath and vale from un-optimized
                    //    path and original jsonGraphEnvelope.
                    var jsonGraphEnvelope = {jsonGraph: jsonGraphFragment};
                    var unhandledPathsTree = unhandledPaths.
                        reduce(function(acc, path) {
                            pathValueMerge(acc, {path: path, value: null});
                            return acc;
                        }, {});

                    var pathIntersection = [];
                    // 1. Spread
                    var spread = spreadPaths(jsonGraph.paths);
                    for (var i = 0; i < spread.length; i++) {
                        var path = spread[i];
                        // 2.1 Optimize.  We know its one at a time therefore we
                        // just pluck [0] out.
                        var result = optimizePathSets(
                            details.jsonGraph, [path], router.maxRefFollow);
                        if (result.error) {
                            return Observable.throw(result.error);
                        }
                        var oPath = result.paths[0];

                        // 2.2 Remove all the optimized paths that were found in
                        // the cache.
                        if (!oPath) {
                            continue;
                        }

                        // 3.1 test intersection.
                        var hasIntersection = hasIntersectionWithTree(
                            oPath, unhandledPathsTree);

                        // 3.2 strip out the non-intersection paths.
                        if (!hasIntersection) {
                            continue;
                        }
                        // Creates the pathValue if there are a path
                        // intersection
                        var value = getValue(jsonGraph.jsonGraph, path);

                        pathIntersection.push({
                            path: oPath,
                            value: value
                        });
                    }

                    // 4. build the optimized JSONGraph envelope.
                    pathIntersection.
                        reduce(function(acc, pathValue) {
                            pathValueMerge(acc, pathValue);
                            return acc;
                        }, jsonGraphFragment);

                    jsonGraphEnvelope.paths = collapse(
                        pathIntersection.map(function(pV) {
                            return pV.path;
                        }));

                    return outputToObservable(
                        router._unhandled.set(jsonGraphEnvelope)).pipe(

                        // Merge the solution back into the overall message.
                        map(function(unhandledJsonGraphEnv) {
                            mCGRI(out.jsonGraph, [{
                                jsonGraph: unhandledJsonGraphEnv.jsonGraph,
                                paths: unhandledPaths
                            }], router);
                            return out;
                        }),
                        defaultIfEmpty(out));
                }

                return Observable.of(out);
            }),

            // We will continue to materialize over the whole jsonGraph message.
            // This makes sense if you think about pathValues and an API that
            // if ask for a range of 10 and only 8 were returned, it would not
            // materialize for you, instead, allow the router to do that.
            mergeMap(function(jsonGraphEnvelope) {
                return materialize(router, jsonGraph.paths, jsonGraphEnvelope);
            })
        );

        if (router._errorHook || router._methodSummaryHook) {
            innerSource = innerSource.
                pipe(
                    tap(
                        function (response) {
                            if (router._methodSummaryHook) {
                                methodSummary.results.push({
                                    time: router._now(),
                                    value: response
                                });
                            }
                        }, function (err) {
                            if (router._methodSummaryHook) {
                                methodSummary.end = router._now();
                                methodSummary.error = err;
                                router._methodSummaryHook(methodSummary);
                            }
                            if (router._errorHook) {
                                router._errorHook(err)
                            }
                        }, function () {
                            if (router._methodSummaryHook) {
                                methodSummary.end = router._now();
                                router._methodSummaryHook(methodSummary);
                            }
                        }
                    )
                );
        }
        return innerSource;
    });

    return source;
};
